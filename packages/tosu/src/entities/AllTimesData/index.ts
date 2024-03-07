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
        } catch (exc) {
            wLogger.error(
                "ATD(updateBindingState) Can't update binding state",
                exc
            );
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
        this.SongsFolder = process.readSharpString(
            process.readInt(
                process.readInt(
                    process.readInt(settingsClassAddr + 0x8) + 0xb8
                ) + 0x4
            )
        );

        // this.updateConfigState(
        //     process,
        //     settings,
        //     process.readPointer(configurationAddr)
        // );

        this.updateBindingState(
            process,
            settings,
            process.readPointer(bindingsAddr)
        );
    }
}
