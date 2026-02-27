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
    config,
    isRealNumber,
    measureTime,
    platformResolver,
    wLogger
} from '@tosu/common';
import { getContentType } from '@tosu/server';
import path from 'path';

import localOffsets from '@/assets/offsets.json';
import { LazerInstance } from '@/instances/lazerInstance';
import { AbstractMemory } from '@/memory';
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
    IScore,
    ISettings,
    ITourney,
    ITourneyChat,
    ITourneyUser,
    IUser,
    ScanPatterns
} from '@/memory/types';
import type { ITourneyManagerChatItem } from '@/states/tourney';
import {
    KeyOverlayButton,
    LeaderboardPlayer,
    Statistics
} from '@/states/types';
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

export interface Offsets {
    OsuVersion: string;
    'osu.Game.OsuGame': {
        osuLogo: number;
        ScreenStack: number;
        SentryLogger: number;
        channelManager: number;
        '<frameworkConfig>k__BackingField': number;
        chatOverlay: number;
    };
    'osu.Framework.Game': {
        '<Host>k__BackingField': number;
    };
    'osu.Game.OsuGameBase': {
        '<API>k__BackingField': number;
        '<SpectatorClient>k__BackingField': number;
        '<ScoreManager>k__BackingField': number;
        '<MultiplayerClient>k__BackingField': number;
        '<LeaderboardManager>k__BackingField': number;
        '<SessionStatics>k__BackingField': number;
        beatmapClock: number;
        '<Storage>k__BackingField': number;
        '<Beatmap>k__BackingField': number;
        '<SkinManager>k__BackingField': number;
        '<VersionHash>k__BackingField': number;
        '<LocalConfig>k__BackingField': number;
        rulesetConfigCache: number;
        realm: number;
    };
    'osu.Game.Screens.SelectV2.SoloSongSelect': {
        '<game>k__BackingField': number;
    };
    'osu.Game.Screens.Play.SubmittingPlayer': {
        '<api>k__BackingField': number;
        '<spectatorClient>k__BackingField': number;
    };
    'osu.Game.Screens.Play.PlayerLoader': {
        osuLogo: number;
        '<leaderboardManager>k__BackingField': number;
    };
    'osu.Game.Screens.Play.SpectatorPlayer': {
        score: number;
        '<SpectatorClient>k__BackingField': number;
    };
    'osu.Game.Beatmaps.FramedBeatmapClock': {
        finalClockSource: number;
        decoupledTrack: number;
    };
    'osu.Framework.Timing.DecouplingFramedClock': {
        '<Source>k__BackingField': number;
    };
    'osu.Framework.Audio.Track.Track': {
        length: number;
    };
    'osu.Framework.Timing.FramedClock': {
        '<CurrentTime>k__BackingField': number;
    };
    'osu.Game.Screens.OsuScreen': {
        '<logo>k__BackingField': number;
    };
    'osu.Game.Screens.Ranking.SoloResultsScreen': {
        '<api>k__BackingField': number;
        SelectedScore: number;
    };
    'osu.Game.Screens.Edit.Editor': {
        '<realm>k__BackingField': number;
        '<api>k__BackingField': number;
    };
    'osu.Game.Screens.OnlinePlay.OnlinePlayScreen': {
        '<API>k__BackingField': number;
    };
    'osu.Game.Screens.OnlinePlay.Multiplayer.Multiplayer': {
        '<client>k__BackingField': number;
    };
    'osu.Game.Online.Multiplayer.MultiplayerRoom': {
        '<ChannelID>k__BackingField': number;
    };
    'osu.Game.Screens.Spectate.SpectatorScreen': {
        '<spectatorClient>k__BackingField': number;
        gameplayStates: number;
    };
    'osu.Game.Screens.OnlinePlay.Multiplayer.Spectate.MultiSpectatorScreen': {
        '<multiplayerClient>k__BackingField': number;
    };
    'osu.Game.Online.Multiplayer.OnlineMultiplayerClient': {
        '<IsConnected>k__BackingField': number;
    };
    'osu.Game.Online.Multiplayer.MultiplayerClient': {
        room: number;
    };
    'osu.Game.Overlays.ChatOverlay': {
        State: number;
    };
    'osu.Game.Screens.Menu.OsuLogo': {
        visualizer: number;
    };
    'osu.Game.Screens.Menu.LogoVisualisation': {
        frequencyAmplitudes: number;
    };
    'osu.Game.Screens.Play.Player': {
        '<api>k__BackingField': number;
        '<scoreManager>k__BackingField': number;
        '<Score>k__BackingField': number;
        '<ScoreProcessor>k__BackingField': number;
        '<HealthProcessor>k__BackingField': number;
        '<HUDOverlay>k__BackingField': number;
        '<DrawableRuleset>k__BackingField': number;
        dependencies: number;
    };
    'osu.Framework.Screens.ScreenStack': {
        stack: number;
    };
    'osu.Game.Rulesets.RulesetConfigCache': {
        configCache: number;
    };
    'osu.Game.Online.Chat.ExternalLinkOpener': {
        '<api>k__BackingField': number;
    };
    'osu.Game.Online.API.APIAccess': {
        localUserState: number;
        game: number;
    };
    'osu.Game.Online.API.LocalUserState': {
        localUser: number;
    };
    'osu.Desktop.OsuGameDesktop': {
        AvailableMods: number;
        SelectedMods: number;
        Ruleset: number;
    };
    'osu.Game.Scoring.ScoreInfo': {
        '<OnlineID>k__BackingField': number;
        '<LegacyOnlineID>k__BackingField': number;
        '<ModsJson>k__BackingField': number;
        '<HitEvents>k__BackingField': number;
        '<RealmUser>k__BackingField': number;
        '<TotalScore>k__BackingField': number;
        '<MaxCombo>k__BackingField': number;
        '<Combo>k__BackingField': number;
        '<Passed>k__BackingField': number;
        '<Ruleset>k__BackingField': number;
        '<Accuracy>k__BackingField': number;
        '<Date>k__BackingField': number;
        statistics: number;
        maximumStatistics: number;
        user: number;
    };
    'osu.Framework.Platform.Storage': {
        '<BasePath>k__BackingField': number;
    };
    'osu.Game.IO.WrappedStorage': {
        '<UnderlyingStorage>k__BackingField': number;
    };
    'osu.Game.Beatmaps.WorkingBeatmapCache+BeatmapManagerWorkingBeatmap': {
        BeatmapInfo: number;
        BeatmapSetInfo: number;
    };
    'osu.Game.Models.RealmUser': {
        '<Username>k__BackingField': number;
        '<OnlineID>k__BackingField': number;
    };
    'osu.Game.Rulesets.RulesetInfo': {
        '<OnlineID>k__BackingField': number;
    };
    'osu.Game.Screens.Play.SoloPlayer': {
        RestartCount: number;
    };
    'osu.Game.Rulesets.Osu.Scoring.OsuScoreProcessor': {
        Combo: number;
    };
    'osu.Game.Rulesets.Scoring.ScoreProcessor': {
        hitEvents: number;
    };
    'osu.Game.Online.API.Requests.Responses.APIMe': {
        PlayMode: number;
    };
    'osu.Game.Online.API.Requests.Responses.APIUser': {
        '<Id>k__BackingField': number;
        '<Username>k__BackingField': number;
        countryCodeString: number;
        statistics: number;
    };
    'osu.Game.Online.Chat.ChannelManager': {
        joinedChannels: number;
    };
    'osu.Game.Online.Chat.Channel': {
        Id: number;
        Messages: number;
    };
    'osu.Game.Online.Chat.Message': {
        Timestamp: number;
        Content: number;
        Sender: number;
    };
    'osu.Game.Users.UserStatistics': {
        RankedScore: number;
        GlobalRank: number;
        PlayCount: number;
        Accuracy: number;
        Level: number;
        PP: number;
    };
    'osu.Game.Rulesets.Osu.Scoring.OsuHealthProcessor': {
        Health: number;
    };
    'osu.Game.Screens.Play.HUDOverlay': {
        InputCountController: number;
        '<ShowHud>k__BackingField': number;
    };
    'osu.Game.Screens.Play.HUD.InputCountController': {
        triggers: number;
    };
    'osu.Game.Rulesets.UI.DrawableRuleset': {
        '<ReplayScore>k__BackingField': number;
    };
    'osu.Game.Beatmaps.BeatmapInfo': {
        '<OnlineID>k__BackingField': number;
        '<MD5Hash>k__BackingField': number;
        '<StatusInt>k__BackingField': number;
        '<Metadata>k__BackingField': number;
        '<Difficulty>k__BackingField': number;
        '<DifficultyName>k__BackingField': number;
        '<TotalObjectCount>k__BackingField': number;
        '<Hash>k__BackingField': number;
    };
    'osu.Game.Beatmaps.BeatmapSetInfo': {
        '<OnlineID>k__BackingField': number;
    };
    'osu.Game.Beatmaps.BeatmapMetadata': {
        '<Title>k__BackingField': number;
        '<TitleUnicode>k__BackingField': number;
        '<Artist>k__BackingField': number;
        '<ArtistUnicode>k__BackingField': number;
        '<Author>k__BackingField': number;
        '<Source>k__BackingField': number;
        '<Tags>k__BackingField': number;
        '<UserTags>k__BackingField': number;
        '<PreviewTime>k__BackingField': number;
        '<AudioFile>k__BackingField': number;
        '<BackgroundFile>k__BackingField': number;
    };
    'osu.Game.Beatmaps.BeatmapDifficulty': {
        '<DrainRate>k__BackingField': number;
        '<CircleSize>k__BackingField': number;
        '<OverallDifficulty>k__BackingField': number;
        '<ApproachRate>k__BackingField': number;
        '<SliderMultiplier>k__BackingField': number;
        '<SliderTickRate>k__BackingField': number;
    };
    'osu.Game.Online.Multiplayer.MultiplayerRoomUser': {
        UserID: number;
        '<State>k__BackingField': number;
        '<BeatmapAvailability>k__BackingField': number;
        '<Mods>k__BackingField': number;
        '<MatchState>k__BackingField': number;
        RulesetId: number;
        BeatmapId: number;
        '<User>k__BackingField': number;
    };
    'osu.Game.Skinning.SkinManager': {
        CurrentSkin: number;
    };
    'osu.Game.Skinning.Skin': {
        '<Name>k__BackingField': number;
    };
    'osu.Framework.Platform.GameHost': {
        '<inputConfig>k__BackingField': number;
    };
    'osu.Framework.Configuration.InputConfigManager': {
        '<InputHandlers>k__BackingField': number;
    };
    'osu.Framework.Input.Handlers.Tablet.OpenTabletDriverHandler': {
        '<AreaOffset>k__BackingField': number;
        '<AreaSize>k__BackingField': number;
        '<Rotation>k__BackingField': number;
        '<PressureThreshold>k__BackingField': number;
    };
    'osu.Framework.Input.Handlers.Mouse.MouseHandler': {
        '<UseRelativeMode>k__BackingField': number;
    };
    'osu.Game.Utils.SentryLogger': {
        sentrySession: number;
    };
    'Sentry.SentrySdk+DisposeHandle': {
        _localHub: number;
    };
    'Sentry.Internal.Hub': {
        _options: number;
    };
    'Sentry.SentryOptions': {
        '<Release>k__BackingField': number;
    };
}

const localConfigList = [
    LazerSettings.ReleaseStream,
    LazerSettings.ScoreDisplayMode,
    LazerSettings.BeatmapDetailTab,
    LazerSettings.SongSelectSortingMode,
    LazerSettings.SongSelectGroupMode,
    LazerSettings.GameplayLeaderboard,
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
    FrameworkSetting.WindowMode,
    FrameworkSetting.WindowedSize,
    FrameworkSetting.VolumeUniversal,
    FrameworkSetting.VolumeMusic,
    FrameworkSetting.VolumeEffect,
    FrameworkSetting.SizeFullscreen,
    FrameworkSetting.CursorSensitivity
];

const expectedVtableValue: number = 7696598171648;

export class LazerMemory extends AbstractMemory<LazerPatternData> {
    offsets: Offsets = localOffsets;

    private scanPatterns: ScanPatterns = {
        scalingContainerTargetDrawSize: {
            pattern:
                '00 00 80 44 00 00 40 44 00 00 00 00 ?? ?? ?? ?? 00 00 00 00',
            offset: 0,
            nonZeroMask: true
        }
    };

    private static MAX_SCORE = 1000000;

    private menuMods: CalculateMods = Object.assign({}, defaultCalculatedMods);

    private currentScreen: number = 0;
    private scoringDisplayMode: ScoringMode = ScoringMode.standardised;
    private showInterface: boolean = true;
    private ReplaySettingsOverlay: boolean = true;

    private watchingReplay: boolean = false;
    private spectating: boolean = false;
    private status: number = 0;

    private modMappings: Map<string, string> = new Map();

    private isPlayerLoading: boolean = false;

    private gameBaseAddress: number;

    private isLeaderboardVisible: boolean = false;

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
                this.offsets['osu.Game.Online.Chat.ExternalLinkOpener'][
                    '<api>k__BackingField'
                ]
        );

        this.gameBaseAddress = this.process.readIntPtr(
            api + this.offsets['osu.Game.Online.API.APIAccess'].game
        );

        wLogger.debug(
            `%${ClientType[this.game.client]}%`,
            `GameBase address updated: %${oldAddress?.toString(16)}% => %${this.gameBaseAddress.toString(16)}%`
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
            wLogger.debug(
                `%${ClientType[this.game.client]}%`,
                `GameBase validation failed, resetting...`
            );

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

    gameVersion() {
        const sentryLogger = this.process.readIntPtr(
            this.gameBase() + this.offsets['osu.Game.OsuGame'].SentryLogger
        );
        wLogger.debug(
            `Game version check (SentryLogger): %${sentryLogger.toString(16)}%`
        );

        const sentrySession = this.process.readIntPtr(
            sentryLogger +
                this.offsets['osu.Game.Utils.SentryLogger'].sentrySession
        );
        wLogger.debug(
            `Game version check (SentrySession): %${sentrySession.toString(16)}%`
        );

        const localHub = this.process.readIntPtr(
            sentrySession +
                this.offsets['Sentry.SentrySdk+DisposeHandle']._localHub
        );
        wLogger.debug(
            `Game version check (LocalHub): %${localHub.toString(16)}%`
        );

        const options = this.process.readIntPtr(
            localHub + this.offsets['Sentry.Internal.Hub']._options
        );
        wLogger.debug(
            `Game version check (Options): %${options.toString(16)}%`
        );

        const release = this.process.readSharpStringPtr(
            options +
                this.offsets['Sentry.SentryOptions']['<Release>k__BackingField']
        );

        return release?.split('@')?.[1];
    }

    private screenStack() {
        return this.process.readIntPtr(
            this.gameBase() + this.offsets['osu.Game.OsuGame'].ScreenStack
        );
    }

    private checkIfSongSelectV2(address: number) {
        return (
            this.process.readIntPtr(
                address +
                    this.offsets['osu.Game.Screens.SelectV2.SoloSongSelect'][
                        '<game>k__BackingField'
                    ]
            ) === this.gameBase()
        );
    }

    private checkIfPlayer(address: number) {
        return (
            this.process.readIntPtr(
                address +
                    this.offsets['osu.Game.Screens.Play.SubmittingPlayer'][
                        '<api>k__BackingField'
                    ]
            ) ===
                this.process.readIntPtr(
                    this.gameBase() +
                        this.offsets['osu.Game.OsuGameBase'][
                            '<API>k__BackingField'
                        ]
                ) &&
            this.process.readIntPtr(
                address +
                    this.offsets['osu.Game.Screens.Play.SubmittingPlayer'][
                        '<spectatorClient>k__BackingField'
                    ]
            ) ===
                this.process.readIntPtr(
                    this.gameBase() +
                        this.offsets['osu.Game.OsuGameBase'][
                            '<SpectatorClient>k__BackingField'
                        ]
                )
        );
    }

    private checkIfReplay(address: number) {
        return (
            this.process.readIntPtr(
                address +
                    this.offsets['osu.Game.Screens.Play.Player'][
                        '<api>k__BackingField'
                    ]
            ) ===
                this.process.readIntPtr(
                    this.gameBase() +
                        this.offsets['osu.Game.OsuGameBase'][
                            '<API>k__BackingField'
                        ]
                ) &&
            this.process.readIntPtr(
                address +
                    this.offsets['osu.Game.Screens.Play.Player'][
                        '<scoreManager>k__BackingField'
                    ]
            ) ===
                this.process.readIntPtr(
                    this.gameBase() +
                        this.offsets['osu.Game.OsuGameBase'][
                            '<ScoreManager>k__BackingField'
                        ]
                )
        );
    }

    private checkIfResultScreen(address: number) {
        return (
            this.process.readIntPtr(
                address +
                    this.offsets['osu.Game.Screens.Ranking.SoloResultsScreen'][
                        '<api>k__BackingField'
                    ]
            ) ===
                this.process.readIntPtr(
                    this.gameBase() +
                        this.offsets['osu.Game.OsuGameBase'][
                            '<API>k__BackingField'
                        ]
                ) &&
            this.process.readIntPtr(
                address +
                    this.offsets['osu.Game.Screens.OsuScreen'][
                        '<logo>k__BackingField'
                    ]
            ) ===
                this.process.readIntPtr(
                    this.gameBase() + this.offsets['osu.Game.OsuGame'].osuLogo
                )
        );
    }

    private checkIfPlayerLoader(address: number) {
        return (
            this.process.readIntPtr(
                address +
                    this.offsets['osu.Game.Screens.OsuScreen'][
                        '<logo>k__BackingField'
                    ]
            ) ===
                this.process.readIntPtr(
                    this.gameBase() + this.offsets['osu.Game.OsuGame'].osuLogo
                ) &&
            this.process.readIntPtr(
                address +
                    this.offsets['osu.Game.Screens.Play.PlayerLoader'][
                        '<leaderboardManager>k__BackingField'
                    ]
            ) ===
                this.process.readIntPtr(
                    this.gameBase() +
                        this.offsets['osu.Game.OsuGameBase'][
                            '<LeaderboardManager>k__BackingField'
                        ]
                )
        );
    }

    private checkIfEditor(address: number) {
        return (
            this.process.readIntPtr(
                address +
                    this.offsets['osu.Game.Screens.Edit.Editor'][
                        '<api>k__BackingField'
                    ]
            ) ===
                this.process.readIntPtr(
                    this.gameBase() +
                        this.offsets['osu.Game.OsuGameBase'][
                            '<API>k__BackingField'
                        ]
                ) &&
            this.process.readIntPtr(
                address +
                    this.offsets['osu.Game.Screens.Edit.Editor'][
                        '<realm>k__BackingField'
                    ]
            ) ===
                this.process.readIntPtr(
                    this.gameBase() + this.offsets['osu.Game.OsuGameBase'].realm
                )
        );
    }

    private checkIfSpectator(address: number) {
        return (
            this.process.readIntPtr(address + 0x3f0) ===
                this.process.readIntPtr(
                    this.gameBase() +
                        this.offsets['osu.Game.OsuGameBase'][
                            '<API>k__BackingField'
                        ]
                ) &&
            this.process.readIntPtr(
                address +
                    this.offsets['osu.Game.Screens.Play.SpectatorPlayer'][
                        '<SpectatorClient>k__BackingField'
                    ]
            ) ===
                this.process.readIntPtr(
                    this.gameBase() +
                        this.offsets['osu.Game.OsuGameBase'][
                            '<SpectatorClient>k__BackingField'
                        ]
                ) &&
            this.process.readIntPtr(
                address +
                    this.offsets['osu.Game.Screens.Play.SpectatorPlayer'].score
            ) !==
                this.process.readIntPtr(
                    this.gameBase() +
                        this.offsets['osu.Game.OsuGameBase'][
                            '<SessionStatics>k__BackingField'
                        ]
                )
        );
    }

    private checkIfWatchingReplay(address: number) {
        const drawableRuleset = this.process.readIntPtr(
            this.player() +
                this.offsets['osu.Game.Screens.Play.Player'][
                    '<DrawableRuleset>k__BackingField'
                ]
        );
        return (
            this.process.readIntPtr(
                drawableRuleset +
                    this.offsets['osu.Game.Rulesets.UI.DrawableRuleset'][
                        '<ReplayScore>k__BackingField'
                    ]
            ) !== 0 &&
            this.process.readIntPtr(
                address +
                    this.offsets['osu.Game.Screens.Play.SpectatorPlayer'][
                        '<SpectatorClient>k__BackingField'
                    ]
            ) !==
                this.process.readIntPtr(
                    this.gameBase() +
                        this.offsets['osu.Game.OsuGameBase'][
                            '<SpectatorClient>k__BackingField'
                        ]
                )
        );
    }

    private checkIfMultiSelect(address: number) {
        const multiplayerClient = this.multiplayerClient();
        const isConnectedBindable = this.process.readIntPtr(
            multiplayerClient +
                this.offsets[
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
                this.offsets['osu.Game.Online.Multiplayer.MultiplayerClient']
                    .room
        );

        return (
            !currentRoom &&
            this.process.readIntPtr(
                address +
                    this.offsets[
                        'osu.Game.Screens.OnlinePlay.OnlinePlayScreen'
                    ]['<API>k__BackingField']
            ) ===
                this.process.readIntPtr(
                    this.gameBase() +
                        this.offsets['osu.Game.OsuGameBase'][
                            '<API>k__BackingField'
                        ]
                ) &&
            this.process.readIntPtr(
                address +
                    this.offsets[
                        'osu.Game.Screens.OnlinePlay.Multiplayer.Multiplayer'
                    ]['<client>k__BackingField']
            ) ===
                this.process.readIntPtr(
                    this.gameBase() +
                        this.offsets['osu.Game.OsuGameBase'][
                            '<MultiplayerClient>k__BackingField'
                        ]
                )
        );
    }

    private checkIfMulti() {
        const multiplayerClient = this.multiplayerClient();
        const isConnectedBindable = this.process.readIntPtr(
            multiplayerClient +
                this.offsets[
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
                this.offsets['osu.Game.Online.Multiplayer.MultiplayerClient']
                    .room
        );

        return currentRoom;
    }

    private checkIfMultiSpectator(address: number) {
        return (
            this.process.readIntPtr(
                address +
                    this.offsets['osu.Game.Screens.OsuScreen'][
                        '<logo>k__BackingField'
                    ]
            ) ===
                this.process.readIntPtr(
                    this.gameBase() + this.offsets['osu.Game.OsuGame'].osuLogo
                ) &&
            this.process.readIntPtr(
                address +
                    this.offsets['osu.Game.Screens.Spectate.SpectatorScreen'][
                        '<spectatorClient>k__BackingField'
                    ]
            ) ===
                this.process.readIntPtr(
                    this.gameBase() +
                        this.offsets['osu.Game.OsuGameBase'][
                            '<SpectatorClient>k__BackingField'
                        ]
                ) &&
            this.process.readIntPtr(
                address +
                    this.offsets[
                        'osu.Game.Screens.OnlinePlay.Multiplayer.Spectate.MultiSpectatorScreen'
                    ]['<multiplayerClient>k__BackingField']
            ) ===
                this.process.readIntPtr(
                    this.gameBase() +
                        this.offsets['osu.Game.OsuGameBase'][
                            '<MultiplayerClient>k__BackingField'
                        ]
                )
        );
    }

    private multiplayerClient() {
        return this.process.readIntPtr(
            this.gameBase() +
                this.offsets['osu.Game.OsuGameBase'][
                    '<MultiplayerClient>k__BackingField'
                ]
        );
    }

    private getCurrentScreen() {
        const screenStack = this.screenStack();

        const stack = this.process.readIntPtr(
            screenStack +
                this.offsets['osu.Framework.Screens.ScreenStack'].stack
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
                this.offsets['osu.Game.OsuGameBase'][
                    '<LocalConfig>k__BackingField'
                ]
        );

        const localValues = this.readConfigStore(localConfig, localConfigList);

        for (let i = 0; i < localConfigList.length; i++) {
            const key = localConfigList[i];
            const address = localValues[key];

            switch (key) {
                case LazerSettings.ReleaseStream:
                    config['client.branch'] = this.process.readInt(address);
                    break;

                case LazerSettings.ScoreDisplayMode:
                    this.scoringDisplayMode = this.process.readInt(address);
                    break;

                case LazerSettings.BeatmapDetailTab:
                    config.leaderboardType = this.process.readInt(address);
                    break;

                case LazerSettings.SongSelectSortingMode:
                    config.sortType = this.process.readInt(address);
                    break;

                case LazerSettings.SongSelectGroupMode:
                    config.groupType = this.process.readInt(address);
                    break;

                case LazerSettings.GameplayLeaderboard:
                    this.isLeaderboardVisible =
                        this.process.readByte(address) === 1;
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
                    config['audio.volume.masterInactive'] = fixDecimals(
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
                    config['background.video'] =
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
                this.offsets['osu.Game.OsuGame'][
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
                case FrameworkSetting.WindowMode:
                    config['resolution.fullscreen'] =
                        this.process.readInt(address) === 2;
                    break;

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
            gameBase + this.offsets['osu.Game.OsuGameBase'].rulesetConfigCache
        );

        const configCache = this.process.readIntPtr(
            rulesetConfigCache +
                this.offsets['osu.Game.Rulesets.RulesetConfigCache'].configCache
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
                this.offsets['osu.Game.Screens.Play.Player'][
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

    private readItem(
        items: number,
        index: number,
        inlined: boolean = false,
        structSize: number = 8
    ) {
        return inlined
            ? items + 0x10 + structSize * index
            : this.process.readIntPtr(items + 0x10 + structSize * index);
    }

    private readItems(
        items: number,
        size: number,
        inlined: boolean = false,
        structSize: number = 8
    ): number[] {
        const result: number[] = [];
        for (let i = 0; i < size; i++) {
            result.push(this.readItem(items, i, inlined, structSize));
        }

        return result;
    }

    private listItemsInfo(list: number) {
        let isArray = false;

        // another hacky check :D
        if (this.process.readInt(list + 0x10) > 10000000) {
            isArray = true;
        }

        const size = this.process.readInt(list + (isArray ? 0x8 : 0x10));
        const items = isArray ? list : this.process.readIntPtr(list + 0x8);

        return { size, items };
    }

    private readListItems(
        list: number,
        inlined: boolean = false,
        structSize: number = 8
    ): number[] {
        const { size, items } = this.listItemsInfo(list);
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
                    this.offsets['osu.Desktop.OsuGameDesktop'].AvailableMods
            ) + 0x20
        );

        const entries = this.process.readIntPtr(availableModsDict + 0x10);
        const count = this.process.readInt(availableModsDict + 0x38);

        return this.readItems(entries, count, false, 0x18);
    }

    private initModMapping(gamemode: Rulesets) {
        if (!ModsCategories[gamemode]) {
            wLogger.warn(`Unknown lazer game mode: %${gamemode}%`);
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
        } satisfies Record<keyof (typeof ModsCategories)[0], number[]>;

        const categories = structuredClone(ModsCategories);

        const version = this.game.version.replaceAll('.', '');
        if (isRealNumber(version) && +version <= 20261190) {
            categories[Rulesets.osu].funCategory.splice(7, 0, 'TC');
            categories[Rulesets.osu].diffIncreasingCategory.splice(6, 1);
            wLogger.debug(
                'lazer',
                this.pid,
                'initModMapping',
                `Apply mods order fix`
            );
        }

        for (const [category, mods] of Object.entries(categories[gamemode])) {
            const categoryName = category as keyof typeof modsList;

            for (let i = 0; i < mods.length; i++) {
                const mod = mods[i];
                this.modMappings.set(
                    `${gamemode}-${modsList[categoryName][i]}`,
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
                this.offsets['osu.Game.Scoring.ScoreInfo'][
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
            this.gameBase() + this.offsets['osu.Game.OsuGameBase'].beatmapClock
        );
    }

    private finalClockSource() {
        return this.process.readIntPtr(
            this.beatmapClock() +
                this.offsets['osu.Game.Beatmaps.FramedBeatmapClock']
                    .finalClockSource
        );
    }

    private currentTime() {
        return this.process.readDouble(
            this.finalClockSource() +
                this.offsets['osu.Framework.Timing.FramedClock'][
                    '<CurrentTime>k__BackingField'
                ]
        );
    }

    private basePath() {
        const storage = this.process.readIntPtr(
            this.gameBase() +
                this.offsets['osu.Game.OsuGameBase']['<Storage>k__BackingField']
        );
        const underlyingStorage = this.process.readIntPtr(
            storage +
                this.offsets['osu.Game.IO.WrappedStorage'][
                    '<UnderlyingStorage>k__BackingField'
                ]
        );

        return this.process.readSharpStringPtr(
            underlyingStorage +
                this.offsets['osu.Framework.Platform.Storage'][
                    '<BasePath>k__BackingField'
                ]
        );
    }

    private currentBeatmap() {
        const bindable = this.process.readIntPtr(
            this.gameBase() +
                this.offsets['osu.Game.OsuGameBase']['<Beatmap>k__BackingField']
        );
        const workingBeatmap = this.process.readIntPtr(bindable + 0x20);

        const beatmapInfo = this.process.readIntPtr(
            workingBeatmap +
                this.offsets[
                    'osu.Game.Beatmaps.WorkingBeatmapCache+BeatmapManagerWorkingBeatmap'
                ].BeatmapInfo
        );
        const beatmapSetInfo = this.process.readIntPtr(
            workingBeatmap +
                this.offsets[
                    'osu.Game.Beatmaps.WorkingBeatmapCache+BeatmapManagerWorkingBeatmap'
                ].BeatmapSetInfo
        );

        return { info: beatmapInfo, setInfo: beatmapSetInfo };
    }

    private getBeatmapFiles(beatmapSetInfo: number): Record<string, string> {
        const result: Record<string, string> = {};

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

            statistics[LazerHitResults[key] as keyof Statistics] = value;
        }

        return statistics;
    }

    private readStatistics(scoreInfo: number): Statistics {
        const statisticsDict = this.process.readIntPtr(
            scoreInfo + this.offsets['osu.Game.Scoring.ScoreInfo'].statistics
        );

        return this.readStatisticsDict(statisticsDict);
    }

    private readMaximumStatistics(scoreInfo: number): Statistics {
        const statisticsDict = this.process.readIntPtr(
            scoreInfo +
                this.offsets['osu.Game.Scoring.ScoreInfo'].maximumStatistics
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
                this.offsets['osu.Game.Scoring.ScoreInfo'][
                    '<RealmUser>k__BackingField'
                ]
        );
        const username = this.process.readSharpStringPtr(
            realmUser +
                this.offsets['osu.Game.Models.RealmUser'][
                    '<Username>k__BackingField'
                ]
        );
        const userId = this.process.readInt(
            realmUser +
                this.offsets['osu.Game.Models.RealmUser'][
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
                    this.offsets['osu.Game.Scoring.ScoreInfo'][
                        '<TotalScore>k__BackingField'
                    ]
            ),
            statistics,
            accuracy:
                this.process.readDouble(
                    scoreInfo +
                        this.offsets['osu.Game.Scoring.ScoreInfo'][
                            '<Accuracy>k__BackingField'
                        ]
                ) * 100,
            combo: this.process.readInt(
                scoreInfo +
                    this.offsets['osu.Game.Scoring.ScoreInfo'][
                        '<Combo>k__BackingField'
                    ]
            ),
            maxCombo: this.process.readInt(
                scoreInfo +
                    this.offsets['osu.Game.Scoring.ScoreInfo'][
                        '<MaxCombo>k__BackingField'
                    ]
            ),
            team: 0,
            isPassing:
                this.process.readByte(
                    scoreInfo +
                        this.offsets['osu.Game.Scoring.ScoreInfo'][
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

            const key = LazerHitResults[kvp[0] as keyof typeof LazerHitResults];
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
    ): IScore {
        const statistics = this.readStatistics(scoreInfo);
        const maximumStatistics = this.readMaximumStatistics(scoreInfo);

        const mods = this.mods(scoreInfo);

        const realmUser = this.process.readIntPtr(
            scoreInfo +
                this.offsets['osu.Game.Scoring.ScoreInfo'][
                    '<RealmUser>k__BackingField'
                ]
        );
        const ruleset = this.process.readIntPtr(
            scoreInfo +
                this.offsets['osu.Game.Scoring.ScoreInfo'][
                    '<Ruleset>k__BackingField'
                ]
        );
        const mode = this.process.readInt(
            ruleset +
                this.offsets['osu.Game.Rulesets.RulesetInfo'][
                    '<OnlineID>k__BackingField'
                ]
        );

        let username = this.process.readSharpStringPtr(
            realmUser +
                this.offsets['osu.Game.Models.RealmUser'][
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
                    this.offsets['osu.Game.Screens.Play.Player'][
                        '<ScoreProcessor>k__BackingField'
                    ]
            );

            const comboBindable = this.process.readIntPtr(
                scoreProcessor +
                    this.offsets[
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
                this.offsets['osu.Game.Scoring.ScoreInfo'][
                    '<TotalScore>k__BackingField'
                ]
        );
        if (this.scoringDisplayMode === ScoringMode.classic) {
            const objectCount =
                this.getObjectCountFromMaxStatistics(maximumStatistics);
            score = this.getDisplayScore(mode, score, objectCount);
        }

        return {
            failed: health <= 0,
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
                        this.offsets['osu.Game.Scoring.ScoreInfo'][
                            '<Accuracy>k__BackingField'
                        ]
                ) * 100,
            statistics,
            maximumStatistics,
            combo,
            maxCombo: this.process.readInt(
                scoreInfo +
                    this.offsets['osu.Game.Scoring.ScoreInfo'][
                        '<MaxCombo>k__BackingField'
                    ]
            )
        };
    }

    getScanPatterns(): ScanPatterns {
        return this.scanPatterns;
    }

    audioVelocityBase(): IAudioVelocityBase {
        const osuLogo = this.process.readIntPtr(
            this.gameBase() + this.offsets['osu.Game.OsuGame'].osuLogo
        );

        const visualizer = this.process.readIntPtr(
            osuLogo + this.offsets['osu.Game.Screens.Menu.OsuLogo'].visualizer
        );

        const frequencyAmplitudes = this.process.readIntPtr(
            visualizer +
                this.offsets['osu.Game.Screens.Menu.LogoVisualisation']
                    .frequencyAmplitudes
        );

        const result: number[] = [];
        for (let i = 0; i < 40; i++) {
            result.push(
                this.process.readFloat(frequencyAmplitudes + 0x10 + 0x4 * i)
            );
        }
        return result;
    }

    readUser(user: number) {
        const userId = this.process.readInt(
            user +
                this.offsets['osu.Game.Online.API.Requests.Responses.APIUser'][
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
                this.offsets['osu.Game.Online.API.Requests.Responses.APIUser']
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
                this.offsets['osu.Game.Users.UserStatistics'].PP +
                0x8;

            // TODO: read ulong instead long
            pp = numberFromDecimal(
                this.process.readLong(ppDecimal + 0x8),
                this.process.readUInt(ppDecimal + 0x4),
                this.process.readInt(ppDecimal)
            );

            accuracy = this.process.readDouble(
                statistics +
                    this.offsets['osu.Game.Users.UserStatistics'].Accuracy
            );
            rankedScore = this.process.readLong(
                statistics +
                    this.offsets['osu.Game.Users.UserStatistics'].RankedScore
            );
            level = this.process.readInt(
                statistics + this.offsets['osu.Game.Users.UserStatistics'].Level
            );
            playCount = this.process.readInt(
                statistics +
                    this.offsets['osu.Game.Users.UserStatistics'].PlayCount
            );
            rank = this.process.readInt(
                statistics +
                    this.offsets['osu.Game.Users.UserStatistics'].GlobalRank +
                    0x4
            );
        }

        let gamemode =
            Rulesets[
                this.process.readSharpStringPtr(
                    user +
                        this.offsets[
                            'osu.Game.Online.API.Requests.Responses.APIMe'
                        ].PlayMode
                ) as keyof typeof Rulesets
            ];

        if (gamemode === undefined) {
            gamemode = Rulesets.osu;
        }

        return {
            id: userId,
            name: this.process.readSharpStringPtr(
                user +
                    this.offsets[
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
                                this.offsets[
                                    'osu.Game.Online.API.Requests.Responses.APIUser'
                                ].countryCodeString
                        )
                        .toLowerCase() as keyof typeof CountryCodes
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
                this.offsets['osu.Game.OsuGameBase']['<API>k__BackingField']
        );

        const localUserState = this.process.readIntPtr(
            api + this.offsets['osu.Game.Online.API.APIAccess'].localUserState
        );

        const userBindable = this.process.readIntPtr(
            localUserState +
                this.offsets['osu.Game.Online.API.LocalUserState'].localUser
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
            accuracy: score.accuracy,
            maxCombo: score.maxCombo,
            score: score.score,
            statistics: score.statistics,
            maximumStatistics: score.maximumStatistics,
            date
        };
    }

    resultScreen(): IResultScreen {
        const selectedScoreBindable = this.process.readIntPtr(
            this.currentScreen +
                this.offsets['osu.Game.Screens.Ranking.SoloResultsScreen']
                    .SelectedScore
        );

        const scoreInfo = this.process.readIntPtr(selectedScoreBindable + 0x20);

        const onlineId = Math.max(
            this.process.readLong(
                scoreInfo +
                    this.offsets['osu.Game.Scoring.ScoreInfo'][
                        '<OnlineID>k__BackingField'
                    ]
            ),
            this.process.readLong(
                scoreInfo +
                    this.offsets['osu.Game.Scoring.ScoreInfo'][
                        '<LegacyOnlineID>k__BackingField'
                    ]
            )
        );

        const scoreDate =
            scoreInfo +
            this.offsets['osu.Game.Scoring.ScoreInfo']['<Date>k__BackingField'];

        return this.buildResultScreen(
            scoreInfo,
            onlineId,
            netDateBinaryToDate(
                this.process.readInt(scoreDate + 0x8 + 0x4),
                this.process.readInt(scoreDate + 0x8)
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
                this.offsets['osu.Game.Screens.Play.Player'][
                    '<HealthProcessor>k__BackingField'
                ]
        );

        const healthBindable = this.process.readIntPtr(
            healthProcessor +
                this.offsets['osu.Game.Rulesets.Osu.Scoring.OsuHealthProcessor']
                    .Health
        );
        const health = this.process.readDouble(healthBindable + 0x40); // 0..1

        return this.readScore(
            scoreInfo,
            health * 200,
            this.process.readInt(
                player +
                    this.offsets['osu.Game.Screens.Play.SoloPlayer']
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

    keyOverlay(): IKeyOverlay {
        try {
            if (this.isPlayerLoading) {
                return [];
            }

            const player = this.player();

            const hudOverlay = this.process.readIntPtr(
                player +
                    this.offsets['osu.Game.Screens.Play.Player'][
                        '<HUDOverlay>k__BackingField'
                    ]
            );

            const inputController = this.process.readIntPtr(
                hudOverlay +
                    this.offsets['osu.Game.Screens.Play.HUDOverlay']
                        .InputCountController
            );

            const triggersBindable = this.process.readIntPtr(
                inputController +
                    this.offsets[
                        'osu.Game.Screens.Play.HUD.InputCountController'
                    ].triggers
            );

            const triggerCollection = this.process.readIntPtr(
                triggersBindable + 0x18
            );

            const triggers = this.readListItems(triggerCollection);

            const keyCounters: KeyOverlayButton[] = [];

            for (let i = 0; i < triggers.length; i++) {
                const keyTrigger: KeyCounter = this.readKeyTrigger(triggers[i]);

                keyCounters.push({
                    name: `B${i + 1}`,
                    isPressed: keyTrigger.isPressed,
                    count: keyTrigger.count
                });
            }

            return keyCounters;
        } catch (error) {
            return error as Error;
        }
    }

    private readOsuHit(address: number, object: number): number | undefined {
        // These might potentially change
        const sliderHeadCircleBaseSize = 0xe8;
        const hitCircleBaseSize = 0xe0;

        const type = this.process.readIntPtr(object);
        const baseSize = this.process.readInt(type + 0x4);

        if (
            baseSize !== sliderHeadCircleBaseSize &&
            baseSize !== hitCircleBaseSize
        ) {
            return;
        }

        const hitResult = this.process.readInt(address + 0x18);
        switch (hitResult) {
            case LazerHitResults.great:
            case LazerHitResults.ok:
            case LazerHitResults.meh:
            case LazerHitResults.largeTickHit:
                break;

            default:
                return;
        }

        const timeOffset = this.process.readDouble(address + 0x10);
        return timeOffset;
    }

    private readManiaHit(address: number, object: number): number | undefined {
        const headNote = 0x58;
        const holdNote = 0x88;

        const type = this.process.readIntPtr(object);
        const baseSize = this.process.readInt(type + 0x4);

        if (baseSize !== headNote && baseSize !== holdNote) {
            return;
        }

        const hitResult = this.process.readInt(address + 0x18);
        switch (hitResult) {
            case LazerHitResults.perfect:
            case LazerHitResults.great:
            case LazerHitResults.good:
            case LazerHitResults.ok:
            case LazerHitResults.meh:
                break;

            default:
                return;
        }

        const timeOffset = this.process.readDouble(address + 0x10);
        return timeOffset;
    }

    private readTaikoHit(address: number, object: number): number | undefined {
        const hit = 0x68;
        const strongNestedHit = 0x50;

        const type = this.process.readIntPtr(object);
        const baseSize = this.process.readInt(type + 0x4);

        if (baseSize !== hit && baseSize !== strongNestedHit) {
            return;
        }

        const hitResult = this.process.readInt(address + 0x18);
        switch (hitResult) {
            case LazerHitResults.great:
            case LazerHitResults.ok:
            case LazerHitResults.meh:
                break;

            default:
                return;
        }

        const timeOffset = this.process.readDouble(address + 0x10);
        return timeOffset;
    }

    private readHitEvent(address: number): number | undefined {
        const hitObject = this.process.readIntPtr(address);
        if (!hitObject) {
            return undefined;
        }

        if (this.selectedGamemode === Rulesets.osu) {
            const offset = this.readOsuHit(address, hitObject);
            return offset;
        } else if (this.selectedGamemode === Rulesets.fruits) {
            return undefined; // catch doesnt have hit errors
        } else if (this.selectedGamemode === Rulesets.mania) {
            const offset = this.readManiaHit(address, hitObject);
            return offset;
        } else if (this.selectedGamemode === Rulesets.taiko) {
            const offset = this.readTaikoHit(address, hitObject);
            return offset;
        }

        return undefined;
    }

    private hitEvents(last: number) {
        const player = this.player();
        const scoreProcessor = this.process.readIntPtr(
            player +
                this.offsets['osu.Game.Screens.Play.Player'][
                    '<ScoreProcessor>k__BackingField'
                ]
        );
        const hitEventsList = this.process.readIntPtr(
            scoreProcessor +
                this.offsets['osu.Game.Rulesets.Scoring.ScoreProcessor']
                    .hitEvents
        );
        const { size, items } = this.listItemsInfo(hitEventsList);

        const result: number[] = [];
        let index = last;
        for (let i = last; i < size; i++) {
            const item = this.readItem(items, i, true, 0x40);
            const error = this.readHitEvent(item);
            if (error === undefined) {
                index = i;
                continue;
            }
            if (error < -500 || error > 500) break; // sometimes it returns number over a 1m and we dont need that

            result.push(error);
            index = i + 1;
        }

        return { index, array: result };
    }

    hitErrors(last: number): IHitErrors {
        if (this.isPlayerLoading) {
            return { index: 0, array: [] };
        }

        return this.hitEvents(last);
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
                const settings: any = {};
                const restartBindable = this.process.readIntPtr(
                    modObject + 0x10
                );

                const failOnSliderTailBindable = this.process.readIntPtr(
                    modObject + 0x20
                );

                if (this.selectedGamemode === 0) {
                    settings.fail_on_slider_tail =
                        this.process.readByte(
                            failOnSliderTailBindable + 0x40
                        ) === 1;
                }

                settings.restart =
                    this.process.readByte(restartBindable + 0x40) === 1;

                mod.settings = settings;
                break;
            }
            case 'PF': {
                const settings: any = {};
                const restartBindable = this.process.readIntPtr(
                    modObject + 0x10
                );

                const requirePerfectHitsBindable = this.process.readIntPtr(
                    modObject + 0x20
                );

                if (this.selectedGamemode === 3) {
                    settings.require_perfect_hits =
                        this.process.readByte(
                            requirePerfectHitsBindable + 0x40
                        ) === 1;
                }

                settings.restart =
                    this.process.readByte(restartBindable + 0x40) === 1;

                mod.settings = settings;
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

                const odOffset = this.selectedGamemode === 3 ? 0x28 : 0x18;

                const drainRateBindable = this.process.readIntPtr(
                    modObject + 0x10
                );
                const overallDifficultyBindable = this.process.readIntPtr(
                    modObject + odOffset
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
                if (this.selectedGamemode !== 0) break;
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
                    direction: `${this.process.readInt(directionBindable + 0x40)}`
                };
                break;
            }
            case 'AD': {
                const scaleBindable = this.process.readIntPtr(modObject + 0x10);
                const styleBindable = this.process.readIntPtr(modObject + 0x18);

                mod.settings = {
                    scale: this.process.readFloat(scaleBindable + 0x40),
                    style: `${this.process.readInt(styleBindable + 0x40)}`
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
                    direction: `${this.process.readInt(directionBindable + 0x40)}`
                };
                break;
            }
            case 'BM': {
                const maxSizeComboCountBindable = this.process.readIntPtr(
                    modObject + 0x20
                );
                const maxCursorSizeBindable = this.process.readIntPtr(
                    modObject + 0x28
                );

                mod.settings = {
                    max_size_combo_count: this.process.readInt(
                        maxSizeComboCountBindable + 0x40
                    ),
                    max_cursor_size: this.process.readFloat(
                        maxCursorSizeBindable + 0x40
                    )
                };

                break;
            }
            case 'SR': {
                const oneThirdConversionBindable = this.process.readIntPtr(
                    modObject + 0x10
                );
                const oneSixthConversionBindable = this.process.readIntPtr(
                    modObject + 0x18
                );
                const oneEighthConversionBindable = this.process.readIntPtr(
                    modObject + 0x20
                );

                mod.settings = {
                    one_third_conversion:
                        this.process.readByte(
                            oneThirdConversionBindable + 0x40
                        ) === 1,
                    one_sixth_conversion:
                        this.process.readByte(
                            oneSixthConversionBindable + 0x40
                        ) === 1,
                    one_eighth_conversion:
                        this.process.readByte(
                            oneEighthConversionBindable + 0x40
                        ) === 1
                };

                break;
            }
        }

        return mod;
    }

    private readGamemode() {
        const rulesetBindable = this.process.readIntPtr(
            this.gameBase() + this.offsets['osu.Desktop.OsuGameDesktop'].Ruleset
        );
        const rulesetInfo = this.process.readIntPtr(rulesetBindable + 0x20);

        const gamemode = this.process.readInt(
            rulesetInfo +
                this.offsets['osu.Game.Rulesets.RulesetInfo'][
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
                    `%${ClientType[this.game.client]}%`,
                    `Error initializing mod mapping:`,
                    (exc as Error).message
                );
                wLogger.debug(
                    `%${ClientType[this.game.client]}%`,
                    `Error initializing mod mapping:`,
                    exc
                );
            }
        }

        this.currentScreen = this.getCurrentScreen();

        const selectedModsBindable = this.process.readIntPtr(
            this.gameBase() +
                this.offsets['osu.Desktop.OsuGameDesktop'].SelectedMods
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

        let isMultiSpectating = false;
        if (this.status === GameState.lobby) {
            isMultiSpectating = this.checkIfMultiSpectator(this.currentScreen);
        }

        if (isPlaying) {
            const hudOverlay = this.process.readIntPtr(
                this.player() +
                    this.offsets['osu.Game.Screens.Play.Player'][
                        '<HUDOverlay>k__BackingField'
                    ]
            );

            const showHudBindable = this.process.readIntPtr(
                hudOverlay +
                    this.offsets['osu.Game.Screens.Play.HUDOverlay'][
                        '<ShowHud>k__BackingField'
                    ]
            );

            this.showInterface =
                this.process.readByte(showHudBindable + 0x40) === 1;
        }

        const chatOverlay = this.process.readIntPtr(
            this.gameBase() + this.offsets['osu.Game.OsuGame'].chatOverlay
        );

        const stateBindable = this.process.readIntPtr(
            chatOverlay + this.offsets['osu.Game.Overlays.ChatOverlay'].State
        );

        const chatStatus = this.process.readInt(stateBindable + 0x40);

        return {
            isWatchingReplay: this.watchingReplay,
            isReplayUiHidden: !this.ReplaySettingsOverlay,
            showInterface: this.showInterface,
            chatStatus,
            isMultiSpectating,
            gameTime: 0,
            menuMods: this.menuMods,
            skinFolder: '',
            memorySongsFolder: filesFolder
        };
    }

    globalPrecise(): IGlobalPrecise {
        let status = 0;

        const isResultScreen = this.checkIfResultScreen(this.currentScreen);
        const isSongSelectV2 = this.checkIfSongSelectV2(this.currentScreen);
        const isPlayerLoader = this.checkIfPlayerLoader(this.currentScreen);
        const isEditor = this.checkIfEditor(this.currentScreen);
        const isMultiSelect = this.checkIfMultiSelect(this.currentScreen);
        const isMulti = this.checkIfMulti();

        const isPlayer = this.player() !== 0;
        const isPlaying = isPlayer || isPlayerLoader;
        if (isPlaying) {
            const isSpectator = this.checkIfSpectator(this.currentScreen);
            const isReplay = isPlayer
                ? this.checkIfWatchingReplay(this.currentScreen)
                : false;

            if (isReplay && isSpectator) {
                this.watchingReplay = false;
                this.spectating = true;
            } else if (isReplay) {
                this.watchingReplay = true;
                this.spectating = false;
            }

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
                    this.offsets[
                        'osu.Game.Online.Multiplayer.MultiplayerClient'
                    ].room
            );

            if (currentRoom) {
                status = GameState.lobby;
            }
        }

        if (!isPlaying) {
            this.spectating = this.watchingReplay = false;
        }

        this.status = status;
        this.isPlayerLoading = isPlayerLoader;

        return {
            status,
            time: Math.round(this.currentTime())
        };
    }

    menu(previousChecksum: string): IMenu {
        const beatmap = this.currentBeatmap();

        const checksum = this.process.readSharpStringPtr(
            beatmap.info +
                this.offsets['osu.Game.Beatmaps.BeatmapInfo'][
                    '<MD5Hash>k__BackingField'
                ]
        );

        const gamemode = this.readGamemode();
        const rankedStatus = Number(
            this.lazerToStableStatus[
                this.process.readInt(
                    beatmap.info +
                        this.offsets['osu.Game.Beatmaps.BeatmapInfo'][
                            '<StatusInt>k__BackingField'
                        ]
                ) as keyof typeof this.lazerToStableStatus
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
                this.offsets['osu.Game.Beatmaps.BeatmapInfo'][
                    '<Metadata>k__BackingField'
                ]
        );
        const difficulty = this.process.readIntPtr(
            beatmap.info +
                this.offsets['osu.Game.Beatmaps.BeatmapInfo'][
                    '<Difficulty>k__BackingField'
                ]
        );
        const hash = this.process.readSharpStringPtr(
            beatmap.info +
                this.offsets['osu.Game.Beatmaps.BeatmapInfo'][
                    '<Hash>k__BackingField'
                ]
        );
        const author = this.process.readIntPtr(
            metadata +
                this.offsets['osu.Game.Beatmaps.BeatmapMetadata'][
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
                        this.offsets['osu.Game.Beatmaps.BeatmapMetadata'][
                            '<AudioFile>k__BackingField'
                        ]
                )
            ];
        const backgroundFileHash =
            files[
                this.process.readSharpStringPtr(
                    metadata +
                        this.offsets['osu.Game.Beatmaps.BeatmapMetadata'][
                            '<BackgroundFile>k__BackingField'
                        ]
                )
            ];

        const difficultyName = this.process.readSharpStringPtr(
            beatmap.info +
                this.offsets['osu.Game.Beatmaps.BeatmapInfo'][
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
                    this.offsets['osu.Game.Beatmaps.BeatmapMetadata'][
                        '<Title>k__BackingField'
                    ]
            ),
            titleOriginal: this.process.readSharpStringPtr(
                metadata +
                    this.offsets['osu.Game.Beatmaps.BeatmapMetadata'][
                        '<TitleUnicode>k__BackingField'
                    ]
            ),
            artist: this.process.readSharpStringPtr(
                metadata +
                    this.offsets['osu.Game.Beatmaps.BeatmapMetadata'][
                        '<Artist>k__BackingField'
                    ]
            ),
            artistOriginal: this.process.readSharpStringPtr(
                metadata +
                    this.offsets['osu.Game.Beatmaps.BeatmapMetadata'][
                        '<ArtistUnicode>k__BackingField'
                    ]
            ),
            ar: this.process.readFloat(
                difficulty +
                    this.offsets['osu.Game.Beatmaps.BeatmapDifficulty'][
                        '<ApproachRate>k__BackingField'
                    ]
            ),
            cs: this.process.readFloat(
                difficulty +
                    this.offsets['osu.Game.Beatmaps.BeatmapDifficulty'][
                        '<CircleSize>k__BackingField'
                    ]
            ),
            hp: this.process.readFloat(
                difficulty +
                    this.offsets['osu.Game.Beatmaps.BeatmapDifficulty'][
                        '<DrainRate>k__BackingField'
                    ]
            ),
            od: this.process.readFloat(
                difficulty +
                    this.offsets['osu.Game.Beatmaps.BeatmapDifficulty'][
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
                    this.offsets['osu.Game.Models.RealmUser'][
                        '<Username>k__BackingField'
                    ]
            ),
            difficulty: difficultyName,
            mapID: this.process.readInt(
                beatmap.info +
                    this.offsets['osu.Game.Beatmaps.BeatmapInfo'][
                        '<OnlineID>k__BackingField'
                    ]
            ),
            setID: this.process.readInt(
                beatmap.setInfo +
                    this.offsets['osu.Game.Beatmaps.BeatmapSetInfo'][
                        '<OnlineID>k__BackingField'
                    ]
            ),
            rankedStatus,
            objectCount: this.process.readInt(
                beatmap.info +
                    this.offsets['osu.Game.Beatmaps.BeatmapInfo'][
                        '<TotalObjectCount>k__BackingField'
                    ]
            )
        };
    }

    mp3Length(): IMP3Length {
        const beatmapClock = this.beatmapClock();
        const decoupledTrack = this.process.readIntPtr(
            beatmapClock +
                this.offsets['osu.Game.Beatmaps.FramedBeatmapClock']
                    .decoupledTrack
        );
        const sourceTrack = this.process.readIntPtr(
            decoupledTrack +
                this.offsets['osu.Framework.Timing.DecouplingFramedClock'][
                    '<Source>k__BackingField'
                ]
        );

        return Math.round(
            this.process.readDouble(
                sourceTrack +
                    this.offsets['osu.Framework.Audio.Track.Track'].length
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

        return [this.isLeaderboardVisible, personalScore, []];
    }

    readSpectatingData(): ILazerSpectator {
        const multiSpectatorScreen = this.currentScreen;

        const spectatingClients: ILazerSpectatorEntry[] = [];

        const gameplayStates = this.process.readIntPtr(
            multiSpectatorScreen +
                this.offsets['osu.Game.Screens.Spectate.SpectatorScreen']
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
                this.offsets['osu.Game.Online.Multiplayer.MultiplayerClient']
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
                    this.offsets[
                        'osu.Game.Online.Multiplayer.MultiplayerRoomUser'
                    ].UserID
            );
            const matchState = this.process.readIntPtr(
                current +
                    this.offsets[
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
                    this.offsets[
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
                scoreInfo + this.offsets['osu.Game.Scoring.ScoreInfo'].user
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

        const channelId = this.process.readInt(
            room +
                this.offsets['osu.Game.Online.Multiplayer.MultiplayerRoom'][
                    '<ChannelID>k__BackingField'
                ]
        );
        const channelManager = this.process.readIntPtr(
            this.gameBase() + this.offsets['osu.Game.OsuGame'].channelManager
        );

        const joinedChannels = this.process.readIntPtr(
            channelManager +
                this.offsets['osu.Game.Online.Chat.ChannelManager']
                    .joinedChannels
        );
        const collection = this.process.readIntPtr(joinedChannels + 0x18);
        const channelList = this.readListItems(collection);

        let multiChannel = 0;

        for (const channel of channelList) {
            const iterChannelId = this.process.readLong(
                channel + this.offsets['osu.Game.Online.Chat.Channel'].Id
            );

            if (iterChannelId === channelId) {
                multiChannel = channel;
                break;
            }
        }

        if (multiChannel === 0) {
            return { chat: [], spectatingClients };
        }

        const chatItems: ITourneyManagerChatItem[] = [];

        const messagesSortedList = this.process.readIntPtr(
            multiChannel + this.offsets['osu.Game.Online.Chat.Channel'].Messages
        );
        const messageList = this.readListItems(
            this.process.readIntPtr(messagesSortedList + 0x8)
        );

        for (const message of messageList) {
            const dateTime =
                message +
                this.offsets['osu.Game.Online.Chat.Message'].Timestamp +
                0x8; // dateTime offset

            const date = netDateBinaryToDate(
                this.process.readInt(dateTime + 0x4),
                this.process.readInt(dateTime)
            );

            const content = this.process.readSharpStringPtr(
                message + this.offsets['osu.Game.Online.Chat.Message'].Content
            );

            const apiUser = this.readUser(
                this.process.readIntPtr(
                    message +
                        this.offsets['osu.Game.Online.Chat.Message'].Sender
                )
            );

            if (!config.showMpCommands && content.startsWith('!mp')) {
                continue;
            }

            chatItems.push({
                time: date.toISOString(),
                name: apiUser.name,
                content
            });
        }

        return { chat: chatItems, spectatingClients };
    }

    settings(): ISettings {
        const values = this.osuConfig();
        values['client.version'] = (this.game as LazerInstance).version;

        try {
            const skinManager = this.process.readIntPtr(
                this.gameBaseAddress +
                    this.offsets['osu.Game.OsuGameBase'][
                        '<SkinManager>k__BackingField'
                    ]
            );
            const currentSkin = this.process.readIntPtr(
                skinManager +
                    this.offsets['osu.Game.Skinning.SkinManager'].CurrentSkin
            );
            const value = this.process.readIntPtr(currentSkin + 0x20);
            const name = this.process.readSharpStringPtr(
                value +
                    this.offsets['osu.Game.Skinning.Skin'][
                        '<Name>k__BackingField'
                    ]
            );

            values['skin.name'] = name;

            this.game.resetReportCount('settings skin');
        } catch (exc) {
            this.game.reportError(
                'settings skin',
                10,
                `%${ClientType[this.game.client]}%`,
                `Error reading skin name`,
                (exc as Error).message
            );
            wLogger.debug(
                `%${ClientType[this.game.client]}%`,
                `Error reading skin name`,
                exc
            );
        }

        const platform = platformResolver(process.platform);
        if (platform.type === 'windows') {
            try {
                const host = this.process.readIntPtr(
                    this.gameBaseAddress +
                        this.offsets['osu.Framework.Game'][
                            '<Host>k__BackingField'
                        ]
                );
                const inputConfig = this.process.readIntPtr(
                    host +
                        this.offsets['osu.Framework.Platform.GameHost'][
                            '<inputConfig>k__BackingField'
                        ]
                );
                const inputHandlers = this.process.readIntPtr(
                    inputConfig +
                        this.offsets[
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
                                this.offsets[
                                    'osu.Framework.Input.Handlers.Tablet.OpenTabletDriverHandler'
                                ]['<AreaOffset>k__BackingField']
                        );
                        const areaX = this.process.readFloat(areaOffset + 0x44);
                        const areaY = this.process.readFloat(areaOffset + 0x48);

                        const areaSize = this.process.readIntPtr(
                            current +
                                this.offsets[
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
                                    this.offsets[
                                        'osu.Framework.Input.Handlers.Tablet.OpenTabletDriverHandler'
                                    ]['<Rotation>k__BackingField']
                            ) + 0x40
                        );
                        const pressureThreshold = this.process.readFloat(
                            this.process.readIntPtr(
                                current +
                                    this.offsets[
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
                                        this.offsets[
                                            'osu.Framework.Input.Handlers.Mouse.MouseHandler'
                                        ]['<UseRelativeMode>k__BackingField']
                                ) + 0x40
                            ) === 1;
                        values['mouse.rawInput'] = userRelativeMode;
                    }
                }

                this.game.resetReportCount('settings devices');
            } catch (exc) {
                this.game.reportError(
                    'settings devices',
                    10,
                    `%${ClientType[this.game.client]}%`,
                    `Error reading settings`,
                    (exc as Error).message
                );
                wLogger.debug(
                    `%${ClientType[this.game.client]}%`,
                    `Error reading settings`,
                    exc
                );
            }
        }

        return values;
    }
}
