import {
    ClientType,
    CountryCodes,
    FrameworkSetting,
    GameState,
    LazerHitResults,
    LazerManiaSetting,
    LazerSettings,
    Rulesets,
    ScoringMode,
    measureTime,
    platformResolver,
    wLogger
} from '@tosu/common';
import { getContentType } from '@tosu/server';
import path from 'path';

import { AbstractMemory, expectedVtableValue, lazerOffsets } from '@/memory';
import type {
    IAudioVelocityBase,
    IGameplay,
    IGlobal,
    IGlobalPrecise,
    IHitErrors,
    IKeyOverlay,
    ILazerSpectator,
    ILazerSpectatorEntry,
    ILeaderboard,
    IMP3Length,
    IMenu,
    IResultScreen,
    ISettings,
    ITourney,
    ITourneyChat,
    ITourneyUser,
    IUser,
    ScanPatterns
} from '@/memory/types';
import type { ITourneyManagerChatItem } from '@/states/tourney';
import { LeaderboardPlayer, Statistics } from '@/states/types';
import {
    fixDecimals,
    netDateBinaryToDate,
    numberFromDecimal
} from '@/utils/converters';
import {
    MultiplayerTeamType,
    MultiplayerUserState
} from '@/utils/multiplayer.types';
import { calculateMods, defaultCalculatedMods } from '@/utils/osuMods';
import {
    CalculateMods,
    Mod,
    ModsAcronyms,
    ModsCategories
} from '@/utils/osuMods.types';

type LazerPatternData = {
    scalingContainerTargetDrawSize: number;
};

interface KeyCounter {
    isPressed: boolean;
    count: number;
}

const localConfigList = [
    LazerSettings.ScoreDisplayMode,
    LazerSettings.BeatmapDetailTab,
    LazerSettings.SongSelectSortingMode,
    LazerSettings.HUDVisibilityMode,
    LazerSettings.ReplaySettingsOverlay,
    LazerSettings.DimLevel,
    LazerSettings.BlurLevel,
    LazerSettings.AudioOffset,
    LazerSettings.VolumeInactive,
    LazerSettings.MenuCursorSize,
    LazerSettings.GameplayCursorSize,
    LazerSettings.AutoCursorSize,
    LazerSettings.ShowStoryboard,
    LazerSettings.MouseDisableButtons,
    LazerSettings.MouseDisableWheel,
    LazerSettings.BeatmapHitsounds,
    LazerSettings.BeatmapSkins
];

const frameworkConfigList = [
    FrameworkSetting.WindowedSize,
    FrameworkSetting.VolumeUniversal,
    FrameworkSetting.VolumeMusic,
    FrameworkSetting.VolumeEffect,
    FrameworkSetting.SizeFullscreen,
    FrameworkSetting.CursorSensitivity
];

export class LazerMemory extends AbstractMemory<LazerPatternData> {
    private scanPatterns: ScanPatterns = {
        scalingContainerTargetDrawSize: {
            pattern:
                '00 00 80 44 00 00 40 44 00 00 00 00 ?? ?? ?? ?? 00 00 00 00',
            offset: 0
        }
    };

    private static MAX_SCORE = 1000000;

    private menuMods: CalculateMods = Object.assign({}, defaultCalculatedMods);

    private currentScreen: number = 0;
    private scoringDisplayMode: ScoringMode = ScoringMode.standardised;
    private HUDVisibilityMode: number = 0;
    private ReplaySettingsOverlay: boolean = true;

    private replayMode: boolean = false;

    private modMappings: Map<string, string> = new Map();

    private isPlayerLoading: boolean = false;

    private gameBaseAddress: number;

    patterns: LazerPatternData = {
        scalingContainerTargetDrawSize: 0
    };

    private lazerToStableStatus = {
        '-4': 1, // Locally modified
        '-3': 1, // None
        '-2': 2, // Graveyard
        '-1': 2, // WIP
        0: 2,
        1: 4,
        2: 5,
        3: 6,
        4: 7
    };

    @measureTime
    private updateGameBaseAddress() {
        const oldAddress = this.gameBaseAddress;

        const scalingContainerTargetDrawSize = this.getPattern(
            'scalingContainerTargetDrawSize'
        );
        const externalLinkOpener = this.process.readIntPtr(
            scalingContainerTargetDrawSize - 0x24
        );

        const api = this.process.readIntPtr(
            externalLinkOpener +
                lazerOffsets['osu.Game.Online.Chat.ExternalLinkOpener'][
                    '<api>k__BackingField'
                ]
        );

        this.gameBaseAddress = this.process.readIntPtr(
            api + lazerOffsets['osu.Game.Online.API.APIAccess'].game
        );

        wLogger.debug(
            'lazer',
            this.pid,
            'updateGameBaseAddress',
            `${oldAddress?.toString(16)} => ${this.gameBaseAddress.toString(16)}`
        );
    }

    private checkIfGameBase(address: number): boolean {
        try {
            const vtable = this.process.readIntPtr(address);

            if (!vtable) {
                return false;
            }

            // might potentially change
            return this.process.readLong(vtable) === expectedVtableValue;
        } catch {
            return false;
        }
    }

    private gameBase() {
        if (!this.gameBaseAddress) {
            this.updateGameBaseAddress();
        }

        // Check if gamebase instance is valid
        if (!this.checkIfGameBase(this.gameBaseAddress)) {
            wLogger.debug('lazer', this.pid, 'GameBase has been reset');

            const scanPattern =
                this.scanPatterns.scalingContainerTargetDrawSize;
            this.setPattern(
                'scalingContainerTargetDrawSize',
                this.process.scanSync(scanPattern.pattern) + scanPattern.offset!
            );

            this.updateGameBaseAddress();
        }

        return this.gameBaseAddress;
    }

    private screenStack() {
        return this.process.readIntPtr(
            this.gameBase() + lazerOffsets['osu.Game.OsuGame'].ScreenStack
        );
    }

    private checkIfSongSelectV2(address: number) {
        return (
            this.process.readIntPtr(
                address +
                    lazerOffsets['osu.Game.Screens.SelectV2.SoloSongSelect'][
                        '<game>k__BackingField'
                    ]
            ) === this.gameBase()
        );
    }

    private checkIfPlayer(address: number) {
        return (
            this.process.readIntPtr(
                address +
                    lazerOffsets['osu.Game.Screens.Play.SubmittingPlayer'][
                        '<api>k__BackingField'
                    ]
            ) ===
                this.process.readIntPtr(
                    this.gameBase() +
                        lazerOffsets['osu.Game.OsuGameBase'][
                            '<API>k__BackingField'
                        ]
                ) &&
            this.process.readIntPtr(
                address +
                    lazerOffsets['osu.Game.Screens.Play.SubmittingPlayer'][
                        '<spectatorClient>k__BackingField'
                    ]
            ) ===
                this.process.readIntPtr(
                    this.gameBase() +
                        lazerOffsets['osu.Game.OsuGameBase'][
                            '<SpectatorClient>k__BackingField'
                        ]
                )
        );
    }

    private checkIfReplay(address: number) {
        return (
            this.process.readIntPtr(
                address +
                    lazerOffsets['osu.Game.Screens.Play.Player'][
                        '<api>k__BackingField'
                    ]
            ) ===
                this.process.readIntPtr(
                    this.gameBase() +
                        lazerOffsets['osu.Game.OsuGameBase'][
                            '<API>k__BackingField'
                        ]
                ) &&
            this.process.readIntPtr(
                address +
                    lazerOffsets['osu.Game.Screens.Play.Player'][
                        '<scoreManager>k__BackingField'
                    ]
            ) ===
                this.process.readIntPtr(
                    this.gameBase() +
                        lazerOffsets['osu.Game.OsuGameBase'][
                            '<ScoreManager>k__BackingField'
                        ]
                )
        );
    }

    private checkIfResultScreen(address: number) {
        return (
            this.process.readIntPtr(
                address +
                    lazerOffsets['osu.Game.Screens.Ranking.SoloResultsScreen'][
                        '<api>k__BackingField'
                    ]
            ) ===
                this.process.readIntPtr(
                    this.gameBase() +
                        lazerOffsets['osu.Game.OsuGameBase'][
                            '<API>k__BackingField'
                        ]
                ) &&
            this.process.readIntPtr(
                address +
                    lazerOffsets['osu.Game.Screens.OsuScreen'][
                        '<logo>k__BackingField'
                    ]
            ) ===
                this.process.readIntPtr(
                    this.gameBase() + lazerOffsets['osu.Game.OsuGame'].osuLogo
                )
        );
    }

    private checkIfPlayerLoader(address: number) {
        return (
            this.process.readIntPtr(
                address +
                    lazerOffsets['osu.Game.Screens.OsuScreen'][
                        '<logo>k__BackingField'
                    ]
            ) ===
            this.process.readIntPtr(
                address + lazerOffsets['osu.Game.OsuGame'].osuLogo
            )
        );
    }

    private checkIfEditor(address: number) {
        return (
            this.process.readIntPtr(
                address +
                    lazerOffsets['osu.Game.Screens.Edit.Editor'][
                        '<api>k__BackingField'
                    ]
            ) ===
                this.process.readIntPtr(
                    this.gameBase() + lazerOffsets['osu.Game.OsuGame'].osuLogo
                ) &&
            this.process.readIntPtr(
                address +
                    lazerOffsets['osu.Game.Screens.Edit.Editor'][
                        '<realm>k__BackingField'
                    ]
            ) ===
                this.process.readIntPtr(
                    this.gameBase() + lazerOffsets['osu.Game.OsuGameBase'].realm
                )
        );
    }

    private checkIfMultiSelect(address: number) {
        const multiplayerClient = this.multiplayerClient();
        const isConnectedBindable = this.process.readIntPtr(
            multiplayerClient +
                lazerOffsets[
                    'osu.Game.Online.Multiplayer.OnlineMultiplayerClient'
                ]['<IsConnected>k__BackingField']
        );

        const isConnected =
            this.process.readByte(isConnectedBindable + 0x40) === 1;

        if (!isConnected) {
            return false;
        }

        const currentRoom = this.process.readIntPtr(
            multiplayerClient +
                lazerOffsets['osu.Game.Online.Multiplayer.MultiplayerClient']
                    .room
        );

        return (
            !currentRoom &&
            this.process.readIntPtr(
                address +
                    lazerOffsets[
                        'osu.Game.Screens.OnlinePlay.OnlinePlayScreen'
                    ]['<API>k__BackingField']
            ) ===
                this.process.readIntPtr(
                    this.gameBase() +
                        lazerOffsets['osu.Game.OsuGameBase'][
                            '<API>k__BackingField'
                        ]
                ) &&
            this.process.readIntPtr(
                address +
                    lazerOffsets[
                        'osu.Game.Screens.OnlinePlay.Multiplayer.Multiplayer'
                    ]['<client>k__BackingField']
            ) ===
                this.process.readIntPtr(
                    this.gameBase() +
                        lazerOffsets['osu.Game.OsuGameBase'][
                            '<MultiplayerClient>k__BackingField'
                        ]
                )
        );
    }

    private checkIfMulti() {
        const multiplayerClient = this.multiplayerClient();
        const isConnectedBindable = this.process.readIntPtr(
            multiplayerClient + 0x2d8
        );

        const isConnected =
            this.process.readByte(isConnectedBindable + 0x40) === 1;

        if (!isConnected) {
            return false;
        }

        const currentRoom = this.process.readIntPtr(
            multiplayerClient +
                lazerOffsets['osu.Game.Online.Multiplayer.MultiplayerClient']
                    .room
        );

        return currentRoom;
    }

    private checkIfMultiSpectator(address: number) {
        return (
            this.process.readIntPtr(
                address +
                    lazerOffsets['osu.Game.Screens.OsuScreen'][
                        '<logo>k__BackingField'
                    ]
            ) ===
                this.process.readIntPtr(
                    this.gameBase() + lazerOffsets['osu.Game.OsuGame'].osuLogo
                ) &&
            this.process.readIntPtr(
                address +
                    lazerOffsets['osu.Game.Screens.Spectate.SpectatorScreen'][
                        '<spectatorClient>k__BackingField'
                    ]
            ) ===
                this.process.readIntPtr(
                    this.gameBase() +
                        lazerOffsets['osu.Game.OsuGameBase'][
                            '<SpectatorClient>k__BackingField'
                        ]
                ) &&
            this.process.readIntPtr(
                address +
                    lazerOffsets[
                        'osu.Game.Screens.OnlinePlay.Multiplayer.Spectate.MultiSpectatorScreen'
                    ]['<multiplayerClient>k__BackingField']
            ) ===
                this.process.readIntPtr(
                    this.gameBase() +
                        lazerOffsets['osu.Game.OsuGameBase'][
                            '<MultiplayerClient>k__BackingField'
                        ]
                )
        );
    }

    private multiplayerClient() {
        return this.process.readIntPtr(
            this.gameBase() +
                lazerOffsets['osu.Game.OsuGameBase'][
                    '<MultiplayerClient>k__BackingField'
                ]
        );
    }

    private getCurrentScreen() {
        const screenStack = this.screenStack();

        const stack = this.process.readIntPtr(
            screenStack +
                lazerOffsets['osu.Framework.Screens.ScreenStack'].stack
        );
        const count = this.process.readInt(stack + 0x10);

        const items = this.process.readIntPtr(stack + 0x8);
        return this.process.readIntPtr(items + 0x10 + 0x8 * (count - 1));
    }

    private readConfigStore(configAddress: number, keys: number[]) {
        const configStore = this.process.readIntPtr(configAddress + 0x20);
        const entries = this.process.readIntPtr(configStore + 0x10);
        const count = this.process.readInt(configStore + 0x38);

        const config: Record<string | number, any> = {};

        for (let i = 0; i < count; i++) {
            const current = entries + 0x10 + 0x18 * i;

            const key = this.process.readInt(current + 0x10);

            if (keys.length > 0 && !keys.includes(key)) {
                continue;
            }

            config[key] = this.process.readIntPtr(current) + 0x40;
        }

        return config;
    }

    private osuConfig() {
        const config: Record<string, any> = {};
        const gameBase = this.gameBase();

        const localConfig = this.process.readIntPtr(
            gameBase +
                lazerOffsets['osu.Game.OsuGameBase'][
                    '<LocalConfig>k__BackingField'
                ]
        );

        const localValues = this.readConfigStore(localConfig, localConfigList);

        for (let i = 0; i < localConfigList.length; i++) {
            const key = localConfigList[i];
            const address = localValues[key];

            switch (key) {
                case LazerSettings.ScoreDisplayMode:
                    this.scoringDisplayMode = this.process.readInt(address);
                    break;

                case LazerSettings.BeatmapDetailTab:
                    config.leaderboardType = this.process.readInt(address);
                    break;

                case LazerSettings.SongSelectSortingMode:
                    config.sortType = this.process.readInt(address);
                    break;

                case LazerSettings.HUDVisibilityMode:
                    this.HUDVisibilityMode = this.process.readInt(address);
                    break;

                case LazerSettings.ReplaySettingsOverlay:
                    this.ReplaySettingsOverlay =
                        this.process.readByte(address) === 1;
                    break;

                case LazerSettings.DimLevel:
                    config['background.dim'] = fixDecimals(
                        this.process.readDouble(address) * 100
                    );
                    break;

                case LazerSettings.BlurLevel:
                    config['background.blur'] = fixDecimals(
                        this.process.readDouble(address) * 100
                    );
                    break;

                case LazerSettings.AudioOffset:
                    config['audio.offset.universal'] = fixDecimals(
                        this.process.readDouble(address)
                    );
                    break;

                case LazerSettings.VolumeInactive:
                    config['audio.volume.musicInactive'] = fixDecimals(
                        this.process.readDouble(address) * 100
                    );
                    break;

                case LazerSettings.MenuCursorSize:
                    config['cursor.menuSize'] = fixDecimals(
                        this.process.readFloat(address)
                    );
                    break;

                case LazerSettings.GameplayCursorSize:
                    config['cursor.size'] = fixDecimals(
                        this.process.readFloat(address)
                    );
                    break;

                case LazerSettings.AutoCursorSize:
                    config['cursor.autoSize'] =
                        this.process.readByte(address) === 1;
                    break;

                case LazerSettings.ShowStoryboard:
                    config['background.storyboard'] =
                        this.process.readByte(address) === 1;
                    break;

                case LazerSettings.MouseDisableButtons:
                    config['mouse.disableButtons'] =
                        this.process.readByte(address) === 1;
                    break;

                case LazerSettings.MouseDisableWheel:
                    config['mouse.disableWheel'] =
                        this.process.readByte(address) === 1;
                    break;

                case LazerSettings.BeatmapHitsounds:
                    config['audio.ignoreBeatmapSounds'] =
                        this.process.readByte(address) === 0;
                    config['audio.useSkinSamples'] =
                        this.process.readByte(address) === 0;
                    break;

                case LazerSettings.BeatmapSkins:
                    config['skin.ignoreBeatmapSkins'] =
                        this.process.readByte(address) === 0;
                    break;
            }
        }

        const frameworkConfig = this.process.readIntPtr(
            gameBase +
                lazerOffsets['osu.Game.OsuGame'][
                    '<frameworkConfig>k__BackingField'
                ]
        );
        const frameworkValues = this.readConfigStore(
            frameworkConfig,
            frameworkConfigList
        );

        for (let i = 0; i < frameworkConfigList.length; i++) {
            const key = frameworkConfigList[i];
            const address = frameworkValues[key];

            switch (key) {
                case FrameworkSetting.WindowedSize:
                    config['resolution.width'] = this.process.readInt(
                        address + 0x4
                    );
                    config['resolution.height'] = this.process.readInt(
                        address + 0x8
                    );
                    break;

                case FrameworkSetting.VolumeUniversal:
                    config['audio.volume.master'] = fixDecimals(
                        this.process.readDouble(address) * 100
                    );
                    break;

                case FrameworkSetting.VolumeMusic:
                    config['audio.volume.music'] = fixDecimals(
                        this.process.readDouble(address) * 100
                    );
                    break;

                case FrameworkSetting.VolumeEffect:
                    config['audio.volume.effect'] = fixDecimals(
                        this.process.readDouble(address) * 100
                    );
                    break;

                case FrameworkSetting.SizeFullscreen:
                    config['resolution.widthFullscreen'] = this.process.readInt(
                        address + 0x4
                    );
                    config['resolution.heightFullscreen'] =
                        this.process.readInt(address + 0x8);
                    break;

                case FrameworkSetting.CursorSensitivity:
                    config['mouse.sensitivity'] =
                        this.process.readDouble(address);
                    break;
            }
        }

        const rulesetConfigCache = this.process.readIntPtr(
            gameBase + lazerOffsets['osu.Game.OsuGameBase'].rulesetConfigCache
        );

        const configCache = this.process.readIntPtr(
            rulesetConfigCache +
                lazerOffsets['osu.Game.Rulesets.RulesetConfigCache'].configCache
        );

        const rulesetEntries = this.process.readIntPtr(configCache + 0x10);
        const rulesetCount = this.process.readInt(configCache + 0x38);

        for (let i = 0; i < rulesetCount; i++) {
            const current = rulesetEntries + 0x10 + 0x18 * i;

            const key = this.process.readSharpStringPtr(current);
            if (key !== 'mania') continue;

            const rulesetConfig = this.process.readIntPtr(current + 0x8);
            if (rulesetConfig === 0) continue;

            const values = this.readConfigStore(rulesetConfig, []);

            switch (key) {
                case 'mania': {
                    config['mania.scrollSpeed'] = this.process.readDouble(
                        values[LazerManiaSetting.scrollSpeed]
                    );
                    config['mania.scrollDirection'] = this.process.readInt(
                        values[LazerManiaSetting.scrollDirection]
                    );
                    break;
                }
            }
        }

        return config;
    }

    private player() {
        if (this.currentScreen && this.checkIfPlayer(this.currentScreen)) {
            return this.currentScreen;
        } else if (
            this.currentScreen &&
            this.checkIfReplay(this.currentScreen)
        ) {
            return this.currentScreen;
        }

        return 0;
    }

    private currentScore(player: number) {
        if (!player) {
            return 0;
        }

        return this.process.readIntPtr(
            player +
                lazerOffsets['osu.Game.Screens.Play.Player'][
                    '<Score>k__BackingField'
                ]
        );
    }

    private scoreInfo(player: number) {
        const currentScore = this.currentScore(player);

        if (!currentScore) {
            return 0;
        }

        return this.process.readIntPtr(currentScore + 0x8);
    }

    private readArray(array: number): number[] {
        const size = this.process.readInt(array + 0x8);

        const result: number[] = [];

        for (let i = 0; i < size; i++) {
            const current = this.process.readIntPtr(array + 0x10 + 0x8 * i);

            result.push(current);
        }

        return result;
    }

    private readItems(
        items: number,
        size: number,
        inlined: boolean = false,
        structSize: number = 8
    ): number[] {
        const result: number[] = [];

        for (let i = 0; i < size; i++) {
            const current = inlined
                ? items + 0x10 + structSize * i
                : this.process.readIntPtr(items + 0x10 + structSize * i);

            result.push(current);
        }

        return result;
    }

    private readListItems(
        list: number,
        inlined: boolean = false,
        structSize: number = 8
    ): number[] {
        let isArray = false;

        // another hacky check :D
        // 0x10 is _items in List and length in array
        if (this.process.readInt(list + 0x10) > 10000000) {
            isArray = true;
        }

        const size = this.process.readInt(list + (isArray ? 0x8 : 0x10));
        const items = isArray ? list : this.process.readIntPtr(list + 0x8);

        return this.readItems(items, size, inlined, structSize);
    }

    private isMultiMod(type: number): boolean {
        return (
            this.process.readInt(type) === 0x1000000 &&
            this.process.readInt(type + 0x3) === 8193
        );
    }

    private readModList(list: number): number[] {
        const items = this.readListItems(list);

        const types: number[] = [];

        for (let i = 0; i < items.length; i++) {
            const current = items[i];

            const isMultiMod = this.isMultiMod(
                this.process.readIntPtr(current)
            );

            if (isMultiMod) {
                const modsList = this.process.readIntPtr(current + 0x10);
                const mods = this.readArray(modsList);

                for (let i = 0; i < mods.length; i++) {
                    types.push(this.process.readIntPtr(mods[i]));
                }
            } else {
                types.push(this.process.readIntPtr(current));
            }
        }

        return types;
    }

    private readModMapping() {
        const availableModsDict = this.process.readIntPtr(
            this.process.readIntPtr(
                this.gameBase() +
                    lazerOffsets['osu.Desktop.OsuGameDesktop'].AvailableMods
            ) + 0x20
        );

        const entries = this.process.readIntPtr(availableModsDict + 0x10);
        const count = this.process.readInt(availableModsDict + 0x38);

        return this.readItems(entries, count, false, 0x18);
    }

    private initModMapping(gamemode: number) {
        if (!ModsCategories[gamemode]) {
            wLogger.warn(
                'lazer',
                this.pid,
                'initModMapping',
                `Unknown mods gamemode: ${gamemode}`
            );
            return;
        }

        const currentModMapping = this.readModMapping();

        const modsList = {
            diffReductionCategory: this.readModList(currentModMapping[0]),
            diffIncreasingCategory: this.readModList(currentModMapping[1]),
            conversionCategory: this.readModList(currentModMapping[2]),
            automationCategory: this.readModList(currentModMapping[3]),
            funCategory: this.readModList(currentModMapping[4]),
            systemCategory: this.readModList(currentModMapping[5])
        };

        for (const [category, mods] of Object.entries(
            ModsCategories[gamemode as 0]
        )) {
            for (let i = 0; i < mods.length; i++) {
                const mod = mods[i];
                this.modMappings.set(
                    `${gamemode}-${modsList[category][i]}`,
                    mod
                );
            }
        }

        this.modMappings.set(gamemode.toString(), '');
    }

    private mods(scoreInfo: number): CalculateMods {
        if (!scoreInfo) {
            return Object.assign({}, defaultCalculatedMods);
        }

        const jsonString = this.process.readSharpStringPtr(
            scoreInfo +
                lazerOffsets['osu.Game.Scoring.ScoreInfo'][
                    '<ModsJson>k__BackingField'
                ]
        );

        if (jsonString.length === 0) {
            return Object.assign({}, defaultCalculatedMods);
        }

        const modAcronyms = JSON.parse(jsonString) as Mod[];

        let mods = calculateMods(modAcronyms, true);
        if (mods instanceof Error)
            mods = Object.assign({}, defaultCalculatedMods);

        return mods;
    }

    private beatmapClock() {
        return this.process.readIntPtr(
            this.gameBase() + lazerOffsets['osu.Game.OsuGameBase'].beatmapClock
        );
    }

    private finalClockSource() {
        return this.process.readIntPtr(
            this.beatmapClock() +
                lazerOffsets['osu.Game.Beatmaps.FramedBeatmapClock']
                    .finalClockSource
        );
    }

    private currentTime() {
        return this.process.readDouble(
            this.finalClockSource() +
                lazerOffsets['osu.Framework.Timing.FramedClock'][
                    '<CurrentTime>k__BackingField'
                ]
        );
    }

    private basePath() {
        const storage = this.process.readIntPtr(
            this.gameBase() +
                lazerOffsets['osu.Game.OsuGameBase']['<Storage>k__BackingField']
        );
        const underlyingStorage = this.process.readIntPtr(
            storage +
                lazerOffsets['osu.Game.IO.WrappedStorage'][
                    '<UnderlyingStorage>k__BackingField'
                ]
        );

        return this.process.readSharpStringPtr(
            underlyingStorage +
                lazerOffsets['osu.Framework.Platform.Storage'][
                    '<BasePath>k__BackingField'
                ]
        );
    }

    private currentBeatmap() {
        const bindable = this.process.readIntPtr(
            this.gameBase() +
                lazerOffsets['osu.Game.OsuGameBase']['<Beatmap>k__BackingField']
        );
        const workingBeatmap = this.process.readIntPtr(bindable + 0x20);

        const beatmapInfo = this.process.readIntPtr(
            workingBeatmap +
                lazerOffsets[
                    'osu.Game.Beatmaps.WorkingBeatmapCache+BeatmapManagerWorkingBeatmap'
                ].BeatmapInfo
        );
        const beatmapSetInfo = this.process.readIntPtr(
            workingBeatmap +
                lazerOffsets[
                    'osu.Game.Beatmaps.WorkingBeatmapCache+BeatmapManagerWorkingBeatmap'
                ].BeatmapSetInfo
        );

        return { info: beatmapInfo, setInfo: beatmapSetInfo };
    }

    private getBeatmapFiles(beatmapSetInfo: number): Record<string, string> {
        const result = {};

        const files = this.process.readIntPtr(beatmapSetInfo + 0x20);
        const size = this.process.readInt(files + 0x10);
        const items = this.process.readIntPtr(files + 0x8);

        for (let i = 0; i < size; i++) {
            const current = this.process.readIntPtr(items + 0x10 + 0x8 * i);

            const realmFile = this.process.readIntPtr(current + 0x18);

            const hash = this.process.readSharpStringPtr(realmFile + 0x18);
            const fileName = this.process.readSharpStringPtr(current + 0x20);

            result[fileName] = hash;
        }

        return result;
    }

    private toLazerPath(hash: string) {
        if (!hash) {
            return '';
        }

        return path.join(hash[0], hash.substring(0, 2), hash);
    }

    private readStatisticsDict(statisticsDict: number) {
        const statistics: Statistics = {
            miss: 0,
            meh: 0,
            ok: 0,
            good: 0,
            great: 0,
            perfect: 0,
            smallTickMiss: 0,
            smallTickHit: 0,
            largeTickMiss: 0,
            largeTickHit: 0,
            smallBonus: 0,
            largeBonus: 0,
            ignoreMiss: 0,
            ignoreHit: 0,
            comboBreak: 0,
            sliderTailHit: 0,
            legacyComboIncrease: 0
        };

        if (!statisticsDict) {
            return statistics;
        }

        const statisticsCount = this.process.readInt(statisticsDict + 0x38);

        const statisticsEntries = this.process.readIntPtr(
            statisticsDict + 0x10
        );

        if (!statisticsEntries) {
            return statistics;
        }

        const items = this.readItems(
            statisticsEntries,
            statisticsCount,
            true,
            0x10
        );

        for (const item of items) {
            const key = this.process.readInt(item + 0x8);
            if (key === 0) {
                continue;
            }

            const value = this.process.readInt(item + 0xc);

            statistics[LazerHitResults[key]] = value;
        }

        return statistics;
    }

    private readStatistics(scoreInfo: number): Statistics {
        const statisticsDict = this.process.readIntPtr(
            scoreInfo + lazerOffsets['osu.Game.Scoring.ScoreInfo'].statistics
        );

        return this.readStatisticsDict(statisticsDict);
    }

    private readMaximumStatistics(scoreInfo: number): Statistics {
        const statisticsDict = this.process.readIntPtr(
            scoreInfo +
                lazerOffsets['osu.Game.Scoring.ScoreInfo'].maximumStatistics
        );

        return this.readStatisticsDict(statisticsDict);
    }

    private readLeaderboardScore(
        scoreInfo: number,
        index: number
    ): LeaderboardPlayer {
        const mods = this.mods(scoreInfo);

        const realmUser = this.process.readIntPtr(
            scoreInfo +
                lazerOffsets['osu.Game.Scoring.ScoreInfo'][
                    '<RealmUser>k__BackingField'
                ]
        );
        const username = this.process.readSharpStringPtr(
            realmUser +
                lazerOffsets['osu.Game.Models.RealmUser'][
                    '<Username>k__BackingField'
                ]
        );
        const userId = this.process.readInt(
            realmUser +
                lazerOffsets['osu.Game.Models.RealmUser'][
                    '<OnlineID>k__BackingField'
                ]
        );

        const statistics = this.readStatistics(scoreInfo);

        return {
            userId,
            name: username,
            mods,
            score: this.process.readLong(
                scoreInfo +
                    lazerOffsets['osu.Game.Scoring.ScoreInfo'][
                        '<TotalScore>k__BackingField'
                    ]
            ),
            h300: statistics.great,
            h100: statistics.ok,
            h50: statistics.meh,
            h0: statistics.miss,
            combo: this.process.readInt(
                scoreInfo +
                    lazerOffsets['osu.Game.Scoring.ScoreInfo'][
                        '<Combo>k__BackingField'
                    ]
            ),
            maxCombo: this.process.readInt(
                scoreInfo +
                    lazerOffsets['osu.Game.Scoring.ScoreInfo'][
                        '<MaxCombo>k__BackingField'
                    ]
            ),
            team: 0,
            isPassing:
                this.process.readByte(
                    scoreInfo +
                        lazerOffsets['osu.Game.Scoring.ScoreInfo'][
                            '<Passed>k__BackingField'
                        ]
                ) === 1,
            position: index + 1
        };
    }

    private isScorableHitResult(result: LazerHitResults) {
        switch (result) {
            case LazerHitResults.legacyComboIncrease:
                return true;

            case LazerHitResults.comboBreak:
                return true;

            case LazerHitResults.sliderTailHit:
                return true;

            default:
                return (
                    result >= LazerHitResults.miss &&
                    result < LazerHitResults.ignoreMiss
                );
        }
    }

    private isTickHitResult(result: LazerHitResults) {
        switch (result) {
            case LazerHitResults.largeTickHit:
            case LazerHitResults.largeTickMiss:
            case LazerHitResults.smallTickHit:
            case LazerHitResults.smallTickMiss:
            case LazerHitResults.sliderTailHit:
                return true;

            default:
                return false;
        }
    }

    private isBonusHitResult(result: LazerHitResults) {
        switch (result) {
            case LazerHitResults.smallBonus:
            case LazerHitResults.largeBonus:
                return true;

            default:
                return false;
        }
    }

    private isBasicHitResult(result: LazerHitResults) {
        switch (result) {
            case LazerHitResults.legacyComboIncrease:
                return false;
            case LazerHitResults.comboBreak:
                return false;
            default:
                return (
                    this.isScorableHitResult(result) &&
                    !this.isTickHitResult(result) &&
                    !this.isBonusHitResult(result)
                );
        }
    }

    private getObjectCountFromMaxStatistics(statistics: Statistics): number {
        let total = 0;

        const entries = Object.entries(statistics);
        for (let i = 0; i < entries.length; i++) {
            const kvp = entries[i];

            const key = LazerHitResults[kvp[0]];
            const value = kvp[1] as number;

            if (this.isBasicHitResult(key)) {
                total += value;
            }
        }

        return total;
    }

    private getDisplayScore(
        mode: number,
        standardisedTotalScore: number,
        objectCount: number
    ) {
        switch (mode) {
            case Rulesets.osu:
                return Math.round(
                    ((Math.pow(objectCount, 2) * 32.57 + 100000) *
                        standardisedTotalScore) /
                        LazerMemory.MAX_SCORE
                );

            case Rulesets.taiko:
                return Math.round(
                    ((objectCount * 1109 + 100000) * standardisedTotalScore) /
                        LazerMemory.MAX_SCORE
                );

            case Rulesets.fruits:
                return Math.round(
                    Math.pow(
                        (standardisedTotalScore / LazerMemory.MAX_SCORE) *
                            objectCount,
                        2
                    ) *
                        21.62 +
                        standardisedTotalScore / 10
                );

            case Rulesets.mania:
            default:
                return standardisedTotalScore;
        }
    }

    private readScore(
        scoreInfo: number,
        health: number = 0,
        retries: number = 0,
        combo?: number
    ): IGameplay {
        const statistics = this.readStatistics(scoreInfo);

        const mods = this.mods(scoreInfo);

        const realmUser = this.process.readIntPtr(
            scoreInfo +
                lazerOffsets['osu.Game.Scoring.ScoreInfo'][
                    '<RealmUser>k__BackingField'
                ]
        );
        const ruleset = this.process.readIntPtr(
            scoreInfo +
                lazerOffsets['osu.Game.Scoring.ScoreInfo'][
                    '<Ruleset>k__BackingField'
                ]
        );
        const mode = this.process.readInt(
            ruleset +
                lazerOffsets['osu.Game.Rulesets.RulesetInfo'][
                    '<OnlineID>k__BackingField'
                ]
        );

        let username = this.process.readSharpStringPtr(
            realmUser +
                lazerOffsets['osu.Game.Models.RealmUser'][
                    '<Username>k__BackingField'
                ]
        );

        if (username === 'Autoplay') username = 'osu!';
        if (username === 'osu!salad') username = 'salad!';
        if (username === 'osu!topus') username = 'osu!topus!';

        const player = this.player();
        if (!combo && player) {
            const scoreProcessor = this.process.readIntPtr(
                player +
                    lazerOffsets['osu.Game.Screens.Play.Player'][
                        '<ScoreProcessor>k__BackingField'
                    ]
            );

            const comboBindable = this.process.readIntPtr(
                scoreProcessor +
                    lazerOffsets[
                        'osu.Game.Rulesets.Osu.Scoring.OsuScoreProcessor'
                    ].Combo
            );

            combo = this.process.readInt(comboBindable + 0x40);
        }

        if (!combo) {
            combo = 0;
        }

        let score = this.process.readLong(
            scoreInfo +
                lazerOffsets['osu.Game.Scoring.ScoreInfo'][
                    '<TotalScore>k__BackingField'
                ]
        );
        if (this.scoringDisplayMode === ScoringMode.classic) {
            const objectCount = this.getObjectCountFromMaxStatistics(
                this.readMaximumStatistics(scoreInfo)
            );

            score = this.getDisplayScore(mode, score, objectCount);
        }

        return {
            retries,
            playerName: username,
            mods,
            mode,
            score,
            playerHPSmooth: health,
            playerHP: health,
            accuracy:
                this.process.readDouble(
                    scoreInfo +
                        lazerOffsets['osu.Game.Scoring.ScoreInfo'][
                            '<Accuracy>k__BackingField'
                        ]
                ) * 100,
            hitGeki: statistics.perfect,
            hit300: statistics.great,
            hitKatu: statistics.good,
            hit100: statistics.ok,
            hit50: statistics.meh,
            hitMiss: statistics.miss,
            sliderEndHits: statistics.sliderTailHit,
            smallTickHits: statistics.smallTickHit,
            largeTickHits: statistics.largeTickHit,
            combo,
            maxCombo: this.process.readInt(
                scoreInfo +
                    lazerOffsets['osu.Game.Scoring.ScoreInfo'][
                        '<MaxCombo>k__BackingField'
                    ]
            )
        };
    }

    getScanPatterns(): ScanPatterns {
        return this.scanPatterns;
    }

    audioVelocityBase(): IAudioVelocityBase {
        return [];
    }

    readUser(user: number) {
        const userId = this.process.readInt(
            user +
                lazerOffsets['osu.Game.Online.API.Requests.Responses.APIUser'][
                    '<Id>k__BackingField'
                ]
        );

        if (userId === 0) {
            return {
                id: 0,
                name: 'Guest',
                accuracy: 0,
                rankedScore: 0,
                level: 0,
                playCount: 0,
                playMode: 0,
                rank: 0,
                countryCode: 0,
                performancePoints: 0,
                rawBanchoStatus: 0,
                backgroundColour: 0xffffffff,
                rawLoginStatus: 0
            };
        }

        const statistics = this.process.readIntPtr(
            user +
                lazerOffsets['osu.Game.Online.API.Requests.Responses.APIUser']
                    .statistics
        );

        let pp = 0;
        let accuracy = 0;
        let rankedScore = 0;
        let level = 0;
        let playCount = 0;
        let rank = 0;

        if (statistics) {
            const ppDecimal =
                statistics +
                lazerOffsets['osu.Game.Users.UserStatistics'].PP +
                0x8;

            // TODO: read ulong instead long
            pp = numberFromDecimal(
                this.process.readLong(ppDecimal + 0x8),
                this.process.readUInt(ppDecimal + 0x4),
                this.process.readInt(ppDecimal)
            );

            accuracy = this.process.readDouble(
                statistics +
                    lazerOffsets['osu.Game.Users.UserStatistics'].Accuracy
            );
            rankedScore = this.process.readLong(
                statistics +
                    lazerOffsets['osu.Game.Users.UserStatistics'].RankedScore
            );
            level = this.process.readInt(
                statistics + lazerOffsets['osu.Game.Users.UserStatistics'].Level
            );
            playCount = this.process.readInt(
                statistics +
                    lazerOffsets['osu.Game.Users.UserStatistics'].PlayCount
            );
            rank = this.process.readInt(
                statistics +
                    lazerOffsets['osu.Game.Users.UserStatistics'].GlobalRank +
                    0x4
            );
        }

        let gamemode =
            Rulesets[
                this.process.readSharpStringPtr(
                    user +
                        lazerOffsets[
                            'osu.Game.Online.API.Requests.Responses.APIMe'
                        ].PlayMode
                )
            ];

        if (gamemode === undefined) {
            gamemode = -1;
        }

        return {
            id: userId,
            name: this.process.readSharpStringPtr(
                user +
                    lazerOffsets[
                        'osu.Game.Online.API.Requests.Responses.APIUser'
                    ]['<Username>k__BackingField']
            ),
            accuracy,
            rankedScore,
            level,
            playCount,
            playMode: gamemode,
            rank,
            countryCode:
                CountryCodes[
                    this.process
                        .readSharpStringPtr(
                            user +
                                lazerOffsets[
                                    'osu.Game.Online.API.Requests.Responses.APIUser'
                                ].countryCodeString
                        )
                        .toLowerCase()
                ],
            performancePoints: pp,
            rawBanchoStatus: 0,
            backgroundColour: 0xffffffff,
            rawLoginStatus: 0
        };
    }

    user(): IUser {
        const api = this.process.readIntPtr(
            this.gameBase() +
                lazerOffsets['osu.Game.OsuGameBase']['<API>k__BackingField']
        );
        const userBindable = this.process.readIntPtr(
            api +
                lazerOffsets['osu.Game.Online.API.APIAccess'][
                    '<localUser>k__BackingField'
                ]
        );
        const user = this.process.readIntPtr(userBindable + 0x20);

        return this.readUser(user);
    }

    buildResultScreen(
        scoreInfo: number,
        onlineId: number = -1,
        date: string = new Date().toISOString()
    ): IResultScreen {
        const score = this.readScore(scoreInfo);

        if (score instanceof Error) throw score;
        if (typeof score === 'string') {
            return 'not-ready';
        }

        return {
            onlineId,
            playerName: score.playerName,
            mods: score.mods,
            mode: score.mode,
            maxCombo: score.maxCombo,
            score: score.score,
            hit100: score.hit100,
            hit300: score.hit300,
            hit50: score.hit50,
            hitGeki: score.hitGeki,
            hitKatu: score.hitKatu,
            hitMiss: score.hitMiss,
            sliderEndHits: score.sliderEndHits,
            smallTickHits: score.smallTickHits,
            largeTickHits: score.largeTickHits,
            date
        };
    }

    resultScreen(): IResultScreen {
        const selectedScoreBindable = this.process.readIntPtr(
            this.currentScreen +
                lazerOffsets['osu.Game.Screens.Ranking.SoloResultsScreen']
                    .SelectedScore
        );

        const scoreInfo = this.process.readIntPtr(selectedScoreBindable + 0x20);

        const onlineId = Math.max(
            this.process.readLong(
                scoreInfo +
                    lazerOffsets['osu.Game.Scoring.ScoreInfo'][
                        '<OnlineID>k__BackingField'
                    ]
            ),
            this.process.readLong(
                scoreInfo +
                    lazerOffsets['osu.Game.Scoring.ScoreInfo'][
                        '<LegacyOnlineID>k__BackingField'
                    ]
            )
        );

        const scoreDate =
            scoreInfo +
            lazerOffsets['osu.Game.Scoring.ScoreInfo']['<Date>k__BackingField'];

        return this.buildResultScreen(
            scoreInfo,
            onlineId,
            netDateBinaryToDate(
                this.process.readInt(scoreDate + 0x4),
                this.process.readInt(scoreDate)
            ).toISOString()
        );
    }

    gameplay(): IGameplay {
        if (this.isPlayerLoading) {
            return 'not-ready';
        }

        const player = this.player();
        const scoreInfo = this.scoreInfo(player);

        const healthProcessor = this.process.readIntPtr(
            player +
                lazerOffsets['osu.Game.Screens.Play.Player'][
                    '<HealthProcessor>k__BackingField'
                ]
        );

        const healthBindable = this.process.readIntPtr(
            healthProcessor +
                lazerOffsets['osu.Game.Rulesets.Osu.Scoring.OsuHealthProcessor']
                    .Health
        );
        const health = this.process.readDouble(healthBindable + 0x40); // 0..1

        return this.readScore(
            scoreInfo,
            health * 200,
            this.process.readInt(
                player +
                    lazerOffsets['osu.Game.Screens.Play.SoloPlayer']
                        .RestartCount
            )
        );
    }

    // FIXME: not finished
    private readKeyTrigger(trigger: number): KeyCounter {
        const activationCountBindable = this.process.readIntPtr(
            trigger + 0x208
        );
        const activationCount = this.process.readInt(
            activationCountBindable + 0x40
        );

        const isActive = this.process.readByte(trigger + 0x1f4) === 1;

        return {
            isPressed: isActive,
            count: activationCount
        };
    }

    keyOverlay(mode: number): IKeyOverlay {
        try {
            const emptyKeyOverlay: IKeyOverlay = {
                K1Pressed: false,
                K1Count: 0,
                K2Pressed: false,
                K2Count: 0,
                M1Pressed: false,
                M1Count: 0,
                M2Pressed: false,
                M2Count: 0
            };

            if (mode !== 0 || this.isPlayerLoading) {
                return emptyKeyOverlay;
            }

            const player = this.player();

            const hudOverlay = this.process.readIntPtr(
                player +
                    lazerOffsets['osu.Game.Screens.Play.Player'][
                        '<HUDOverlay>k__BackingField'
                    ]
            );

            const inputController = this.process.readIntPtr(
                hudOverlay +
                    lazerOffsets['osu.Game.Screens.Play.HUDOverlay']
                        .InputCountController
            );

            const triggersBindable = this.process.readIntPtr(
                inputController +
                    lazerOffsets[
                        'osu.Game.Screens.Play.HUD.InputCountController'
                    ].triggers
            );

            const triggerCollection = this.process.readIntPtr(
                triggersBindable + 0x18
            );

            const triggers = this.readListItems(triggerCollection);

            if (triggers.length === 0) {
                return {
                    K1Pressed: false,
                    K1Count: 0,
                    K2Pressed: false,
                    K2Count: 0,
                    M1Pressed: false,
                    M1Count: 0,
                    M2Pressed: false,
                    M2Count: 0
                };
            }

            // available keys:
            // 0 - k1/m1, 1 - k2/m2, 2 - smoke
            const keyCounters: KeyCounter[] = [];

            for (let i = 0; i < triggers.length; i++) {
                keyCounters.push(this.readKeyTrigger(triggers[i]));
            }

            return {
                K1Pressed: keyCounters[0].isPressed,
                K1Count: keyCounters[0].count,
                K2Pressed: keyCounters[1].isPressed,
                K2Count: keyCounters[1].count,
                M1Pressed: keyCounters[2].isPressed,
                M1Count: keyCounters[2].count,
                M2Pressed: false,
                M2Count: 0
            };
        } catch (error) {
            return error as Error;
        }
    }

    private isResultHit(result: number): boolean {
        switch (result) {
            case LazerHitResults.none:
            case LazerHitResults.ignoreMiss:
            case LazerHitResults.miss:
            case LazerHitResults.smallTickMiss:
            case LazerHitResults.largeTickMiss:
            case LazerHitResults.smallBonus:
            case LazerHitResults.largeBonus:
            case LazerHitResults.comboBreak:
                return false;

            default:
                return true;
        }
    }

    private isHitCircle(object: number): boolean {
        // These might potentially change
        const sliderHeadCircleBaseSize = 0xe8;
        const hitCircleBaseSize = 0xe0;

        const type = this.process.readIntPtr(object);
        const baseSize = this.process.readInt(type + 0x4);

        if (
            baseSize !== sliderHeadCircleBaseSize &&
            baseSize !== hitCircleBaseSize
        ) {
            return false;
        }

        return true;
    }

    private readHitEvent(address: number): number | undefined {
        const hitObject = this.process.readIntPtr(address);
        if (!hitObject) {
            return undefined;
        }

        if (!this.isHitCircle(hitObject)) {
            return undefined;
        }

        const hitResult = this.process.readInt(address + 0x18);
        if (!this.isResultHit(hitResult)) {
            return undefined;
        }

        const timeOffset = this.process.readDouble(address + 0x10);
        return timeOffset;
    }

    private hitEvents(): number[] {
        const player = this.player();
        const scoreProcessor = this.process.readIntPtr(
            player +
                lazerOffsets['osu.Game.Screens.Play.Player'][
                    '<ScoreProcessor>k__BackingField'
                ]
        );
        const hitEventsList = this.process.readIntPtr(
            scoreProcessor +
                lazerOffsets['osu.Game.Rulesets.Scoring.ScoreProcessor']
                    .hitEvents
        );
        const hitEvents = this.readListItems(hitEventsList, true, 0x40);

        const result: number[] = [];
        for (let i = 0; i < hitEvents.length; i++) {
            const hitEvent = this.readHitEvent(hitEvents[i]);
            if (hitEvent === undefined) {
                continue;
            }

            result.push(hitEvent);
        }

        return result;
    }

    hitErrors(): IHitErrors {
        if (this.isPlayerLoading) {
            return [];
        }

        return this.hitEvents();
    }

    private readMod(acronym: ModsAcronyms, modObject: number): Mod {
        const mod: Mod = {
            acronym: acronym as any
        };

        switch (mod.acronym) {
            case 'EZ': {
                if (this.selectedGamemode === 1) break;

                mod.settings = {
                    retries: this.process.readInt(modObject + 0x20)
                };

                break;
            }
            case 'HT': {
                const speedChangeBindable = this.process.readIntPtr(
                    modObject + 0x10
                );
                const adjustPitchBindable = this.process.readIntPtr(
                    modObject + 0x18
                );

                mod.settings = {
                    speed_change: this.process.readDouble(
                        speedChangeBindable + 0x40
                    ),
                    adjust_pitch:
                        this.process.readByte(adjustPitchBindable + 0x40) === 1
                };

                break;
            }
            case 'DC': {
                const speedChangeBindable = this.process.readIntPtr(
                    modObject + 0x10
                );

                mod.settings = {
                    speed_change: this.process.readDouble(
                        speedChangeBindable + 0x40
                    )
                };

                break;
            }
            case 'SD': {
                const restartBindable = this.process.readIntPtr(
                    modObject + 0x10
                );

                mod.settings = {
                    restart: this.process.readByte(restartBindable + 0x40) === 1
                };

                break;
            }
            case 'PF': {
                const restartBindable = this.process.readIntPtr(
                    modObject + 0x10
                );

                mod.settings = {
                    restart: this.process.readByte(restartBindable + 0x40) === 1
                };

                break;
            }
            case 'DT': {
                const speedChangeBindable = this.process.readIntPtr(
                    modObject + 0x10
                );

                const adjustPitchBindable = this.process.readIntPtr(
                    modObject + 0x18
                );

                mod.settings = {
                    speed_change: this.process.readDouble(
                        speedChangeBindable + 0x40
                    ),
                    adjust_pitch:
                        this.process.readByte(adjustPitchBindable + 0x40) === 1
                };

                break;
            }
            case 'NC': {
                const speedChangeBindable = this.process.readIntPtr(
                    modObject + 0x10
                );

                mod.settings = {
                    speed_change: this.process.readDouble(
                        speedChangeBindable + 0x40
                    )
                };

                break;
            }
            case 'HD': {
                if ([1, 2, 3].includes(this.selectedGamemode)) break;
                const onlyFadeApproachCirclesBindable = this.process.readIntPtr(
                    modObject + 0x20
                );

                mod.settings = {
                    only_fade_approach_circles:
                        this.process.readByte(
                            onlyFadeApproachCirclesBindable + 0x40
                        ) === 1
                };
                break;
            }
            case 'FL': {
                const settings: any = {};
                const followDelayBindable = this.process.readIntPtr(
                    modObject + 0x18
                );

                const sizeMultiplierBindable = this.process.readIntPtr(
                    modObject + 0x20
                );

                const comboBasedBindable = this.process.readIntPtr(
                    modObject + 0x28
                );

                if (this.selectedGamemode === 0) {
                    settings.follow_delay = this.process.readDouble(
                        followDelayBindable + 0x40
                    );

                    settings.combo_based_size =
                        this.process.readByte(comboBasedBindable + 0x40) === 1;

                    settings.size_multiplier = this.process.readFloat(
                        sizeMultiplierBindable + 0x40
                    );
                } else if ([1, 2, 3].includes(this.selectedGamemode)) {
                    settings.size_multiplier = this.process.readFloat(
                        followDelayBindable + 0x40
                    );

                    settings.combo_based_size =
                        this.process.readByte(sizeMultiplierBindable + 0x40) ===
                        1;
                }

                mod.settings = settings;
                break;
            }
            case 'AC': {
                const restartBindable = this.process.readIntPtr(
                    modObject + 0x10
                );

                const minimumAccuracyBindable = this.process.readIntPtr(
                    modObject + 0x20
                );

                const accuracyJudgeModeBindable = this.process.readIntPtr(
                    modObject + 0x28
                );

                mod.settings = {
                    minimum_accuracy: this.process.readDouble(
                        minimumAccuracyBindable + 0x40
                    ),
                    accuracy_judge_mode: this.process
                        .readInt(accuracyJudgeModeBindable + 0x40)
                        .toString(),
                    restart: this.process.readByte(restartBindable + 0x40) === 1
                };
                break;
            }
            case 'TP': {
                const seedBindable = this.process.readIntPtr(modObject + 0x20);
                const metronomeBindable = this.process.readIntPtr(
                    modObject + 0x28
                );
                const valueNullable = seedBindable + 0x44 + 0x4;

                mod.settings = {
                    seed: this.process.readInt(valueNullable),
                    metronome:
                        this.process.readByte(metronomeBindable + 0x40) === 1
                };
                break;
            }
            case 'DA': {
                const settings: any = {};

                const drainRateBindable = this.process.readIntPtr(
                    modObject + 0x10
                );
                const overallDifficultyBindable = this.process.readIntPtr(
                    modObject + 0x18
                );
                const extendedLimitsBindable = this.process.readIntPtr(
                    modObject + 0x20
                );
                const circleSizeBindable = this.process.readIntPtr(
                    modObject + 0x28
                );
                const approachRateBindable = this.process.readIntPtr(
                    modObject + 0x30
                );

                const drainRateCurrentBindable = this.process.readIntPtr(
                    drainRateBindable + 0x60
                );

                const overallDifficultyCurrentBindable =
                    this.process.readIntPtr(overallDifficultyBindable + 0x60);

                if (
                    this.selectedGamemode === 0 ||
                    this.selectedGamemode === 2
                ) {
                    const circleSizeCurrentBindable = this.process.readIntPtr(
                        circleSizeBindable + 0x60
                    );
                    const approachRateCurrentBindable = this.process.readIntPtr(
                        approachRateBindable + 0x60
                    );

                    settings.approach_rate = this.process.readFloat(
                        approachRateCurrentBindable + 0x40
                    );

                    settings.circle_size = this.process.readFloat(
                        circleSizeCurrentBindable + 0x40
                    );

                    if (this.selectedGamemode === 2) {
                        const hardRockOffsetsBindable = this.process.readIntPtr(
                            modObject + 0x38
                        );

                        settings.hard_rock_offsets =
                            this.process.readByte(
                                hardRockOffsetsBindable + 0x40
                            ) === 1;
                    }
                } else if (this.selectedGamemode === 1) {
                    const circleSizeCurrentBindable = this.process.readIntPtr(
                        circleSizeBindable + 0x60
                    );
                    settings.scroll_speed = this.process.readFloat(
                        circleSizeCurrentBindable + 0x40
                    );
                }

                settings.drain_rate = this.process.readFloat(
                    drainRateCurrentBindable + 0x40
                );
                settings.overall_difficulty = this.process.readFloat(
                    overallDifficultyCurrentBindable + 0x40
                );

                settings.extended_limits =
                    this.process.readByte(extendedLimitsBindable + 0x40) === 1;

                mod.settings = settings;
                break;
            }
            case 'CL': {
                if (this.selectedGamemode === 1) break;
                const noSliderHeadAccuracyBindable = this.process.readIntPtr(
                    modObject + 0x10
                );
                const classicNoteLockBindable = this.process.readIntPtr(
                    modObject + 0x18
                );
                const alwaysPlayTailSampleBindable = this.process.readIntPtr(
                    modObject + 0x20
                );
                const fadeHitCircleEarlyBindable = this.process.readIntPtr(
                    modObject + 0x28
                );
                const classicHealthBindable = this.process.readIntPtr(
                    modObject + 0x30
                );

                mod.settings = {
                    no_slider_head_accuracy:
                        this.process.readByte(
                            noSliderHeadAccuracyBindable + 0x40
                        ) === 1,
                    classic_note_lock:
                        this.process.readByte(
                            classicNoteLockBindable + 0x40
                        ) === 1,
                    always_play_tail_sample:
                        this.process.readByte(
                            alwaysPlayTailSampleBindable + 0x40
                        ) === 1,
                    fade_hit_circle_early:
                        this.process.readByte(
                            fadeHitCircleEarlyBindable + 0x40
                        ) === 1,
                    classic_health:
                        this.process.readByte(classicHealthBindable + 0x40) ===
                        1
                };
                break;
            }
            case 'RD': {
                const settings: any = {};
                const seedBindable = this.process.readIntPtr(modObject + 0x10);
                const angleSharpnessBindable = this.process.readIntPtr(
                    modObject + 0x18
                );
                const valueNullable = seedBindable + 0x44 + 0x4;
                if (![3, 1].includes(this.selectedGamemode)) {
                    settings.angle_sharpness = this.process.readFloat(
                        angleSharpnessBindable + 0x40
                    );
                }

                settings.seed = this.process.readInt(valueNullable);
                mod.settings = settings;
                break;
            }
            case 'MR': {
                if ([2, 3].includes(this.selectedGamemode)) break;
                const reflectionBindable = this.process.readIntPtr(
                    modObject + 0x10
                );
                mod.settings = {
                    reflection: `${this.process.readInt(reflectionBindable + 0x40)}`
                };
                break;
            }
            case 'WG': {
                const strengthBindable = this.process.readIntPtr(
                    modObject + 0x20
                );

                mod.settings = {
                    strength: this.process.readDouble(strengthBindable + 0x40)
                };
                break;
            }
            case 'GR': {
                const startScaleBindable = this.process.readIntPtr(
                    modObject + 0x20
                );

                mod.settings = {
                    start_scale: this.process.readFloat(
                        startScaleBindable + 0x40
                    )
                };
                break;
            }
            case 'DF': {
                const startScaleBindable = this.process.readIntPtr(
                    modObject + 0x20
                );

                mod.settings = {
                    start_scale: this.process.readFloat(
                        startScaleBindable + 0x40
                    )
                };

                break;
            }
            case 'WU': {
                const initialRateBindable = this.process.readIntPtr(
                    modObject + 0x30
                );

                const finalRateBindable = this.process.readIntPtr(
                    modObject + 0x38
                );

                const adjustPitchBindable = this.process.readIntPtr(
                    modObject + 0x40
                );

                mod.settings = {
                    initial_rate: this.process.readDouble(
                        initialRateBindable + 0x40
                    ),
                    final_rate: this.process.readDouble(
                        finalRateBindable + 0x40
                    ),
                    adjust_pitch:
                        this.process.readByte(adjustPitchBindable + 0x40) === 1
                };
                break;
            }
            case 'WD': {
                const initialRateBindable = this.process.readIntPtr(
                    modObject + 0x30
                );

                const finalRateBindable = this.process.readIntPtr(
                    modObject + 0x38
                );

                const adjustPitchBindable = this.process.readIntPtr(
                    modObject + 0x40
                );

                mod.settings = {
                    initial_rate: this.process.readDouble(
                        initialRateBindable + 0x40
                    ),
                    final_rate: this.process.readDouble(
                        finalRateBindable + 0x40
                    ),
                    adjust_pitch:
                        this.process.readByte(adjustPitchBindable + 0x40) === 1
                };
                break;
            }
            case 'BR': {
                const spinSpeedBindable = this.process.readIntPtr(
                    modObject + 0x10
                );

                const directionBindable = this.process.readIntPtr(
                    modObject + 0x18
                );

                mod.settings = {
                    spin_speed: this.process.readDouble(
                        spinSpeedBindable + 0x40
                    ),
                    direction: this.process.readInt(directionBindable + 0x40)
                };
                break;
            }
            case 'AD': {
                const scaleBindable = this.process.readIntPtr(modObject + 0x10);
                const styleBindable = this.process.readIntPtr(modObject + 0x18);

                mod.settings = {
                    scale: this.process.readFloat(scaleBindable + 0x40),
                    style: this.process.readInt(styleBindable + 0x40)
                };
                break;
            }
            case 'MU': {
                const inverseMutingBindable = this.process.readIntPtr(
                    modObject + 0x28
                );

                const enableMetronomeBindable = this.process.readIntPtr(
                    modObject + 0x30
                );

                const muteComboCountBindable = this.process.readIntPtr(
                    modObject + 0x38
                );

                const affectsHitSoundsBindable = this.process.readIntPtr(
                    modObject + 0x40
                );

                mod.settings = {
                    inverse_muting:
                        this.process.readByte(inverseMutingBindable + 0x40) ===
                        1,
                    enable_metronome:
                        this.process.readByte(
                            enableMetronomeBindable + 0x40
                        ) === 1,
                    mute_combo_count: this.process.readInt(
                        muteComboCountBindable + 0x40
                    ),
                    affects_hit_sounds:
                        this.process.readByte(
                            affectsHitSoundsBindable + 0x40
                        ) === 1
                };
                break;
            }
            case 'NS': {
                const offset = this.selectedGamemode === 2 ? 0x28 : 0x30;

                const hiddenComboCountBindable = this.process.readIntPtr(
                    modObject + offset
                );

                mod.settings = {
                    hidden_combo_count: this.process.readInt(
                        hiddenComboCountBindable + 0x40
                    )
                };
                break;
            }
            case 'MG': {
                const attractionStrengthBindable = this.process.readIntPtr(
                    modObject + 0x10
                );

                mod.settings = {
                    attraction_strength: this.process.readFloat(
                        attractionStrengthBindable + 0x40
                    )
                };
                break;
            }
            case 'RP': {
                const repulsionStrengthBindable = this.process.readIntPtr(
                    modObject + 0x10
                );

                mod.settings = {
                    repulsion_strength: this.process.readFloat(
                        repulsionStrengthBindable + 0x40
                    )
                };

                break;
            }
            case 'AS': {
                const initialRateBindable = this.process.readIntPtr(
                    modObject + 0x10
                );

                const adjustPitchBindable = this.process.readIntPtr(
                    modObject + 0x18
                );

                mod.settings = {
                    initial_rate: this.process.readDouble(
                        initialRateBindable + 0x40
                    ),
                    adjust_pitch:
                        this.process.readByte(adjustPitchBindable + 0x40) === 1
                };
                break;
            }
            case 'DP': {
                const maxDepthBindable = this.process.readIntPtr(
                    modObject + 0x20
                );

                const showApproachRateBindable = this.process.readIntPtr(
                    modObject + 0x28
                );

                mod.settings = {
                    max_depth: this.process.readFloat(maxDepthBindable + 0x40),
                    show_approach_circles:
                        this.process.readByte(
                            showApproachRateBindable + 0x40
                        ) === 1
                };
                break;
            }
            case 'CO': {
                const coverageBindable = this.process.readIntPtr(
                    modObject + 0x20
                );

                const directionBindable = this.process.readIntPtr(
                    modObject + 0x28
                );

                mod.settings = {
                    coverage: this.process.readFloat(coverageBindable + 0x40),
                    direction: this.process.readInt(directionBindable + 0x40)
                };
                break;
            }
        }

        return mod;
    }

    private readGamemode() {
        const rulesetBindable = this.process.readIntPtr(
            this.gameBase() + lazerOffsets['osu.Desktop.OsuGameDesktop'].Ruleset
        );
        const rulesetInfo = this.process.readIntPtr(rulesetBindable + 0x20);

        const gamemode = this.process.readInt(
            rulesetInfo +
                lazerOffsets['osu.Game.Rulesets.RulesetInfo'][
                    '<OnlineID>k__BackingField'
                ]
        );
        return gamemode;
    }

    private selectedGamemode = 0;

    global(): IGlobal {
        const gamemode = this.readGamemode();
        if (this.selectedGamemode !== gamemode)
            this.selectedGamemode = gamemode;

        if (!this.modMappings.has(gamemode.toString())) {
            try {
                this.initModMapping(gamemode);
            } catch (exc) {
                wLogger.error(
                    'lazer',
                    this.pid,
                    'global',
                    'mods',
                    (exc as Error).message
                );
                wLogger.debug('lazer', this.pid, 'global', 'mods', exc);
            }
        }

        this.currentScreen = this.getCurrentScreen();

        const selectedModsBindable = this.process.readIntPtr(
            this.gameBase() +
                lazerOffsets['osu.Desktop.OsuGameDesktop'].SelectedMods
        );

        const selectedModsIsDisabled =
            this.process.readByte(selectedModsBindable + 0x50) === 1;

        if (!selectedModsIsDisabled) {
            const selectedMods = this.process.readIntPtr(
                selectedModsBindable + 0x20
            );

            const selectedModsItems = this.readListItems(selectedMods);

            const modList: Mod[] = [];

            for (let i = 0; i < selectedModsItems.length; i++) {
                const type = this.process.readIntPtr(selectedModsItems[i]);

                const acronym = this.modMappings.get(`${gamemode}-${type}`);

                if (acronym) {
                    modList.push(
                        this.readMod(acronym as any, selectedModsItems[i])
                    );
                }
            }

            let mods = calculateMods(modList, true);
            if (mods instanceof Error)
                mods = Object.assign({}, defaultCalculatedMods);

            this.menuMods = mods;
        }

        const filesFolder = path.join(this.basePath(), 'files');
        const isPlaying = this.player() !== 0;
        const isResultScreen = this.checkIfResultScreen(this.currentScreen);
        const isSongSelectV2 = this.checkIfSongSelectV2(this.currentScreen);
        const isPlayerLoader = this.checkIfPlayerLoader(this.currentScreen);
        const isEditor = this.checkIfEditor(this.currentScreen);
        const isMultiSelect = this.checkIfMultiSelect(this.currentScreen);
        const isMulti = this.checkIfMulti();

        let isMultiSpectating = false;

        let status = 0;

        if (isPlaying || isPlayerLoader) {
            status = GameState.play;
        } else if (isSongSelectV2) {
            status = GameState.selectPlay;
        } else if (isResultScreen) {
            status = GameState.resultScreen;
        } else if (isEditor) {
            status = GameState.edit;
        } else if (isMultiSelect) {
            status = GameState.selectMulti;
        } else if (isMulti) {
            const multiplayerClient = this.multiplayerClient();

            const currentRoom = this.process.readIntPtr(
                multiplayerClient +
                    lazerOffsets[
                        'osu.Game.Online.Multiplayer.MultiplayerClient'
                    ].room
            );

            if (currentRoom) {
                status = GameState.lobby;

                isMultiSpectating = this.checkIfMultiSpectator(
                    this.currentScreen
                );
            }
        }

        this.isPlayerLoading = isPlayerLoader;

        if (isPlaying) {
            const dependencies = this.process.readIntPtr(
                this.player() +
                    lazerOffsets['osu.Game.Screens.Play.Player'].dependencies
            );
            const cache = this.process.readIntPtr(dependencies + 0x8);
            const entries = this.process.readIntPtr(cache + 0x10);
            const drawableRuleset = this.process.readIntPtr(entries + 0x10);

            this.replayMode =
                this.process.readIntPtr(
                    drawableRuleset +
                        lazerOffsets['osu.Game.Rulesets.UI.DrawableRuleset'][
                            '<ReplayScore>k__BackingField'
                        ]
                ) !== 0;
        }

        return {
            isWatchingReplay: this.replayMode,
            isReplayUiHidden: !this.ReplaySettingsOverlay,
            showInterface: this.HUDVisibilityMode > 0,
            chatStatus: 0,
            isMultiSpectating,
            status,
            gameTime: 0,
            menuMods: this.menuMods,
            skinFolder: '',
            memorySongsFolder: filesFolder
        };
    }

    globalPrecise(): IGlobalPrecise {
        return {
            time: Math.round(this.currentTime())
        };
    }

    menu(previousChecksum: string): IMenu {
        const beatmap = this.currentBeatmap();

        const checksum = this.process.readSharpStringPtr(
            beatmap.info +
                lazerOffsets['osu.Game.Beatmaps.BeatmapInfo'][
                    '<MD5Hash>k__BackingField'
                ]
        );

        const gamemode = this.readGamemode();
        const rankedStatus = Number(
            this.lazerToStableStatus[
                this.process.readInt(
                    beatmap.info +
                        lazerOffsets['osu.Game.Beatmaps.BeatmapInfo'][
                            '<StatusInt>k__BackingField'
                        ]
                )
            ]
        );
        if (checksum === previousChecksum) {
            return {
                type: 'checksum',
                gamemode,
                rankedStatus
            };
        }

        const metadata = this.process.readIntPtr(
            beatmap.info +
                lazerOffsets['osu.Game.Beatmaps.BeatmapInfo'][
                    '<Metadata>k__BackingField'
                ]
        );
        const difficulty = this.process.readIntPtr(
            beatmap.info +
                lazerOffsets['osu.Game.Beatmaps.BeatmapInfo'][
                    '<Difficulty>k__BackingField'
                ]
        );
        const hash = this.process.readSharpStringPtr(
            beatmap.info +
                lazerOffsets['osu.Game.Beatmaps.BeatmapInfo'][
                    '<Hash>k__BackingField'
                ]
        );
        const author = this.process.readIntPtr(
            metadata +
                lazerOffsets['osu.Game.Beatmaps.BeatmapMetadata'][
                    '<Author>k__BackingField'
                ]
        );

        const files = this.getBeatmapFiles(beatmap.setInfo);

        const audioFilename = this.process.readSharpStringPtr(metadata + 0x50);
        const backgroundFilename = this.process.readSharpStringPtr(
            metadata + 0x58
        );
        const audioFileHash =
            files[
                this.process.readSharpStringPtr(
                    metadata +
                        lazerOffsets['osu.Game.Beatmaps.BeatmapMetadata'][
                            '<AudioFile>k__BackingField'
                        ]
                )
            ];
        const backgroundFileHash =
            files[
                this.process.readSharpStringPtr(
                    metadata +
                        lazerOffsets['osu.Game.Beatmaps.BeatmapMetadata'][
                            '<BackgroundFile>k__BackingField'
                        ]
                )
            ];

        const difficultyName = this.process.readSharpStringPtr(
            beatmap.info +
                lazerOffsets['osu.Game.Beatmaps.BeatmapInfo'][
                    '<DifficultyName>k__BackingField'
                ]
        );

        return {
            type: 'update',
            gamemode,
            checksum,
            filename: this.toLazerPath(hash),
            plays: 0,
            title: this.process.readSharpStringPtr(
                metadata +
                    lazerOffsets['osu.Game.Beatmaps.BeatmapMetadata'][
                        '<Title>k__BackingField'
                    ]
            ),
            titleOriginal: this.process.readSharpStringPtr(
                metadata +
                    lazerOffsets['osu.Game.Beatmaps.BeatmapMetadata'][
                        '<TitleUnicode>k__BackingField'
                    ]
            ),
            artist: this.process.readSharpStringPtr(
                metadata +
                    lazerOffsets['osu.Game.Beatmaps.BeatmapMetadata'][
                        '<Artist>k__BackingField'
                    ]
            ),
            artistOriginal: this.process.readSharpStringPtr(
                metadata +
                    lazerOffsets['osu.Game.Beatmaps.BeatmapMetadata'][
                        '<ArtistUnicode>k__BackingField'
                    ]
            ),
            ar: this.process.readFloat(
                difficulty +
                    lazerOffsets['osu.Game.Beatmaps.BeatmapDifficulty'][
                        '<ApproachRate>k__BackingField'
                    ]
            ),
            cs: this.process.readFloat(
                difficulty +
                    lazerOffsets['osu.Game.Beatmaps.BeatmapDifficulty'][
                        '<CircleSize>k__BackingField'
                    ]
            ),
            hp: this.process.readFloat(
                difficulty +
                    lazerOffsets['osu.Game.Beatmaps.BeatmapDifficulty'][
                        '<DrainRate>k__BackingField'
                    ]
            ),
            od: this.process.readFloat(
                difficulty +
                    lazerOffsets['osu.Game.Beatmaps.BeatmapDifficulty'][
                        '<OverallDifficulty>k__BackingField'
                    ]
            ),
            audioFilename: this.toLazerPath(audioFileHash),
            audioFileMimetype: getContentType(audioFilename),
            backgroundFilename: this.toLazerPath(backgroundFileHash),
            backgroundFileMimetype: getContentType(backgroundFilename),
            folder: '',
            creator: this.process.readSharpStringPtr(
                author +
                    lazerOffsets['osu.Game.Models.RealmUser'][
                        '<Username>k__BackingField'
                    ]
            ),
            difficulty: difficultyName,
            mapID: this.process.readInt(
                beatmap.info +
                    lazerOffsets['osu.Game.Beatmaps.BeatmapInfo'][
                        '<OnlineID>k__BackingField'
                    ]
            ),
            setID: this.process.readInt(
                beatmap.setInfo +
                    lazerOffsets['osu.Game.Beatmaps.BeatmapSetInfo'][
                        '<OnlineID>k__BackingField'
                    ]
            ),
            rankedStatus,
            objectCount: this.process.readInt(
                beatmap.info +
                    lazerOffsets['osu.Game.Beatmaps.BeatmapInfo'][
                        '<TotalObjectCount>k__BackingField'
                    ]
            )
        };
    }

    mp3Length(): IMP3Length {
        const beatmapClock = this.beatmapClock();
        const decoupledTrack = this.process.readIntPtr(
            beatmapClock +
                lazerOffsets['osu.Game.Beatmaps.FramedBeatmapClock']
                    .decoupledTrack
        );
        const sourceTrack = this.process.readIntPtr(
            decoupledTrack +
                lazerOffsets['osu.Framework.Timing.DecouplingFramedClock'][
                    '<Source>k__BackingField'
                ]
        );

        return Math.round(
            this.process.readDouble(
                sourceTrack +
                    lazerOffsets['osu.Framework.Audio.Track.Track'].length
            )
        );
    }

    tourney(): ITourney {
        throw new Error('Lazer:tourney not implemented.');
    }

    tourneyChat(_messages: ITourneyManagerChatItem[]): ITourneyChat {
        throw new Error('Lazer:tourneyChat not implemented.');
    }

    tourneyUser(): ITourneyUser {
        throw new Error('Lazer:tourneyUser not implemented.');
    }

    /*
     * Doesn't work for ReplayPlayer
     * @see https://github.com/ppy/osu/issues/27609
     */
    leaderboard(): ILeaderboard {
        const player = this.player();

        const personalScore = this.readLeaderboardScore(
            this.scoreInfo(player),
            -1
        );

        // TODO: update once I bother todo it :)
        // const leaderboardScores = this.process.readIntPtr(
        //     player + (this.replayMode ? 0x4e8 : 0x520)
        // );

        // const items = this.readListItems(
        //     this.process.readIntPtr(leaderboardScores + 0x18)
        // );

        // const scores: LeaderboardPlayer[] = [];

        // for (let i = 0; i < items.length; i++) {
        //     scores.push(this.readLeaderboardScore(items[i], i));
        // }

        return [true, personalScore, []];
    }

    readSpectatingData(): ILazerSpectator {
        const multiSpectatorScreen = this.currentScreen;

        const spectatingClients: ILazerSpectatorEntry[] = [];

        const gameplayStates = this.process.readIntPtr(
            multiSpectatorScreen +
                lazerOffsets['osu.Game.Screens.Spectate.SpectatorScreen']
                    .gameplayStates
        );
        const gameplayStatesEntries = this.process.readIntPtr(
            gameplayStates + 0x10
        );
        const gameplayStatesCount = this.process.readInt(gameplayStates + 0x38);

        const userStates: Record<
            number,
            { team: MultiplayerTeamType; state: MultiplayerUserState }
        > = {};

        const multiplayerClient = this.multiplayerClient();

        const room = this.process.readIntPtr(
            multiplayerClient +
                lazerOffsets['osu.Game.Online.Multiplayer.MultiplayerClient']
                    .room
        );

        const multiplayerUsers = this.process.readIntPtr(room + 0x10);
        const multiplayerUsersItems = this.process.readIntPtr(
            multiplayerUsers + 0x8
        );
        const multiplayerUsersCount = this.process.readInt(
            multiplayerUsers + 0x10
        );

        for (let i = 0; i < multiplayerUsersCount; i++) {
            const current = this.process.readIntPtr(
                multiplayerUsersItems + 0x10 + 0x8 * i
            );

            const userId = this.process.readInt(
                current +
                    lazerOffsets[
                        'osu.Game.Online.Multiplayer.MultiplayerRoomUser'
                    ].UserID
            );
            const matchState = this.process.readIntPtr(
                current +
                    lazerOffsets[
                        'osu.Game.Online.Multiplayer.MultiplayerRoomUser'
                    ]['<MatchState>k__BackingField']
            );

            let team: MultiplayerTeamType = 'none';

            if (matchState) {
                const teamId = this.process.readInt(matchState + 0x8);
                team = teamId === 0 ? 'red' : 'blue';
            }

            const state = this.process.readInt(
                current +
                    lazerOffsets[
                        'osu.Game.Online.Multiplayer.MultiplayerRoomUser'
                    ]['<State>k__BackingField']
            );

            userStates[userId] = {
                team,
                state
            };
        }

        for (let i = 0; i < gameplayStatesCount; i++) {
            const current = gameplayStatesEntries + 0x10 + 0x18 * i;

            const state = this.process.readIntPtr(current);

            if (!state) {
                continue;
            }

            const score = this.process.readIntPtr(state + 0x8);
            const scoreInfo = this.process.readIntPtr(score + 0x8);
            const gameplayScore = this.readScore(scoreInfo);

            const apiUser = this.process.readIntPtr(
                scoreInfo + lazerOffsets['osu.Game.Scoring.ScoreInfo'].user
            );
            const user = this.readUser(apiUser);

            if (gameplayScore instanceof Error) {
                throw gameplayScore;
            }

            if (typeof gameplayScore === 'string') {
                return undefined;
            }

            const userState = userStates[user.id];

            spectatingClients.push({
                team: userState.team,
                user,
                score: gameplayScore,
                resultScreen:
                    userState.state === MultiplayerUserState.Results
                        ? this.buildResultScreen(scoreInfo)
                        : undefined
            });
        }

        // const multiplayerClient = this.multiplayerClient();

        // const room = this.process.readIntPtr(multiplayerClient + 0x288);

        // const roomId = this.process.readInt(room + 0x38);
        // const channelId = this.process.readInt(room + 0x44);

        return { chat: [], spectatingClients };
    }

    settings(): ISettings {
        const values = this.osuConfig();

        try {
            const skinManager = this.process.readIntPtr(
                this.gameBaseAddress +
                    lazerOffsets['osu.Game.OsuGameBase'][
                        '<SkinManager>k__BackingField'
                    ]
            );
            const currentSkin = this.process.readIntPtr(
                skinManager +
                    lazerOffsets['osu.Game.Skinning.SkinManager'].CurrentSkin
            );
            const value = this.process.readIntPtr(currentSkin + 0x20);
            const name = this.process.readSharpStringPtr(
                value +
                    lazerOffsets['osu.Game.Skinning.Skin'][
                        '<Name>k__BackingField'
                    ]
            );

            values['skin.name'] = name;

            this.game.resetReportCount('settings skin');
        } catch (exc) {
            this.game.reportError(
                'settings skin',
                10,
                ClientType[this.game.client],
                this.game.pid,
                'settings skin',
                (exc as Error).message
            );
            wLogger.debug(
                ClientType[this.game.client],
                this.game.pid,
                'settings skin',
                exc
            );
        }

        const platform = platformResolver(process.platform);
        if (platform.type === 'windows') {
            try {
                const host = this.process.readIntPtr(
                    this.gameBaseAddress +
                        lazerOffsets['osu.Framework.Game'][
                            '<Host>k__BackingField'
                        ]
                );
                const inputConfig = this.process.readIntPtr(
                    host +
                        lazerOffsets['osu.Framework.Platform.GameHost'][
                            '<inputConfig>k__BackingField'
                        ]
                );
                const inputHandlers = this.process.readIntPtr(
                    inputConfig +
                        lazerOffsets[
                            'osu.Framework.Configuration.InputConfigManager'
                        ]['<InputHandlers>k__BackingField']
                );

                const array = this.process.readIntPtr(inputHandlers + 0x8);
                const size = this.process.readInt(array + 0x8);

                for (let i = 0; i < size; i++) {
                    const current = this.process.readIntPtr(
                        array + 0x10 + 0x8 * i
                    );

                    const enabled =
                        this.process.readByte(
                            this.process.readIntPtr(current + 0x18) + 0x40
                        ) === 1;
                    if (i === 1) {
                        const areaOffset = this.process.readIntPtr(
                            current +
                                lazerOffsets[
                                    'osu.Framework.Input.Handlers.Tablet.OpenTabletDriverHandler'
                                ]['<AreaOffset>k__BackingField']
                        );
                        const areaX = this.process.readFloat(areaOffset + 0x44);
                        const areaY = this.process.readFloat(areaOffset + 0x48);

                        const areaSize = this.process.readIntPtr(
                            current +
                                lazerOffsets[
                                    'osu.Framework.Input.Handlers.Tablet.OpenTabletDriverHandler'
                                ]['<AreaSize>k__BackingField']
                        );
                        const areaWidth = this.process.readFloat(
                            areaSize + 0x44
                        );
                        const areaHeight = this.process.readFloat(
                            areaSize + 0x48
                        );

                        const areaRotation = this.process.readFloat(
                            this.process.readIntPtr(
                                current +
                                    lazerOffsets[
                                        'osu.Framework.Input.Handlers.Tablet.OpenTabletDriverHandler'
                                    ]['<Rotation>k__BackingField']
                            ) + 0x40
                        );
                        const pressureThreshold = this.process.readFloat(
                            this.process.readIntPtr(
                                current +
                                    lazerOffsets[
                                        'osu.Framework.Input.Handlers.Tablet.OpenTabletDriverHandler'
                                    ]['<PressureThreshold>k__BackingField']
                            ) + 0x40
                        );

                        values['tablet.enabled'] = enabled;
                        values['tablet.x'] = areaX;
                        values['tablet.y'] = areaY;
                        values['tablet.width'] = areaWidth;
                        values['tablet.height'] = areaHeight;
                        values['tablet.rotation'] = areaRotation;
                        values['tablet.pressureThreshold'] = pressureThreshold;
                    }

                    if (i === 5) {
                        const userRelativeMode =
                            this.process.readByte(
                                this.process.readIntPtr(
                                    current +
                                        lazerOffsets[
                                            'osu.Framework.Input.Handlers.Mouse.MouseHandler'
                                        ]['<UseRelativeMode>k__BackingField']
                                ) + 0x40
                            ) === 1;
                        values['mouse.highPrecision'] = userRelativeMode;
                    }
                }

                this.game.resetReportCount('settings devices');
            } catch (exc) {
                this.game.reportError(
                    'settings devices',
                    10,
                    ClientType[this.game.client],
                    this.game.pid,
                    'settings devices',
                    (exc as Error).message
                );
                wLogger.debug(
                    ClientType[this.game.client],
                    this.game.pid,
                    'settings devices',
                    exc
                );
            }
        }

        return values;
    }
}
