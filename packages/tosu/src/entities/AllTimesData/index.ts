import { wLogger } from '@tosu/common';
import { Process } from 'tsprocess/dist/process';

import { DataRepo } from '@/entities/DataRepoList';

import { AbstractEntity } from '../AbstractEntity';
import { Settings } from '../Settings';

interface ConfigBindable {
    type: 'bool' | 'byte' | 'int' | 'double' | 'string' | 'bstring' | 'enum';
    setValue: (settings: Settings, value: any) => void;
}

export class AllTimesData extends AbstractEntity {
    Status: number = 0;
    GameTime: number = 0;
    PlayTime: number = 0;
    MenuMods: number = 0;
    ChatStatus: number = 0;
    SkinFolder: string = '';
    SongsFolder: string = '';
    ShowInterface: boolean = false;
    IsWatchingReplay: number = 0;

    private configList: Record<string, ConfigBindable> = {
        VolumeUniversal: {
            type: 'int',
            setValue: (settings, value) => {
                settings.audio.volume.master = value;
            }
        },
        VolumeEffect: {
            type: 'int',
            setValue: (settings, value) => {
                settings.audio.volume.effect = value;
            }
        },
        VolumeMusic: {
            type: 'int',
            setValue: (settings, value) => {
                settings.audio.volume.music = value;
            }
        },
        _ReleaseStream: {
            type: 'enum',
            setValue: (settings, value) => {
                settings.client.branch = value;
            }
        },
        DimLevel: {
            type: 'int',
            setValue: (settings, value) => {
                settings.background.dim = value;
            }
        },
        ShowStoryboard: {
            type: 'bool',
            setValue: (settings, value) => {
                settings.background.storyboard = value;
            }
        },
        ShowInterface: {
            type: 'bool',
            setValue: (settings, value) => {
                settings.showInterface = value;
            }
        },
        BeatmapDirectory: {
            type: 'bstring',
            setValue: (settings, value) => {
                settings.songsFolder = value;
            }
        },
        ScoreMeter: {
            type: 'enum',
            setValue: (settings, value) => {
                settings.scoreMeter.type = value;
            }
        },
        ScoreMeterScale: {
            type: 'double',
            setValue: (settings, value) => {
                settings.scoreMeter.size = value;
            }
        },
        Offset: {
            type: 'int',
            setValue: (settings, value) => {
                settings.offset.universal = value;
            }
        },
        CursorSize: {
            type: 'double',
            setValue: (settings, value) => {
                settings.cursor.size = value;
            }
        },
        MouseSpeed: {
            type: 'double',
            setValue: (settings, value) => {
                settings.mouse.sensitivity = value;
            }
        },
        Fullscreen: {
            type: 'bool',
            setValue: (settings, value) => {
                settings.resolution.fullscreen = value;
            }
        },
        Width: {
            type: 'int',
            setValue: (settings, value) => {
                settings.resolution.width = value;
            }
        },
        Height: {
            type: 'int',
            setValue: (settings, value) => {
                settings.resolution.height = value;
            }
        },
        WidthFullscreen: {
            type: 'int',
            setValue: (settings, value) => {
                settings.resolution.widthFullscreen = value;
            }
        },
        HeightFullscreen: {
            type: 'int',
            setValue: (settings, value) => {
                settings.resolution.heightFullscreen = value;
            }
        },
        AutomaticCursorSizing: {
            type: 'bool',
            setValue: (settings, value) => {
                settings.cursor.autoSize = value;
            }
        },
        IgnoreBeatmapSamples: {
            type: 'bool',
            setValue: (settings, value) => {
                settings.audio.ignoreBeatmapSounds = value;
            }
        },
        SkinSamples: {
            type: 'bool',
            setValue: (settings, value) => {
                settings.audio.useSkinSamples = value;
            }
        },
        LastVersion: {
            type: 'bstring',
            setValue: (settings, value) => {
                settings.client.version = value;
            }
        },
        ManiaSpeedBPMScale: {
            type: 'bool',
            setValue: (settings, value) => {
                settings.mania.speedBPMScale = value;
            }
        },
        UsePerBeatmapManiaSpeed: {
            type: 'bool',
            setValue: (settings, value) => {
                settings.mania.usePerBeatmapSpeedScale = value;
            }
        },
        MouseDisableButtons: {
            type: 'bool',
            setValue: (settings, value) => {
                settings.mouse.disableButtons = value;
            }
        },
        MouseDisableWheel: {
            type: 'bool',
            setValue: (settings, value) => {
                settings.mouse.disableWheel = value;
            }
        },
        ProgressBarType: {
            type: 'enum',
            setValue: (settings, value) => {
                settings.progressBarType = value;
            }
        },
        RankType: {
            type: 'enum',
            setValue: (settings, value) => {
                settings.leaderboardType = value;
            }
        },
        UpdatePending: {
            type: 'bool',
            setValue: (settings, value) => {
                settings.client.updateAvailable = value;
            }
        },

        UseSkinCursor: {
            type: 'bool',
            setValue: (settings, value) => {
                settings.cursor.useSkinCursor = value;
            }
        },
        RawInput: {
            type: 'bool',
            setValue: (settings, value) => {
                settings.mouse.rawInput = value;
            }
        },
        TreeSortMode: {
            type: 'enum',
            setValue: (settings, value) => {
                settings.groupType = value;
            }
        },
        TreeSortMode2: {
            type: 'enum',
            setValue: (settings, value) => {
                settings.sortType = value;
            }
        },
        keyOsuLeft: {
            type: 'string',
            setValue: (settings, value) => {
                settings.keybinds.osu.k1 = value;
            }
        },
        keyOsuRight: {
            type: 'string',
            setValue: (settings, value) => {
                settings.keybinds.osu.k2 = value;
            }
        },
        keyOsuSmoke: {
            type: 'string',
            setValue: (settings, value) => {
                settings.keybinds.osu.smokeKey = value;
            }
        },
        keyFruitsDash: {
            type: 'string',
            setValue: (settings, value) => {
                settings.keybinds.fruits.Dash = value;
            }
        },
        keyFruitsLeft: {
            type: 'string',
            setValue: (settings, value) => {
                settings.keybinds.fruits.k1 = value;
            }
        },
        keyFruitsRight: {
            type: 'string',
            setValue: (settings, value) => {
                settings.keybinds.fruits.k2 = value;
            }
        },
        keyTaikoInnerLeft: {
            type: 'string',
            setValue: (settings, value) => {
                settings.keybinds.taiko.innerLeft = value;
            }
        },
        keyTaikoInnerRight: {
            type: 'string',
            setValue: (settings, value) => {
                settings.keybinds.taiko.innerRight = value;
            }
        },
        keyTaikoOuterLeft: {
            type: 'string',
            setValue: (settings, value) => {
                settings.keybinds.taiko.outerLeft = value;
            }
        },
        keyTaikoOuterRight: {
            type: 'string',
            setValue: (settings, value) => {
                settings.keybinds.taiko.outerRight = value;
            }
        },
        keyQuickRetry: {
            type: 'string',
            setValue: (settings, value) => {
                settings.keybinds.quickRetry = value;
            }
        },
        EditorDefaultSkin: {
            type: 'bool',
            setValue: (settings, value) => {
                settings.skin.useDefaultSkinInEditor = value;
            }
        },
        ComboColourSliderBall: {
            type: 'bool',
            setValue: (settings, value) => {
                settings.skin.tintSliderBall = value;
            }
        },
        IgnoreBeatmapSkins: {
            type: 'bool',
            setValue: (settings, value) => {
                settings.skin.ignoreBeatmapSkins = value;
            }
        },
        Skin: {
            type: 'bstring',
            setValue: (settings, value) => {
                settings.skin.name = value;
            }
        },
        UseTaikoSkin: {
            type: 'bool',
            setValue: (settings, value) => {
                settings.skin.useTaikoSkin = value;
            }
        }
    };

    constructor(services: DataRepo) {
        super(services);
    }

    async updateConfigState(
        process: Process,
        settings: Settings,
        configurationAddr: number
    ) {
        try {
            const items = process.readInt(configurationAddr + 0x8);
            const size = process.readInt(configurationAddr + 0x1c);

            for (let i = 0; i < size; i++) {
                const current = items + 0x8 + 0x10 * i;

                const key = process.readSharpString(process.readInt(current));
                const bindable = process.readInt(current + 0x4);

                const configBindable = this.configList[key];

                if (configBindable !== undefined) {
                    let value: any;

                    switch (configBindable.type) {
                        case 'byte':
                            value = process.readByte(bindable + 0xc);
                            break;
                        case 'bool':
                            value = process.readByte(bindable + 0xc) == 1;
                            break;
                        case 'int':
                        case 'double':
                            value = process.readDouble(bindable + 0x4);
                            break;
                        case 'string':
                            value = process.readSharpString(
                                process.readInt(current + 0x4)
                            );
                            break;
                        case 'bstring':
                            value = process.readSharpString(
                                process.readInt(bindable + 0x4)
                            );
                            break;
                        case 'enum':
                            value = process.readInt(bindable + 0xc);
                            break;
                        default:
                            return;
                    }

                    configBindable.setValue(settings, value);
                }
            }
        } catch (exc) {
            wLogger.error("can't update config state");
            console.error(exc);
        }
    }

    async updateState() {
        const { process, patterns, settings } = this.services.getServices([
            'process',
            'patterns',
            'settings'
        ]);

        const {
            statusPtr,
            playTimeAddr,
            menuModsPtr,
            chatCheckerAddr,
            skinDataAddr,
            configurationAddr,
            canRunSlowlyAddr,
            gameTimePtr
        } = patterns.getPatterns([
            'statusPtr',
            'playTimeAddr',
            'menuModsPtr',
            'chatCheckerAddr',
            'skinDataAddr',
            'configurationAddr',
            'canRunSlowlyAddr',
            'gameTimePtr'
        ]);

        const skinOsuAddr = process.readInt(skinDataAddr + 0x7);
        if (skinOsuAddr === 0) {
            return;
        }
        const skinOsuBase = process.readInt(skinOsuAddr);

        // [Status - 0x4]
        this.Status = process.readPointer(statusPtr);
        // [PlayTime + 0x5]
        this.PlayTime = process.readInt(process.readInt(playTimeAddr + 0x5));
        this.GameTime = process.readPointer(gameTimePtr);
        // [MenuMods + 0x9]
        this.MenuMods = process.readPointer(menuModsPtr);
        // ChatChecker - 0x20
        this.ChatStatus = process.readByte(chatCheckerAddr - 0x20);
        this.SkinFolder = process.readSharpString(
            process.readInt(skinOsuBase + 0x44)
        );
        this.IsWatchingReplay = process.readByte(
            process.readInt(canRunSlowlyAddr + 0x46)
        );

        this.updateConfigState(
            process,
            settings,
            process.readPointer(configurationAddr)
        );
    }
}
