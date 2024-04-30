import { wLogger } from '@tosu/common';
import { Process } from 'tsprocess/dist/process';

import { AbstractEntity } from '@/entities/AbstractEntity/index';
import { Bindings, VirtualKeyCode } from '@/utils/bindings';
import {
    Audio,
    Background,
    Client,
    Cursor,
    IBindable,
    IConfigBindable,
    Keybinds,
    Mania,
    Mouse,
    Resolution,
    ScoreMeter
} from '@/utils/settings.types';

export class Settings extends AbstractEntity {
    audio: Audio = {
        ignoreBeatmapSounds: false,
        useSkinSamples: false,
        volume: {
            master: 0,
            music: 0,
            effect: 0
        },
        offset: { universal: 0 }
    };

    background: Background = { dim: 0, video: false, storyboard: false };
    client: Client = { updateAvailable: false, branch: 0, version: '' };
    resolution: Resolution = {
        fullscreen: false,
        width: 0,
        height: 0,
        widthFullscreen: 0,
        heightFullscreen: 0
    };

    scoreMeter: ScoreMeter = { type: 0, size: 0 };
    cursor: Cursor = { useSkinCursor: false, autoSize: false, size: 0 };
    mouse: Mouse = {
        rawInput: false,
        disableButtons: false,
        disableWheel: false,
        sensitivity: 0
    };

    mania: Mania = { speedBPMScale: false, usePerBeatmapSpeedScale: false };

    skin = {
        useDefaultSkinInEditor: false,
        ignoreBeatmapSkins: false,
        tintSliderBall: false,
        useTaikoSkin: false,
        name: ''
    };

    keybinds: Keybinds = {
        osu: {
            k1: '',
            k2: '',
            smokeKey: ''
        },
        fruits: {
            k1: '',
            k2: '',
            Dash: ''
        },
        taiko: {
            innerLeft: '',
            innerRight: '',
            outerLeft: '',
            outerRight: ''
        },
        quickRetry: ''
    };

    groupType: number = 0;
    sortType: number = 0;

    leaderboardType: number = 0;
    progressBarType: number = 0;

    configPositions: number[] = [];
    bindingPositions: number[] = [];

    private configStateErrorAttempts: number = 0;
    private bindingStateErrorAttempts: number = 0;

    private configList: Record<string, IConfigBindable> = {
        VolumeUniversal: {
            type: 'int',
            setValue: (value) => {
                this.audio.volume.master = value;
            }
        },
        VolumeEffect: {
            type: 'int',
            setValue: (value) => {
                this.audio.volume.effect = value;
            }
        },
        VolumeMusic: {
            type: 'int',
            setValue: (value) => {
                this.audio.volume.music = value;
            }
        },
        _ReleaseStream: {
            type: 'enum',
            setValue: (value) => {
                this.client.branch = value;
            }
        },
        DimLevel: {
            type: 'int',
            setValue: (value) => {
                this.background.dim = value;
            }
        },
        ShowStoryboard: {
            type: 'bool',
            setValue: (value) => {
                this.background.storyboard = value;
            }
        },
        // ShowInterface: {
        //     type: 'bool',
        //     setValue: (value) => {
        //         this.showInterface = value;
        //     }
        // },
        // BeatmapDirectory: {
        //     type: 'bstring',
        //     setValue: (value) => {
        //         this.BeatmapDirectory = value;
        //     }
        // },
        ScoreMeter: {
            type: 'enum',
            setValue: (value) => {
                this.scoreMeter.type = value;
            }
        },
        ScoreMeterScale: {
            type: 'double',
            setValue: (value) => {
                this.scoreMeter.size = parseFloat((value || 0).toFixed(2));
            }
        },
        Offset: {
            type: 'int',
            setValue: (value) => {
                this.audio.offset.universal = value;
            }
        },
        CursorSize: {
            type: 'double',
            setValue: (value) => {
                this.cursor.size = parseFloat((value || 0).toFixed(2));
            }
        },
        MouseSpeed: {
            type: 'double',
            setValue: (value) => {
                this.mouse.sensitivity = parseFloat((value || 0).toFixed(2));
            }
        },
        Fullscreen: {
            type: 'bool',
            setValue: (value) => {
                this.resolution.fullscreen = value;
            }
        },
        Width: {
            type: 'int',
            setValue: (value) => {
                this.resolution.width = value;
            }
        },
        Height: {
            type: 'int',
            setValue: (value) => {
                this.resolution.height = value;
            }
        },
        WidthFullscreen: {
            type: 'int',
            setValue: (value) => {
                this.resolution.widthFullscreen = value;
            }
        },
        HeightFullscreen: {
            type: 'int',
            setValue: (value) => {
                this.resolution.heightFullscreen = value;
            }
        },
        AutomaticCursorSizing: {
            type: 'bool',
            setValue: (value) => {
                this.cursor.autoSize = value;
            }
        },
        IgnoreBeatmapSamples: {
            type: 'bool',
            setValue: (value) => {
                this.audio.ignoreBeatmapSounds = value;
            }
        },
        SkinSamples: {
            type: 'bool',
            setValue: (value) => {
                this.audio.useSkinSamples = value;
            }
        },
        LastVersion: {
            type: 'bstring',
            setValue: (value) => {
                this.client.version = value;
            }
        },
        ManiaSpeedBPMScale: {
            type: 'bool',
            setValue: (value) => {
                this.mania.speedBPMScale = value;
            }
        },
        UsePerBeatmapManiaSpeed: {
            type: 'bool',
            setValue: (value) => {
                this.mania.usePerBeatmapSpeedScale = value;
            }
        },
        MouseDisableButtons: {
            type: 'bool',
            setValue: (value) => {
                this.mouse.disableButtons = value;
            }
        },
        MouseDisableWheel: {
            type: 'bool',
            setValue: (value) => {
                this.mouse.disableWheel = value;
            }
        },
        ProgressBarType: {
            type: 'enum',
            setValue: (value) => {
                this.progressBarType = value;
            }
        },
        RankType: {
            type: 'enum',
            setValue: (value) => {
                this.leaderboardType = value;
            }
        },
        UpdatePending: {
            type: 'bool',
            setValue: (value) => {
                this.client.updateAvailable = value;
            }
        },

        UseSkinCursor: {
            type: 'bool',
            setValue: (value) => {
                this.cursor.useSkinCursor = value;
            }
        },
        RawInput: {
            type: 'bool',
            setValue: (value) => {
                this.mouse.rawInput = value;
            }
        },
        TreeSortMode: {
            type: 'enum',
            setValue: (value) => {
                this.groupType = value;
            }
        },
        TreeSortMode2: {
            type: 'enum',
            setValue: (value) => {
                this.sortType = value;
            }
        },
        EditorDefaultSkin: {
            type: 'bool',
            setValue: (value) => {
                this.skin.useDefaultSkinInEditor = value;
            }
        },
        ComboColourSliderBall: {
            type: 'bool',
            setValue: (value) => {
                this.skin.tintSliderBall = value;
            }
        },
        IgnoreBeatmapSkins: {
            type: 'bool',
            setValue: (value) => {
                this.skin.ignoreBeatmapSkins = value;
            }
        },
        Skin: {
            type: 'bstring',
            setValue: (value) => {
                this.skin.name = value;
            }
        },
        UseTaikoSkin: {
            type: 'bool',
            setValue: (value) => {
                this.skin.useTaikoSkin = value;
            }
        }
    };

    private bindingList: Record<number, IBindable> = {
        [Bindings.OsuLeft]: {
            setValue: (value: number) => {
                this.keybinds.osu.k1 = VirtualKeyCode[value];
            }
        },
        [Bindings.OsuRight]: {
            setValue: (value: number) => {
                this.keybinds.osu.k2 = VirtualKeyCode[value];
            }
        },
        [Bindings.OsuSmoke]: {
            setValue: (value: number) => {
                this.keybinds.osu.smokeKey = VirtualKeyCode[value];
            }
        },
        [Bindings.FruitsDash]: {
            setValue: (value: number) => {
                this.keybinds.fruits.Dash = VirtualKeyCode[value];
            }
        },
        [Bindings.FruitsLeft]: {
            setValue: (value: number) => {
                this.keybinds.fruits.k1 = VirtualKeyCode[value];
            }
        },
        [Bindings.FruitsRight]: {
            setValue: (value: number) => {
                this.keybinds.fruits.k2 = VirtualKeyCode[value];
            }
        },
        [Bindings.TaikoInnerLeft]: {
            setValue: (value: number) => {
                this.keybinds.taiko.innerLeft = VirtualKeyCode[value];
            }
        },
        [Bindings.TaikoInnerRight]: {
            setValue: (value: number) => {
                this.keybinds.taiko.innerRight = VirtualKeyCode[value];
            }
        },
        [Bindings.TaikoOuterLeft]: {
            setValue: (value: number) => {
                this.keybinds.taiko.outerLeft = VirtualKeyCode[value];
            }
        },
        [Bindings.TaikoOuterRight]: {
            setValue: (value: number) => {
                this.keybinds.taiko.outerRight = VirtualKeyCode[value];
            }
        },
        [Bindings.QuickRetry]: {
            setValue: (value: number) => {
                this.keybinds.quickRetry = VirtualKeyCode[value];
            }
        }
    };

    setConfigValue(process: Process, address: number, position: number = 0) {
        try {
            const offset =
                process.readInt(address + 0x8) + 0x8 + 0x10 * position;
            const keyAddress = process.readInt(offset);

            const key = process.readSharpString(keyAddress);
            const bindable = process.readInt(offset + 0x4);

            if (!this.configList[key]) {
                // console.log('config', key);
                return;
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
                        process.readInt(offset + 0x4)
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
                // console.log(position, key, value);

                this.configList[key].setValue(value);
            }
        } catch (exc) {
            wLogger.error("ATD(setConfigValue) Can't update config state");
            wLogger.debug(exc);
        }
    }

    setBindingValue(process: Process, address: number, position: number = 0) {
        try {
            const current =
                process.readInt(address + 0x8) + 0x8 + 0x10 * position;

            const key = process.readInt(current);
            const value = process.readInt(current + 0xc);

            const bindable = this.bindingList[key];
            if (bindable) {
                // console.log(position, Bindings[key], VirtualKeyCode[value]);

                bindable.setValue(value);
            } else {
                // console.log('binding', key);
            }
        } catch (exc) {
            wLogger.error("ATD(setBindingValue) Can't update config state");
            wLogger.debug(exc);
        }
    }

    // preventSpamArray: (number | string)[] = [];

    findConfigOffsets(process: Process, configurationAddr: number) {
        try {
            const rawSharpDictionary =
                process.readSharpDictionary(configurationAddr);
            for (let i = 0; i < rawSharpDictionary.length; i++) {
                const current = rawSharpDictionary[i];
                const keyAddress = process.readInt(current);

                const key = process.readSharpString(keyAddress);

                if (!(key in this.configList)) {
                    continue;
                }

                // console.log(i, current, key);
                this.configPositions.push(i);
            }
        } catch (exc) {
            wLogger.error("ATD(updateConfigState) Can't update config state");
            wLogger.debug(exc);
        }
    }

    findBindingOffsets(process: Process, bindingConfigAddr: number) {
        try {
            // KEEP AS THE REFERENCE TO POSITION OF VALUES
            const rawSharpDictionary =
                process.readSharpDictionary(bindingConfigAddr);
            for (let i = 0; i < rawSharpDictionary.length; i++) {
                const current = rawSharpDictionary[i];
                const key = process.readInt(current);
                // const value = process.readInt(current + 0xc);

                if (!(key in this.bindingList)) {
                    continue;
                }

                // const bindable = Bindings[key];
                // console.log(i, current, bindable, key, value);
                this.bindingPositions.push(i);
            }
        } catch (exc) {
            wLogger.error("ATD(updateConfigState) Can't update config state");
            wLogger.debug(exc);
        }
    }

    updateConfigState(process: Process, configurationAddr: number) {
        try {
            if (this.configPositions.length === 0) {
                this.findConfigOffsets(process, configurationAddr);
                return;
            }

            for (const position of this.configPositions) {
                this.setConfigValue(process, configurationAddr, position);
            }

            if (this.configStateErrorAttempts !== 0) {
                this.configStateErrorAttempts = 0;
            }
        } catch (exc) {
            this.configStateErrorAttempts += 1;

            if (this.configStateErrorAttempts > 5) {
                wLogger.error(
                    "ATD(updateConfigState) Can't update config state"
                );
            }
            wLogger.debug(exc);
        }
    }

    updateBindingState(process: Process, bindingConfigAddr: number) {
        try {
            if (this.bindingPositions.length === 0) {
                this.findBindingOffsets(process, bindingConfigAddr);
                return;
            }

            for (const position of this.bindingPositions) {
                this.setBindingValue(process, bindingConfigAddr, position);
            }

            if (this.bindingStateErrorAttempts !== 0) {
                this.bindingStateErrorAttempts = 0;
            }
        } catch (exc) {
            this.bindingStateErrorAttempts += 1;

            if (this.bindingStateErrorAttempts > 5) {
                wLogger.error(
                    "ATD(updateBindingState) Can't update binding state"
                );
            }
            wLogger.debug(exc);
        }
    }

    updateState() {
        try {
            const { process, patterns } = this.services.getServices([
                'process',
                'patterns'
            ]);

            const { configurationAddr, bindingsAddr } = patterns.getPatterns([
                'configurationAddr',
                'bindingsAddr'
            ]);

            this.updateConfigState(
                process,
                process.readPointer(configurationAddr)
            );

            this.updateBindingState(process, process.readPointer(bindingsAddr));
        } catch (exc) {
            wLogger.error(`S(updateState) ${(exc as any).message}`);
            wLogger.debug(exc);
        }
    }
}
