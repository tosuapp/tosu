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
                settings.volume.master = value;
            }
        },
        VolumeEffect: {
            type: 'int',
            setValue: (settings, value) => {
                settings.volume.effect = value;
            }
        },
        VolumeMusic: {
            type: 'int',
            setValue: (settings, value) => {
                settings.volume.music = value;
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
                settings.window.fullscreen = value;
            }
        },
        Width: {
            type: 'int',
            setValue: (settings, value) => {
                settings.window.width = value;
            }
        },
        Height: {
            type: 'int',
            setValue: (settings, value) => {
                settings.window.height = value;
            }
        },
        WidthFullscreen: {
            type: 'int',
            setValue: (settings, value) => {
                settings.window.widthFullscreen = value;
            }
        },
        HeightFullscreen: {
            type: 'int',
            setValue: (settings, value) => {
                settings.window.heightFullscreen = value;
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
