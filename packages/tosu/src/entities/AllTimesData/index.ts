import { wLogger } from '@tosu/common';
import { Process } from 'tsprocess/dist/process';

import { DataRepo } from '@/entities/DataRepoList';
import { Bindings, VirtualKeyCode } from '@/utils/bindings';

import { AbstractEntity } from '../AbstractEntity';
import { Settings } from '../Settings';

interface IBindable {
    setValue: (settings: Settings, value: any) => void;
}

interface IConfigBindable extends IBindable {
    type: 'bool' | 'byte' | 'int' | 'double' | 'string' | 'bstring' | 'enum';
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

    bindingNames = new Map();

    private configStateErrorAttempts: number = 0;
    private bindingStateErrorAttempts: number = 0;

    private configList: Record<string, IConfigBindable> = {
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
                settings.BeatmapDirectory = value;
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
                settings.scoreMeter.size = parseFloat((value || 0).toFixed(2));
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
                settings.cursor.size = parseFloat((value || 0).toFixed(2));
            }
        },
        MouseSpeed: {
            type: 'double',
            setValue: (settings, value) => {
                settings.mouse.sensitivity = parseFloat(
                    (value || 0).toFixed(2)
                );
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

    private bindingList: Record<number, IBindable> = {
        [Bindings.OsuLeft]: {
            setValue: (settings, value: number) => {
                settings.keybinds.osu.k1 = VirtualKeyCode[value];
            }
        },
        [Bindings.OsuRight]: {
            setValue: (settings, value: number) => {
                settings.keybinds.osu.k2 = VirtualKeyCode[value];
            }
        },
        [Bindings.OsuSmoke]: {
            setValue: (settings, value: number) => {
                settings.keybinds.osu.smokeKey = VirtualKeyCode[value];
            }
        },
        [Bindings.FruitsDash]: {
            setValue: (settings, value: number) => {
                settings.keybinds.fruits.Dash = VirtualKeyCode[value];
            }
        },
        [Bindings.FruitsLeft]: {
            setValue: (settings, value: number) => {
                settings.keybinds.fruits.k1 = VirtualKeyCode[value];
            }
        },
        [Bindings.FruitsRight]: {
            setValue: (settings, value: number) => {
                settings.keybinds.fruits.k2 = VirtualKeyCode[value];
            }
        },
        [Bindings.TaikoInnerLeft]: {
            setValue: (settings, value: number) => {
                settings.keybinds.taiko.innerLeft = VirtualKeyCode[value];
            }
        },
        [Bindings.TaikoInnerRight]: {
            setValue: (settings, value: number) => {
                settings.keybinds.taiko.innerRight = VirtualKeyCode[value];
            }
        },
        [Bindings.TaikoOuterLeft]: {
            setValue: (settings, value: number) => {
                settings.keybinds.taiko.outerLeft = VirtualKeyCode[value];
            }
        },
        [Bindings.TaikoOuterRight]: {
            setValue: (settings, value: number) => {
                settings.keybinds.taiko.outerRight = VirtualKeyCode[value];
            }
        },
        [Bindings.QuickRetry]: {
            setValue: (settings, value: number) => {
                settings.keybinds.quickRetry = VirtualKeyCode[value];
            }
        }
    };

    constructor(services: DataRepo) {
        super(services);
    }

    updateConfigState(
        process: Process,
        settings: Settings,
        configurationAddr: number
    ) {
        try {
            const rawSharpDictionary =
                process.readSharpDictionary(configurationAddr);
            for (let i = 0; i < rawSharpDictionary.length; i++) {
                const current = rawSharpDictionary[i];
                const keyAddress = process.readInt(current);
                let key;
                if (this.bindingNames.has(keyAddress)) {
                    key = this.bindingNames.get(keyAddress);
                } else {
                    key = process.readSharpString(keyAddress);
                    this.bindingNames.set(keyAddress, key);
                }
                const bindable = process.readInt(current + 0x4);

                if (!(key in this.configList)) {
                    continue;
                }
                let value: any;

                switch (this.configList[key].type) {
                    case 'byte':
                        value = process.readByte(bindable + 0xc);
                        break;
                    case 'bool':
                        value = Boolean(process.readByte(bindable + 0xc));
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
                        break;
                }

                if (value != null) {
                    this.configList[key].setValue(settings, value);
                }
            }

            if (this.configStateErrorAttempts != 0)
                this.configStateErrorAttempts = 0;
        } catch (exc) {
            this.configStateErrorAttempts += 1;

            if (this.configStateErrorAttempts > 5) {
                wLogger.error(
                    "ATD(updateConfigState) Can't update config state"
                );
                wLogger.debug(exc);
            }
        }
    }

    updateBindingState(
        process: Process,
        settings: Settings,
        bindingConfigAddr: number
    ) {
        try {
            const rawSharpDictionary =
                process.readSharpDictionary(bindingConfigAddr);
            for (let i = 0; i < rawSharpDictionary.length; i++) {
                const current = rawSharpDictionary[i];
                const key = process.readInt(current);
                const value = process.readInt(current + 0xc);

                const bindable = this.bindingList[key];
                if (bindable) {
                    bindable.setValue(settings, value);
                }
            }

            if (this.bindingStateErrorAttempts != 0)
                this.bindingStateErrorAttempts = 0;
        } catch (exc) {
            this.bindingStateErrorAttempts += 1;

            if (this.bindingStateErrorAttempts > 5) {
                wLogger.error(
                    "ATD(updateBindingState) Can't update binding state"
                );
                wLogger.debug(exc);
            }
        }
    }

    updateState() {
        try {
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
                settingsClassAddr,
                configurationAddr,
                bindingsAddr,
                canRunSlowlyAddr,
                gameTimePtr
            } = patterns.getPatterns([
                'statusPtr',
                'playTimeAddr',
                'menuModsPtr',
                'chatCheckerAddr',
                'skinDataAddr',
                'settingsClassAddr',
                'configurationAddr',
                'bindingsAddr',
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
            this.PlayTime = process.readInt(
                process.readInt(playTimeAddr + 0x5)
            );
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
            this.SongsFolder = process.readSharpString(
                process.readInt(
                    process.readInt(
                        process.readInt(settingsClassAddr + 0x8) + 0xb8
                    ) + 0x4
                )
            );

            // [[SettingsClass + 0x8] + 0x4] + 0xC
            this.ShowInterface = Boolean(
                process.readByte(
                    process.readInt(
                        process.readInt(settingsClassAddr + 0x8) + 0x4
                    ) + 0xc
                )
            );

            // this.updateConfigState(
            //     process,
            //     settings,
            //     process.readPointer(configurationAddr)
            // );

            // this.updateBindingState(
            //     process,
            //     settings,
            //     process.readPointer(bindingsAddr)
            // );
        } catch (exc) {
            wLogger.error(`ATD(updateState) ${(exc as any).message}`, exc);
        }
    }
}
