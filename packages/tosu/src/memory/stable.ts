import {
    ClientType,
    GameState,
    config,
    isAllowedValue,
    wLogger
} from '@tosu/common';
import { getContentType } from '@tosu/server';

import { AbstractMemory } from '@/memory';
import type {
    IAudioVelocityBase,
    IBindingValue,
    IConfigValue,
    IGameplay,
    IGlobal,
    IGlobalPrecise,
    IHitErrors,
    IKeyOverlay,
    ILeaderboard,
    IMP3Length,
    IMenu,
    IOffsets,
    IResultScreen,
    ISettings,
    ITourney,
    ITourneyChat,
    ITourneyUser,
    IUser,
    ScanPatterns
} from '@/memory/types';
import { defaultStatistics } from '@/states/gameplay';
import type { ITourneyManagerChatItem } from '@/states/tourney';
import { LeaderboardPlayer } from '@/states/types';
import { Bindings, VirtualKeyCode } from '@/utils/bindings';
import { calculateAccuracy } from '@/utils/calculators';
import { netDateBinaryToDate } from '@/utils/converters';
import { calculateMods, defaultCalculatedMods } from '@/utils/osuMods';
import type {
    BindingsList,
    ConfigList,
    SettingsObject
} from '@/utils/settings.types';

export type OsuPatternData = {
    baseAddr: number;
    playTimeAddr: number;
    chatCheckerPtr: number;
    skinDataAddr: number;
    settingsClassAddr: number;
    configurationAddr: number;
    bindingsAddr: number;
    rulesetsAddr: number;
    canRunSlowlyAddr: number;
    statusPtr: number;
    menuModsPtr: number;
    getAudioLengthPtr: number;
    userProfilePtr: number;
    rawLoginStatusPtr: number;
    spectatingUserPtr: number;
    gameTimePtr: number;
};

const configList: ConfigList = {
    VolumeUniversal: ['int', 'audio.volume.master'],
    VolumeEffect: ['int', 'audio.volume.effect'],
    VolumeMusic: ['int', 'audio.volume.music'],
    _ReleaseStream: ['enum', 'client.branch'],
    DimLevel: ['int', 'background.dim'],
    ShowStoryboard: ['bool', 'background.storyboard'],
    ScoreMeter: ['enum', 'scoreMeter.type'],
    ScoreMeterScale: ['double', 'scoreMeter.size'],
    Offset: ['int', 'audio.offset.universal'],
    CursorSize: ['double', 'cursor.size'],
    MouseSpeed: ['double', 'mouse.sensitivity'],
    Fullscreen: ['bool', 'resolution.fullscreen'],
    Width: ['int', 'resolution.width'],
    Height: ['int', 'resolution.height'],
    WidthFullscreen: ['int', 'resolution.widthFullscreen'],
    HeightFullscreen: ['int', 'resolution.heightFullscreen'],
    AutomaticCursorSizing: ['bool', 'cursor.autoSize'],
    IgnoreBeatmapSamples: ['bool', 'audio.ignoreBeatmapSounds'],
    SkinSamples: ['bool', 'audio.useSkinSamples'],
    LastVersion: ['bstring', 'client.version'],
    ManiaSpeed: ['int', 'mania.scrollSpeed'],
    ManiaSpeedBPMScale: ['bool', 'mania.speedBPMScale'],
    UsePerBeatmapManiaSpeed: ['bool', 'mania.usePerBeatmapSpeedScale'],
    MouseDisableButtons: ['bool', 'mouse.disableButtons'],
    MouseDisableWheel: ['bool', 'mouse.disableWheel'],
    ProgressBarType: ['enum', 'progressBarType'],
    RankType: ['enum', 'leaderboardType'],
    UpdatePending: ['bool', 'client.updateAvailable'],

    UseSkinCursor: ['bool', 'cursor.useSkinCursor'],
    RawInput: ['bool', 'mouse.rawInput'],
    TreeSortMode: ['enum', 'groupType'],
    TreeSortMode2: ['enum', 'sortType'],
    EditorDefaultSkin: ['bool', 'skin.useDefaultSkinInEditor'],
    ComboColourSliderBall: ['bool', 'skin.tintSliderBall'],
    IgnoreBeatmapSkins: ['bool', 'skin.ignoreBeatmapSkins'],
    Skin: ['bstring', 'skin.name'],
    UseTaikoSkin: ['bool', 'skin.useTaikoSkin']
};

const bindingList: BindingsList = {
    [Bindings.OsuLeft]: ['int', 'keybinds.osu.k1'],
    [Bindings.OsuRight]: ['int', 'keybinds.osu.k2'],
    [Bindings.OsuSmoke]: ['int', 'keybinds.osu.smokeKey'],
    [Bindings.FruitsDash]: ['int', 'keybinds.fruits.Dash'],
    [Bindings.FruitsLeft]: ['int', 'keybinds.fruits.k1'],
    [Bindings.FruitsRight]: ['int', 'keybinds.fruits.k2'],
    [Bindings.TaikoInnerLeft]: ['int', 'keybinds.taiko.innerLeft'],
    [Bindings.TaikoInnerRight]: ['int', 'keybinds.taiko.innerRight'],
    [Bindings.TaikoOuterLeft]: ['int', 'keybinds.taiko.outerLeft'],
    [Bindings.TaikoOuterRight]: ['int', 'keybinds.taiko.outerRight'],
    [Bindings.QuickRetry]: ['int', 'keybinds.quickRetry']
};

export class StableMemory extends AbstractMemory<OsuPatternData> {
    private scanPatterns: ScanPatterns = {
        baseAddr: {
            pattern: 'F8 01 74 04 83 65'
        },
        playTimeAddr: {
            pattern: '5E 5F 5D C3 A1 ?? ?? ?? ?? 89 ?? 04'
        },
        chatCheckerPtr: {
            pattern: '8B CE 83 3D ?? ?? ?? ?? 00 75 ?? 80',
            offset: 0x4
        },
        skinDataAddr: {
            pattern: '74 2C 85 FF 75 28 A1 ?? ?? ?? ?? 8D 15'
        },
        settingsClassAddr: {
            pattern: '83 E0 20 85 C0 7E 2F'
        },
        configurationAddr: {
            pattern:
                '8D 45 EC 50 8B 0D ?? ?? ?? ?? 8B D7 39 09 E8 ?? ?? ?? ?? 85 C0 74 ?? 8B 4D EC',
            offset: 0x6
        },
        bindingsAddr: {
            pattern: '8D 7D D0 B9 08 00 00 00 33 C0 F3 AB 8B CE 89 4D DC B9',
            offset: 0x2a
        },
        rulesetsAddr: {
            pattern: '7D 15 A1 ?? ?? ?? ?? 85 C0'
        },
        canRunSlowlyAddr: {
            pattern: '55 8B EC 80 3D ?? ?? ?? ?? 00 75 26 80 3D'
        },
        statusPtr: {
            pattern: '48 83 F8 04 73 1E',
            offset: -0x4
        },
        menuModsPtr: {
            pattern: 'C8 FF ?? ?? ?? ?? ?? 81 0D ?? ?? ?? ?? ?? 08 00 00',
            offset: 0x9
        },
        getAudioLengthPtr: {
            pattern: '55 8B EC 83 EC 08 A1 ?? ?? ?? ?? 85 C0',
            offset: 0x7
        },
        userProfilePtr: {
            pattern: 'FF 15 ?? ?? ?? ?? A1 ?? ?? ?? ?? 8B 48 54 33 D2',
            offset: 0x7
        },
        rawLoginStatusPtr: {
            pattern: 'B8 0B 00 00 8B 35',
            offset: -0xb
        },
        spectatingUserPtr: {
            pattern: '8B 0D ?? ?? ?? ?? 85 C0 74 05 8B 50 30',
            offset: -0x4
        },
        gameTimePtr: {
            pattern: 'A1 ?? ?? ?? ?? 89 46 04 8B D6 E8',
            offset: 0x1
        }
    };

    patterns: OsuPatternData = {
        baseAddr: 0,
        playTimeAddr: 0,
        chatCheckerPtr: 0,
        skinDataAddr: 0,
        settingsClassAddr: 0,
        configurationAddr: 0,
        bindingsAddr: 0,
        rulesetsAddr: 0,
        canRunSlowlyAddr: 0,
        statusPtr: 0,
        menuModsPtr: 0,
        getAudioLengthPtr: 0,
        userProfilePtr: 0,
        rawLoginStatusPtr: 0,
        spectatingUserPtr: 0,
        gameTimePtr: 0
    };

    TOURNAMENT_CHAT_ENGINE = 'A1 ?? ?? ?? ?? 89 45 F0 8B D1 85 C9 75';
    ChatAreaAddr: number = 0;

    MANIA_SPEED = 'a3 ?? ?? ?? ?? eb ?? dd 45 08 db 5d e8 8b 45 e8 83 f8 28';
    setSpeedAdr: number = 0;
    gameplayMode: number = 0;

    previousState: string = '';
    previousMP3Length: number = 0;
    previousTime: number = 0;

    configPositions: number[] = [];
    bindingPositions: number[] = [];

    getScanPatterns(): ScanPatterns {
        return this.scanPatterns;
    }

    audioVelocityBase(): IAudioVelocityBase {
        if (this.process === null) {
            throw new Error('Process not found');
        }

        // Ruleset = [[Rulesets - 0xB] + 0x4]
        const rulesetAddr = this.process.readInt(
            this.process.readInt(this.getPattern('rulesetsAddr') - 0xb) + 0x4
        );

        if (rulesetAddr === 0) return 'rulesetAddr is zero';

        // [Ruleset + 0x44] + 0x10
        const audioVelocityBase = this.process.readInt(
            this.process.readInt(rulesetAddr + 0x44) + 0x10
        );

        const bassDensityLength = this.process.readInt(audioVelocityBase + 0x4);
        if (bassDensityLength < 40)
            return 'bassDensity length less than 40 (basically it have 1024 values)';

        const result: number[] = [];
        for (let i = 0; i < 40; i++) {
            const current = audioVelocityBase + this.getLeaderStart() + 0x4 * i;
            const value = this.process.readFloat(current);

            result.push(value);
        }

        return result;
    }

    user(): IUser {
        try {
            const profileBase = this.process.readPointer(
                this.getPattern('userProfilePtr')
            );

            const rawLoginStatus = this.process.readPointer(
                this.getPattern('rawLoginStatusPtr')
            );
            const rawBanchoStatus = this.process.readByte(profileBase + 0x8c);

            const name = this.process.readSharpString(
                this.process.readInt(profileBase + 0x30)
            );
            const accuracy = this.process.readDouble(profileBase + 0x4);
            const rankedScore = this.process.readLong(profileBase + 0xc);
            const id = this.process.readInt(profileBase + 0x70);
            const level = this.process.readFloat(profileBase + 0x74);
            const playCount = this.process.readInt(profileBase + 0x7c);
            const playMode = this.process.readInt(profileBase + 0x80);
            const rank = this.process.readInt(profileBase + 0x84);
            const countryCode = this.process.readInt(profileBase + 0x9c);
            const performancePoints = this.process.readInt(profileBase + 0x88);
            // ARGB, to convert use UserProfile.backgroundColour.toString(16)
            const backgroundColour = this.process.readUInt(profileBase + 0xac);

            return {
                name,
                accuracy,
                rankedScore,
                id,
                level,
                playCount,
                playMode,
                rank,
                countryCode,
                performancePoints,
                rawBanchoStatus,
                backgroundColour,
                rawLoginStatus
            };
        } catch (exc) {
            return exc as Error;
        }
    }

    configOffsets(address: number): IOffsets {
        try {
            const result: number[] = [];

            const rawSharpDictionary =
                this.process.readSharpDictionary(address);
            for (let i = 0; i < rawSharpDictionary.length; i++) {
                const current = rawSharpDictionary[i];

                try {
                    const keyAddress = this.process.readInt(current);
                    const key = this.process.readSharpString(keyAddress);

                    if (!(key in configList)) {
                        continue;
                    }

                    result.push(i);
                } catch (exc) {
                    wLogger.debug(
                        `%${ClientType[this.game.client]}%`,
                        `Failed to read config offset:`,
                        exc
                    );
                }
            }

            return result;
        } catch (error) {
            return error as Error;
        }
    }

    bindingsOffsets(address: number): IOffsets {
        try {
            const result: number[] = [];

            const rawSharpDictionary =
                this.process.readSharpDictionary(address);
            for (let i = 0; i < rawSharpDictionary.length; i++) {
                const current = rawSharpDictionary[i];
                try {
                    const key = this.process.readInt(current);
                    if (!(key in bindingList)) {
                        continue;
                    }

                    result.push(i);
                } catch (exc) {
                    wLogger.debug(
                        `%${ClientType[this.game.client]}%`,
                        `Failed to read bindings offset:`,
                        exc
                    );
                }
            }

            return result;
        } catch (error) {
            return error as Error;
        }
    }

    configValue(address: number, position: number): IConfigValue {
        try {
            const offset =
                this.process.readInt(address + 0x8) + 0x8 + 0x10 * position;
            const keyAddress = this.process.readInt(offset);

            const key = this.process.readSharpString(keyAddress);
            const bindable = this.process.readInt(offset + 0x4);

            if (!configList[key]) {
                return null;
            }

            let value: any;
            switch (configList[key]?.[0]) {
                case 'byte':
                    value = this.process.readByte(bindable + 0xc);
                    break;
                case 'bool':
                    value = Boolean(this.process.readByte(bindable + 0xc));
                    break;
                case 'int':
                case 'double':
                    value = this.process.readDouble(bindable + 0x4);
                    break;
                case 'string':
                    value = this.process.readSharpString(
                        this.process.readInt(offset + 0x4)
                    );
                    break;
                case 'bstring':
                    value = this.process.readSharpString(
                        this.process.readInt(bindable + 0x4)
                    );
                    break;
                case 'enum':
                    value = this.process.readInt(bindable + 0xc);
                    break;
                default:
                    break;
            }

            if (value === null || value === undefined) {
                return null;
            }

            return { key, value };
        } catch (error) {
            return error as Error;
        }
    }

    bindingValue(address: number, position: number): IBindingValue {
        try {
            const offset =
                this.process.readInt(address + 0x8) + 0x8 + 0x10 * position;

            const key = this.process.readInt(offset);
            const value = this.process.readInt(offset + 0xc);

            return { key, value };
        } catch (error) {
            return error as Error;
        }
    }

    resultScreen(): IResultScreen {
        try {
            const address = this.getPattern('rulesetsAddr');
            const rulesetAddr = this.process.readInt(
                this.process.readInt(address - 0xb) + 0x4
            );
            if (rulesetAddr === 0) {
                return 'rulesetAddr is zero';
            }

            const resultScreenBase = this.process.readInt(rulesetAddr + 0x38);
            if (resultScreenBase === 0) {
                return 'resultScreenBase is zero';
            }

            const onlineId = this.process.readLong(resultScreenBase + 0x4);
            const playerName = this.process.readSharpString(
                this.process.readInt(resultScreenBase + 0x28)
            );
            const modsInt =
                this.process.readInt(
                    this.process.readInt(resultScreenBase + 0x1c) + 0xc
                ) ^
                this.process.readInt(
                    this.process.readInt(resultScreenBase + 0x1c) + 0x8
                );
            const mode = this.process.readInt(resultScreenBase + 0x64);
            const maxCombo = this.process.readShort(resultScreenBase + 0x68);
            const score = this.process.readInt(resultScreenBase + 0x78);
            const hit100 = this.process.readShort(resultScreenBase + 0x88);
            const hit300 = this.process.readShort(resultScreenBase + 0x8a);
            const hit50 = this.process.readShort(resultScreenBase + 0x8c);
            const hitGeki = this.process.readShort(resultScreenBase + 0x8e);
            const hitKatu = this.process.readShort(resultScreenBase + 0x90);
            const hitMiss = this.process.readShort(resultScreenBase + 0x92);

            const date = netDateBinaryToDate(
                this.process.readInt(resultScreenBase + 0xa4),
                this.process.readInt(resultScreenBase + 0xa0)
            ).toISOString();

            let mods = calculateMods(modsInt, true);
            if (mods instanceof Error)
                mods = Object.assign({}, defaultCalculatedMods);

            const hits = {
                perfect: hitGeki,
                great: hit300,
                good: hitKatu,
                ok: hit100,
                meh: hit50,
                miss: hitMiss,

                sliderTailHit: 0,
                smallTickHit: 0,
                largeTickHit: 0
            };

            return {
                onlineId,
                playerName,
                mods,
                mode,
                maxCombo,
                score,
                accuracy: calculateAccuracy({
                    isLazer: false,
                    mode,
                    mods: mods.array,
                    statistics: hits
                }),
                statistics: hits,
                maximumStatistics: Object.assign({}, defaultStatistics),
                date
            };
        } catch (error) {
            return error as Error;
        }
    }

    gameplay(): IGameplay {
        try {
            const { baseAddr, rulesetsAddr } = this.getPatterns([
                'baseAddr',
                'rulesetsAddr'
            ]);

            const rulesetAddr = this.process.readInt(
                this.process.readInt(rulesetsAddr - 0xb) + 0x4
            );
            if (rulesetAddr === 0) {
                return 'RulesetAddr is 0';
            }

            const gameplayBase = this.process.readInt(rulesetAddr + 0x68);
            if (gameplayBase === 0) {
                return 'gameplayBase is zero';
            }

            const scoreBase = this.process.readInt(gameplayBase + 0x38);
            if (scoreBase === 0) {
                return 'scoreBase is zero';
            }

            const hpBarBase = this.process.readInt(gameplayBase + 0x40);
            if (hpBarBase === 0) {
                return 'hpBar is zero';
            }

            const { beatmapPP, global } = this.game.getServices([
                'beatmapPP',
                'global'
            ]);

            // [Base - 0x33] + 0x8
            const retries = this.process.readInt(
                this.process.readInt(baseAddr - 0x33) + 0x8
            );
            // [[[Ruleset + 0x68] + 0x38] + 0x28]
            const playerName = this.process.readSharpString(
                this.process.readInt(scoreBase + 0x28)
            );
            // [[[Ruleset + 0x68] + 0x38] + 0x1C] + 0xC ^ [[[Ruleset + 0x68] + 0x38] + 0x1C] + 0x8
            const modsInt =
                this.process.readInt(
                    this.process.readInt(scoreBase + 0x1c) + 0xc
                ) ^
                this.process.readInt(
                    this.process.readInt(scoreBase + 0x1c) + 0x8
                );
            // [[Ruleset + 0x68] + 0x38] + 0x64
            const mode = this.process.readInt(scoreBase + 0x64);

            const scoreOffset = this.game.version.includes('cuttingedge')
                ? 0xfc
                : 0x100;
            const score = this.process.readInt(rulesetAddr + scoreOffset);

            // [[Ruleset + 0x68] + 0x40] + 0x14
            const playerHPSmooth =
                this.process.readDouble(hpBarBase + 0x14) || 0;
            // [[Ruleset + 0x68] + 0x40] + 0x1C
            const playerHP = this.process.readDouble(hpBarBase + 0x1c);
            // [[Ruleset + 0x68] + 0x48] + 0xC
            const accuracy = this.process.readDouble(
                this.process.readInt(gameplayBase + 0x48) + 0xc
            );

            let hit100 = 0;
            let hit300 = 0;
            let hit50 = 0;
            let hitGeki = 0;
            let hitKatu = 0;
            let hitMiss = 0;
            let combo = 0;
            let maxCombo = 0;
            if (global.playTime >= beatmapPP.timings.firstObj - 100) {
                // [[Ruleset + 0x68] + 0x38] + 0x88
                hit100 = this.process.readShort(scoreBase + 0x88);
                // [[Ruleset + 0x68] + 0x38] + 0x8A
                hit300 = this.process.readShort(scoreBase + 0x8a);
                // [[Ruleset + 0x68] + 0x38] + 0x8C
                hit50 = this.process.readShort(scoreBase + 0x8c);
                // [[Ruleset + 0x68] + 0x38] + 0x8E
                hitGeki = this.process.readShort(scoreBase + 0x8e);
                // [[Ruleset + 0x68] + 0x38] + 0x90
                hitKatu = this.process.readShort(scoreBase + 0x90);
                // [[Ruleset + 0x68] + 0x38] + 0x92
                hitMiss = this.process.readShort(scoreBase + 0x92);
                // [[Ruleset + 0x68] + 0x38] + 0x94
                combo = this.process.readShort(scoreBase + 0x94);
                // [[Ruleset + 0x68] + 0x38] + 0x68
                maxCombo = this.process.readShort(scoreBase + 0x68);
            }

            let mods = calculateMods(modsInt, true);
            if (mods instanceof Error)
                mods = Object.assign({}, defaultCalculatedMods);

            this.gameplayMode = mode;

            return {
                failed: playerHP <= 0,
                retries,
                playerName,
                mods,
                mode,
                score,
                playerHPSmooth,
                playerHP,
                accuracy,
                statistics: {
                    perfect: hitGeki,
                    great: hit300,
                    good: hitKatu,
                    ok: hit100,
                    meh: hit50,
                    miss: hitMiss,
                    sliderTailHit: 0,
                    smallTickHit: 0,
                    largeTickHit: 0
                },
                maximumStatistics: Object.assign({}, defaultStatistics),
                combo,
                maxCombo
            };
        } catch (error) {
            return error as Error;
        }
    }

    keyOverlay(mode: number): IKeyOverlay {
        try {
            const address = this.getPattern('rulesetsAddr');
            const rulesetAddr = this.process.readInt(
                this.process.readInt(address - 0xb) + 0x4
            );
            if (rulesetAddr === 0) return 'rulesetAddr is zero';

            const keyOverlayPtr = this.process.readUInt(rulesetAddr + 0xb0);
            if (keyOverlayPtr === 0) {
                if (mode === 3 || mode === 1) return '';

                return `keyOverlayPtr is zero [${keyOverlayPtr}] (${rulesetAddr}  -  ${address})`;
            }

            // [[Ruleset + 0xB0] + 0x10] + 0x4
            const keyOverlayArrayAddr = this.process.readInt(
                this.process.readInt(keyOverlayPtr + 0x10) + 0x4
            );
            if (keyOverlayArrayAddr === 0) return 'keyOverlayAddr[] is zero';

            const itemsSize = this.process.readInt(keyOverlayArrayAddr + 0x4);
            if (itemsSize < 4) {
                return [];
            }

            const keyOverlay = [
                {
                    name: mode === 2 ? 'L' : 'K1',
                    isPressed: Boolean(
                        this.process.readByte(
                            this.process.readInt(keyOverlayArrayAddr + 0x8) +
                                0x1c
                        )
                    ),
                    count: this.process.readInt(
                        this.process.readInt(keyOverlayArrayAddr + 0x8) + 0x14
                    )
                },
                {
                    name: mode === 2 ? 'R' : 'K2',
                    isPressed: Boolean(
                        this.process.readByte(
                            this.process.readInt(keyOverlayArrayAddr + 0xc) +
                                0x1c
                        )
                    ),
                    count: this.process.readInt(
                        this.process.readInt(keyOverlayArrayAddr + 0xc) + 0x14
                    )
                },
                {
                    name: mode === 2 ? 'D' : 'M1',
                    isPressed: Boolean(
                        this.process.readByte(
                            this.process.readInt(keyOverlayArrayAddr + 0x10) +
                                0x1c
                        )
                    ),
                    count: this.process.readInt(
                        this.process.readInt(keyOverlayArrayAddr + 0x10) + 0x14
                    )
                }
            ];

            if (mode === 0) {
                keyOverlay.push({
                    name: 'M2',
                    isPressed: Boolean(
                        this.process.readByte(
                            this.process.readInt(keyOverlayArrayAddr + 0x14) +
                                0x1c
                        )
                    ),
                    count: this.process.readInt(
                        this.process.readInt(keyOverlayArrayAddr + 0x14) + 0x14
                    )
                });
            }

            return keyOverlay;
        } catch (error) {
            return error as Error;
        }
    }

    hitErrors(last: number): IHitErrors {
        try {
            const rulesetsAddr = this.getPattern('rulesetsAddr');

            const rulesetAddr = this.process.readInt(
                this.process.readInt(rulesetsAddr - 0xb) + 0x4
            );
            if (rulesetAddr === 0) return 'RulesetAddr is 0';

            const gameplayBase = this.process.readInt(rulesetAddr + 0x68);
            if (gameplayBase === 0) return 'gameplayBase is zero';

            const scoreBase = this.process.readInt(gameplayBase + 0x38);
            if (scoreBase === 0) return 'scoreBase is zero';

            const leaderStart = this.getLeaderStart();

            const base = this.process.readInt(scoreBase + 0x38);
            const items = this.process.readInt(base + 0x4);
            const size = this.process.readInt(base + 0xc);

            const result: number[] = [];
            let index = last;
            for (let i = last; i < size; i++) {
                const item = items + leaderStart + 0x4 * i;
                const error = this.process.readInt(item);
                if (error < -500 || error > 500) break; // sometimes it returns number over a 1m and we dont need that

                result.push(error);
                index = i + 1;
            }

            return { index, array: result };
        } catch (error) {
            return error as Error;
        }
    }

    global(): IGlobal {
        try {
            const {
                menuModsPtr,
                chatCheckerPtr,
                skinDataAddr,
                settingsClassAddr,
                canRunSlowlyAddr,
                rulesetsAddr,
                gameTimePtr
            } = this.getPatterns([
                'statusPtr',
                'menuModsPtr',
                'chatCheckerPtr',
                'skinDataAddr',
                'settingsClassAddr',
                'canRunSlowlyAddr',
                'rulesetsAddr',
                'gameTimePtr'
            ]);

            const menuMods = this.process.readPointer(menuModsPtr);
            const chatStatus = this.process.readByte(
                this.process.readInt(chatCheckerPtr)
            );
            const isWatchingReplay =
                this.process.readByte(
                    this.process.readInt(canRunSlowlyAddr + 0x46)
                ) === 1;
            const gameTime = this.process.readPointer(gameTimePtr);
            const memorySongsFolder = this.process.readSharpString(
                this.process.readInt(
                    this.process.readInt(
                        this.process.readInt(settingsClassAddr + 0x8) + 0xb8
                    ) + 0x4
                )
            );

            // [[SettingsClass + 0x8] + 0x4] + 0xC
            const showInterface = Boolean(
                this.process.readByte(
                    this.process.readInt(
                        this.process.readInt(settingsClassAddr + 0x8) + 0x4
                    ) + 0xc
                )
            );

            let isReplayUiHidden = false;
            if (isWatchingReplay) {
                const rulesetAddr = this.process.readInt(
                    this.process.readInt(rulesetsAddr - 0xb) + 0x4
                );

                if (rulesetAddr !== 0) {
                    isReplayUiHidden = Boolean(
                        this.process.readByte(rulesetAddr + 0x1d8)
                    );
                }

                // status = GameState.watchingReplay;
            }

            const skinOsuAddr = this.process.readInt(skinDataAddr + 0x7);
            let skinFolder = '';
            if (skinOsuAddr !== 0) {
                const skinOsuBase = this.process.readInt(skinOsuAddr);

                if (skinOsuBase !== 0) {
                    skinFolder = this.process.readSharpString(
                        this.process.readInt(skinOsuBase + 0x44)
                    );
                }
            }

            let mods = calculateMods(menuMods, true);
            if (mods instanceof Error)
                mods = Object.assign({}, defaultCalculatedMods);

            return {
                isWatchingReplay,
                isReplayUiHidden,

                // lazer logic
                isMultiSpectating: false,

                showInterface,
                chatStatus,

                gameTime,
                menuMods: mods,

                skinFolder,
                memorySongsFolder
            };
        } catch (error) {
            return error as Error;
        }
    }

    globalPrecise(): IGlobalPrecise {
        try {
            const { statusPtr, playTimeAddr } = this.getPatterns([
                'playTimeAddr',
                'statusPtr'
            ]);

            const status = this.process.readPointer(statusPtr);
            if (status === GameState.exit) return { status, time: 0 };

            const playTime = this.process.readInt(
                this.process.readInt(playTimeAddr + 0x5)
            );

            return {
                status,
                time: playTime
            };
        } catch (error) {
            return error as Error;
        }
    }

    menu(previousChecksum: string): IMenu {
        try {
            const baseAddr = this.getPattern('baseAddr');

            const beatmapAddr = this.process.readPointer(baseAddr - 0xc);
            if (beatmapAddr === 0) return 'beatmapAddr is 0';

            const gamemode = this.process.readPointer(baseAddr - 0x33);
            const checksum = this.process.readSharpString(
                this.process.readInt(beatmapAddr + 0x6c)
            );
            const filename = this.process.readSharpString(
                this.process.readInt(beatmapAddr + 0x90)
            );
            const rankedStatus = this.process.readInt(beatmapAddr + 0x12c);

            if (checksum === previousChecksum || !filename.endsWith('.osu')) {
                return {
                    type: 'checksum',
                    gamemode,
                    rankedStatus
                };
            }

            const plays = this.process.readInt(
                this.process.readInt(baseAddr - 0x33) + 0xc
            );
            const artist = this.process.readSharpString(
                this.process.readInt(beatmapAddr + 0x18)
            );
            const artistOriginal = this.process.readSharpString(
                this.process.readInt(beatmapAddr + 0x1c)
            );
            const title = this.process.readSharpString(
                this.process.readInt(beatmapAddr + 0x24)
            );
            const titleOriginal = this.process.readSharpString(
                this.process.readInt(beatmapAddr + 0x28)
            );

            const ar = this.process.readFloat(beatmapAddr + 0x2c);
            const cs = this.process.readFloat(beatmapAddr + 0x30);
            const hp = this.process.readFloat(beatmapAddr + 0x34);
            const od = this.process.readFloat(beatmapAddr + 0x38);
            const audioFilename = this.process.readSharpString(
                this.process.readInt(beatmapAddr + 0x64)
            );
            const backgroundFilename = this.process.readSharpString(
                this.process.readInt(beatmapAddr + 0x68)
            );
            const folder = this.process.readSharpString(
                this.process.readInt(beatmapAddr + 0x78)
            );
            const creator = this.process.readSharpString(
                this.process.readInt(beatmapAddr + 0x7c)
            );
            const difficulty = this.process.readSharpString(
                this.process.readInt(beatmapAddr + 0xac)
            );
            const mapID = this.process.readInt(beatmapAddr + 0xc8);
            const setID = this.process.readInt(beatmapAddr + 0xcc);
            const objectCount = this.process.readInt(beatmapAddr + 0xf8);

            return {
                type: 'update',
                gamemode,
                checksum,
                filename,
                plays,
                artist,
                artistOriginal,
                title,
                titleOriginal,
                ar,
                cs,
                hp,
                od,
                audioFilename,
                audioFileMimetype: getContentType(audioFilename),
                backgroundFilename,
                backgroundFileMimetype: getContentType(backgroundFilename),
                folder,
                creator,
                difficulty,
                mapID,
                setID,
                rankedStatus,
                objectCount
            };
        } catch (error) {
            return error as Error;
        }
    }

    mp3Length(): IMP3Length {
        try {
            const mp3Length = Math.round(
                this.process.readDouble(
                    this.process.readPointer(
                        this.getPattern('getAudioLengthPtr')
                    ) + 0x4
                )
            );

            return mp3Length;
        } catch (error) {
            return error as Error;
        }
    }

    tourney(): ITourney {
        try {
            const address = this.getPattern('rulesetsAddr');
            const rulesetAddr = this.process.readInt(
                this.process.readInt(address - 0xb) + 0x4
            );
            if (rulesetAddr === 0) return 'RulesetAddr is 0';

            const teamLeftBase = this.process.readInt(rulesetAddr + 0x1c);
            const teamRightBase = this.process.readInt(rulesetAddr + 0x20);

            const ipcState = this.process.readInt(rulesetAddr + 0x54);
            const leftStars = this.process.readInt(teamLeftBase + 0x2c);
            const rightStars = this.process.readInt(teamRightBase + 0x2c);
            const bestOf = this.process.readInt(teamRightBase + 0x30);
            const starsVisible = Boolean(
                this.process.readByte(teamRightBase + 0x38)
            );
            const scoreVisible = Boolean(
                this.process.readByte(teamRightBase + 0x39)
            );
            const firstTeamName = this.process.readSharpString(
                this.process.readInt(
                    this.process.readInt(teamLeftBase + 0x20) + 0x144
                )
            );
            const secondTeamName = this.process.readSharpString(
                this.process.readInt(
                    this.process.readInt(teamRightBase + 0x20) + 0x144
                )
            );
            const firstTeamScore = this.process.readInt(teamLeftBase + 0x28);
            const secondTeamScore = this.process.readInt(teamRightBase + 0x28);

            return {
                ipcState,
                leftStars,
                rightStars,
                bestOf,
                starsVisible,
                scoreVisible,
                firstTeamName,
                secondTeamName,
                firstTeamScore,
                secondTeamScore
            };
        } catch (error) {
            return error as Error;
        }
    }

    tourneyChat(messages: ITourneyManagerChatItem[]): ITourneyChat {
        try {
            if (this.ChatAreaAddr === 0) {
                this.ChatAreaAddr = this.process.scanSync(
                    this.TOURNAMENT_CHAT_ENGINE
                );
            }

            const channelsList = this.process.readPointer(
                this.ChatAreaAddr + 0x1
            );
            const channelsItems = this.process.readInt(channelsList + 0x4);
            const channelsLength = this.process.readInt(channelsItems + 0x4);

            for (let i = channelsLength - 1; i >= 0; i--) {
                try {
                    const current =
                        channelsItems + this.getLeaderStart() + 0x4 * i;

                    const channelAddr = this.process.readInt(current);
                    if (channelAddr === 0) {
                        continue;
                    }

                    const chatTag = this.process.readSharpString(
                        this.process.readInt(channelAddr + 0x4)
                    );
                    if (chatTag !== '#multiplayer') {
                        continue;
                    }

                    const result: ITourneyManagerChatItem[] = [];

                    const messagesAddr = this.process.readInt(
                        channelAddr + 0x10
                    );

                    const messagesItems = this.process.readInt(
                        messagesAddr + 0x4
                    );
                    const messagesSize = this.process.readInt(
                        messagesAddr + 0xc
                    );

                    if (messages.length === messagesSize) {
                        // Not needed an update
                        continue;
                    }

                    for (let m = 0; m < messagesSize; m++) {
                        try {
                            const current =
                                messagesItems + this.getLeaderStart() + 0x4 * m;
                            const currentItem = this.process.readInt(current);

                            // [Base + 0x4]
                            const content = this.process.readSharpString(
                                this.process.readInt(currentItem + 0x4)
                            );
                            // NOTE: Check for empty, and !mp commands
                            if (
                                content === '' ||
                                (!config.showMpCommands &&
                                    content.startsWith('!mp'))
                            ) {
                                continue;
                            }
                            // [Base + 0x8]
                            const timeName = this.process.readSharpString(
                                this.process.readInt(currentItem + 0x8)
                            );
                            const [time] = timeName.split(' ');

                            result.push({
                                time: time.trim(),
                                name: timeName
                                    .replace(time, '')
                                    .replace(/:$/, '')
                                    .trimStart(),
                                content
                            });
                        } catch (exc) {
                            wLogger.debug(
                                `%${ClientType[this.game.client]}%`,
                                `Error processing chat message %${m}%:`,
                                exc
                            );
                        }
                    }

                    return result;
                } catch (exc) {
                    wLogger.debug(
                        `%${ClientType[this.game.client]}%`,
                        `Error processing chat channel %${i}%:`,
                        exc
                    );
                }
            }

            return false;
        } catch (error) {
            return error as Error;
        }
    }

    tourneyUser(): ITourneyUser {
        try {
            const address = this.process.readPointer(
                this.getPattern('spectatingUserPtr')
            );
            if (!address) return 'Slot is not equiped';

            const userAccuracy = this.process.readDouble(address + 0x4);
            const userRankedScore = this.process.readLong(address + 0xc);
            const userPlayCount = this.process.readInt(address + 0x7c);
            const userGlobalRank = this.process.readInt(address + 0x84);
            const userPP = this.process.readInt(address + 0x9c);
            const userName = this.process.readSharpString(
                this.process.readInt(address + 0x30)
            );
            const userCountry = this.process.readSharpString(
                this.process.readInt(address + 0x2c)
            );
            const userID = this.process.readInt(address + 0x70);

            return {
                id: userID,
                name: userName,
                country: userCountry,
                accuracy: userAccuracy,
                playcount: userPlayCount,
                rankedScore: userRankedScore,
                globalRank: userGlobalRank,
                pp: userPP
            };
        } catch (error) {
            return error as Error;
        }
    }

    leaderboard(mode: number): ILeaderboard {
        try {
            const rulesetAddr = this.process.readInt(
                this.process.readInt(this.getPattern('rulesetsAddr') - 0xb) +
                    0x4
            );

            const base = this.process.readInt(rulesetAddr + 0x7c);

            if (base === 0) {
                return [false, undefined, []];
            }

            const address = Math.max(0, this.process.readInt(base + 0x24)); // known as leaderBoardAddr, leaderboardBase
            if (address === 0) {
                return [false, undefined, []];
            }

            const playerBase = this.process.readInt(address + 0x10);
            const isVisible = this.process.readByte(
                this.process.readInt(playerBase + 0x24) + 0x20
            );

            const currentPlayer = this.leaderboardPlayer(playerBase, mode);

            const playersAddr = this.process.readInt(address + 0x4);
            const slotsAmount = this.process.readInt(playersAddr + 0xc);
            if (slotsAmount < 1) {
                return [Boolean(isVisible), currentPlayer, []];
            }

            const result: LeaderboardPlayer[] = [];

            const itemsBase = this.process.readInt(playersAddr + 0x4);
            const itemsSize = this.process.readInt(playersAddr + 0xc);
            const leaderStart = this.getLeaderStart();

            for (let i = 0; i < itemsSize; i++) {
                const current = itemsBase + leaderStart + 0x4 * i;

                const lbEntry = this.leaderboardPlayer(
                    this.process.readInt(current),
                    mode
                );

                if (!lbEntry) {
                    // break due to un-consistency of leaderboard
                    break;
                }

                result.push(lbEntry);
            }

            return [Boolean(isVisible), currentPlayer, result];
        } catch (error) {
            return error as Error;
        }
    }

    private leaderboardPlayer(
        base: number,
        mode: number
    ): LeaderboardPlayer | undefined {
        const entry = this.process.readInt(base + 0x20);
        if (entry === 0) {
            return undefined;
        }

        const modsXor1 = this.process.readInt(
            this.process.readInt(entry + 0x1c) + 0x8
        );
        const modsXor2 = this.process.readInt(
            this.process.readInt(entry + 0x1c) + 0xc
        );

        const modsInt = modsXor1 ^ modsXor2;

        let mods = calculateMods(modsInt, true);
        if (mods instanceof Error)
            mods = Object.assign({}, defaultCalculatedMods);

        const scoreAddr = this.process.readIntPtr(base + 0x20);
        let userId = 0;
        if (scoreAddr !== 0) {
            const userPtr = this.process.readIntPtr(scoreAddr + 0x48);
            if (userPtr !== 0) {
                userId = this.process.readInt(
                    this.process.readIntPtr(scoreAddr + 0x48) + 0x70
                );
            }
        }

        const hits = {
            perfect: 0,
            great: this.process.readShort(entry + 0x8a),
            good: 0,
            ok: this.process.readShort(entry + 0x88),
            meh: this.process.readShort(entry + 0x8c),
            miss: this.process.readShort(entry + 0x92),

            sliderTailHit: 0,
            smallTickHit: 0,
            largeTickHit: 0
        };

        return {
            userId,
            name: this.process.readSharpString(
                this.process.readInt(base + 0x8)
            ),
            score: this.process.readInt(base + 0x30),
            combo: this.process.readShort(entry + 0x94),
            maxCombo: this.process.readShort(entry + 0x68),
            mods,
            accuracy: calculateAccuracy({
                isLazer: false,
                mode,
                mods: mods.array,
                statistics: hits
            }),
            statistics: hits,
            team: this.process.readInt(base + 0x40),
            position: this.process.readInt(base + 0x2c),
            isPassing: Boolean(this.process.readByte(base + 0x4b))
        };
    }

    private beatmapScrollSpeed(globalSpeed: number) {
        try {
            if (this.setSpeedAdr === 0 && this.gameplayMode === 3) {
                this.setSpeedAdr = this.process.scanSync(this.MANIA_SPEED);
            }

            if (this.setSpeedAdr === 0) return globalSpeed;

            const maniaSpeedPtr = this.process.readIntPtr(
                this.setSpeedAdr + 0x1
            );
            const maniaSpeed = this.process.readInt(maniaSpeedPtr);

            this.game.resetReportCount(`beatmapScrollSpeed`);
            return maniaSpeed;
        } catch (exc) {
            this.game.reportError(
                `beatmapScrollSpeed`,
                10,
                `%${ClientType[this.game.client]}%`,
                `Failed to read beatmap scroll speed:`,
                (exc as any).message
            );
            wLogger.debug(
                `%${ClientType[this.game.client]}%`,
                `Failed to read beatmap scroll speed:`,
                exc
            );

            return globalSpeed;
        }
    }

    settings(): ISettings {
        try {
            const { configurationAddr: asd, bindingsAddr } = this.getPatterns([
                'configurationAddr',
                'bindingsAddr'
            ]);

            const configPointer = this.process.readPointer(asd);
            const bindingPointer = this.process.readPointer(bindingsAddr);

            if (this.configPositions.length === 0) {
                const offsets = this.configOffsets(configPointer);
                if (offsets instanceof Error) throw offsets;

                this.configPositions = offsets;
            }

            if (this.bindingPositions.length === 0) {
                const offsets = this.bindingsOffsets(bindingPointer);
                if (offsets instanceof Error) throw offsets;

                this.bindingPositions = offsets;
            }

            const settings: SettingsObject = {};
            for (const position of this.configPositions) {
                try {
                    const result = this.configValue(configPointer, position);
                    if (result instanceof Error) throw result;
                    if (result === null || !result.key || !result.value)
                        continue;

                    const value = configList[result.key];
                    if (!value || !isAllowedValue(value[0], result.value))
                        continue;

                    settings[value[1]] = result.value;

                    this.game.resetReportCount(
                        `settings updateConfigState [${position}]`
                    );
                } catch (exc) {
                    this.game.reportError(
                        `settings updateConfigState [${position}]`,
                        10,
                        ClientType[this.game.client],
                        this.game.pid,
                        `settings updateConfigState [${position}]`,
                        (exc as any).message
                    );
                    wLogger.debug(
                        `%${ClientType[this.game.client]}%`,
                        `Failed to update config state at position %${position}%:`,
                        exc
                    );
                }
            }

            for (const position of this.bindingPositions) {
                try {
                    const result = this.bindingValue(bindingPointer, position);
                    if (result instanceof Error) throw result;
                    if (!result.key || !result.value) continue;

                    const value = bindingList[result.key];
                    if (!value || !isAllowedValue(value[0], result.value))
                        continue;

                    settings[value[1]] = VirtualKeyCode[result.value];

                    this.game.resetReportCount(
                        `settings updateBindingState [${position}]`
                    );
                } catch (exc) {
                    this.game.reportError(
                        `settings updateBindingState [${position}]`,
                        10,
                        ClientType[this.game.client],
                        this.game.pid,
                        `settings updateBindingState [${position}]`,
                        (exc as any).message
                    );
                    wLogger.debug(
                        `%${ClientType[this.game.client]}%`,
                        `Failed to update binding state at position %${position}%:`,
                        exc
                    );
                }
            }

            const beatmapScrollSpeed = this.beatmapScrollSpeed(
                settings['mania.scrollSpeed'] as number
            );
            settings['mania.scrollSpeed'] = beatmapScrollSpeed;

            this.game.version = `${settings['client.version'] || ''}`;

            return settings;
        } catch (error) {
            return error as Error;
        }
    }
}
