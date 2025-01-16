import { ClientType, wLogger } from '@tosu/common';

import { AbstractState } from '@/states/index';
import { Bindings, VirtualKeyCode } from '@/utils/bindings';
import {
    Audio,
    Background,
    BindingsList,
    Client,
    ConfigList,
    Cursor,
    Keybinds,
    Mania,
    Mouse,
    Resolution,
    ScoreMeter
} from '@/utils/settings.types';

export class Settings extends AbstractState {
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

    private configList: ConfigList = {
        VolumeUniversal: {
            type: 'int',
            setValue: (value: number) => {
                if (!this.isRealNumber(value)) return;
                this.audio.volume.master = value;
            }
        },
        VolumeEffect: {
            type: 'int',
            setValue: (value: number) => {
                if (!this.isRealNumber(value)) return;
                this.audio.volume.effect = value;
            }
        },
        VolumeMusic: {
            type: 'int',
            setValue: (value: number) => {
                if (!this.isRealNumber(value)) return;
                this.audio.volume.music = value;
            }
        },
        _ReleaseStream: {
            type: 'enum',
            setValue: (value: number) => {
                if (!this.isRealNumber(value)) return;
                this.client.branch = value;
            }
        },
        DimLevel: {
            type: 'int',
            setValue: (value: number) => {
                if (!this.isRealNumber(value)) return;
                this.background.dim = value;
            }
        },
        ShowStoryboard: {
            type: 'bool',
            setValue: (value: boolean) => {
                if (typeof value !== 'boolean') return;
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
            setValue: (value: number) => {
                if (!this.isRealNumber(value)) return;
                this.scoreMeter.type = value;
            }
        },
        ScoreMeterScale: {
            type: 'double',
            setValue: (value: number) => {
                if (!this.isRealNumber(value)) return;
                this.scoreMeter.size = parseFloat((value || 0).toFixed(2));
            }
        },
        Offset: {
            type: 'int',
            setValue: (value: number) => {
                if (!this.isRealNumber(value)) return;
                this.audio.offset.universal = value;
            }
        },
        CursorSize: {
            type: 'double',
            setValue: (value: number) => {
                if (!this.isRealNumber(value)) return;
                this.cursor.size = parseFloat((value || 0).toFixed(2));
            }
        },
        MouseSpeed: {
            type: 'double',
            setValue: (value: number) => {
                if (!this.isRealNumber(value)) return;
                this.mouse.sensitivity = parseFloat((value || 0).toFixed(2));
            }
        },
        Fullscreen: {
            type: 'bool',
            setValue: (value: boolean) => {
                if (typeof value !== 'boolean') return;
                this.resolution.fullscreen = value;
            }
        },
        Width: {
            type: 'int',
            setValue: (value: number) => {
                if (!this.isRealNumber(value)) return;
                this.resolution.width = value;
            }
        },
        Height: {
            type: 'int',
            setValue: (value: number) => {
                if (!this.isRealNumber(value)) return;
                this.resolution.height = value;
            }
        },
        WidthFullscreen: {
            type: 'int',
            setValue: (value: number) => {
                if (!this.isRealNumber(value)) return;
                this.resolution.widthFullscreen = value;
            }
        },
        HeightFullscreen: {
            type: 'int',
            setValue: (value: number) => {
                if (!this.isRealNumber(value)) return;
                this.resolution.heightFullscreen = value;
            }
        },
        AutomaticCursorSizing: {
            type: 'bool',
            setValue: (value: boolean) => {
                if (typeof value !== 'boolean') return;
                this.cursor.autoSize = value;
            }
        },
        IgnoreBeatmapSamples: {
            type: 'bool',
            setValue: (value: boolean) => {
                if (typeof value !== 'boolean') return;
                this.audio.ignoreBeatmapSounds = value;
            }
        },
        SkinSamples: {
            type: 'bool',
            setValue: (value: boolean) => {
                if (typeof value !== 'boolean') return;
                this.audio.useSkinSamples = value;
            }
        },
        LastVersion: {
            type: 'bstring',
            setValue: (value: string) => {
                if (!(typeof value === 'string' && value.length <= 15)) return;
                this.client.version = value;
            }
        },
        ManiaSpeedBPMScale: {
            type: 'bool',
            setValue: (value: boolean) => {
                if (typeof value !== 'boolean') return;
                this.mania.speedBPMScale = value;
            }
        },
        UsePerBeatmapManiaSpeed: {
            type: 'bool',
            setValue: (value: boolean) => {
                if (typeof value !== 'boolean') return;
                this.mania.usePerBeatmapSpeedScale = value;
            }
        },
        MouseDisableButtons: {
            type: 'bool',
            setValue: (value: boolean) => {
                if (typeof value !== 'boolean') return;
                this.mouse.disableButtons = value;
            }
        },
        MouseDisableWheel: {
            type: 'bool',
            setValue: (value: boolean) => {
                if (typeof value !== 'boolean') return;
                this.mouse.disableWheel = value;
            }
        },
        ProgressBarType: {
            type: 'enum',
            setValue: (value: number) => {
                if (!this.isRealNumber(value)) return;
                this.progressBarType = value;
            }
        },
        RankType: {
            type: 'enum',
            setValue: (value: number) => {
                if (!this.isRealNumber(value)) return;
                this.leaderboardType = value;
            }
        },
        UpdatePending: {
            type: 'bool',
            setValue: (value: boolean) => {
                if (typeof value !== 'boolean') return;
                this.client.updateAvailable = value;
            }
        },

        UseSkinCursor: {
            type: 'bool',
            setValue: (value: boolean) => {
                if (typeof value !== 'boolean') return;
                this.cursor.useSkinCursor = value;
            }
        },
        RawInput: {
            type: 'bool',
            setValue: (value: boolean) => {
                if (typeof value !== 'boolean') return;
                this.mouse.rawInput = value;
            }
        },
        TreeSortMode: {
            type: 'enum',
            setValue: (value: number) => {
                if (!this.isRealNumber(value)) return;
                this.groupType = value;
            }
        },
        TreeSortMode2: {
            type: 'enum',
            setValue: (value: number) => {
                if (!this.isRealNumber(value)) return;
                this.sortType = value;
            }
        },
        EditorDefaultSkin: {
            type: 'bool',
            setValue: (value: boolean) => {
                if (typeof value !== 'boolean') return;
                this.skin.useDefaultSkinInEditor = value;
            }
        },
        ComboColourSliderBall: {
            type: 'bool',
            setValue: (value: boolean) => {
                if (typeof value !== 'boolean') return;
                this.skin.tintSliderBall = value;
            }
        },
        IgnoreBeatmapSkins: {
            type: 'bool',
            setValue: (value: boolean) => {
                if (typeof value !== 'boolean') return;
                this.skin.ignoreBeatmapSkins = value;
            }
        },
        Skin: {
            type: 'bstring',
            setValue: (value: string) => {
                if (!(typeof value === 'string' && value.length <= 256)) return;
                this.skin.name = value;
            }
        },
        UseTaikoSkin: {
            type: 'bool',
            setValue: (value: boolean) => {
                if (typeof value !== 'boolean') return;
                this.skin.useTaikoSkin = value;
            }
        }
    };

    private bindingList: BindingsList = {
        [Bindings.OsuLeft]: {
            setValue: (value: number) => {
                if (!this.isRealNumber(value)) return;
                this.keybinds.osu.k1 = VirtualKeyCode[value];
            }
        },
        [Bindings.OsuRight]: {
            setValue: (value: number) => {
                if (!this.isRealNumber(value)) return;
                this.keybinds.osu.k2 = VirtualKeyCode[value];
            }
        },
        [Bindings.OsuSmoke]: {
            setValue: (value: number) => {
                if (!this.isRealNumber(value)) return;
                this.keybinds.osu.smokeKey = VirtualKeyCode[value];
            }
        },
        [Bindings.FruitsDash]: {
            setValue: (value: number) => {
                if (!this.isRealNumber(value)) return;
                this.keybinds.fruits.Dash = VirtualKeyCode[value];
            }
        },
        [Bindings.FruitsLeft]: {
            setValue: (value: number) => {
                if (!this.isRealNumber(value)) return;
                this.keybinds.fruits.k1 = VirtualKeyCode[value];
            }
        },
        [Bindings.FruitsRight]: {
            setValue: (value: number) => {
                if (!this.isRealNumber(value)) return;
                this.keybinds.fruits.k2 = VirtualKeyCode[value];
            }
        },
        [Bindings.TaikoInnerLeft]: {
            setValue: (value: number) => {
                if (!this.isRealNumber(value)) return;
                this.keybinds.taiko.innerLeft = VirtualKeyCode[value];
            }
        },
        [Bindings.TaikoInnerRight]: {
            setValue: (value: number) => {
                if (!this.isRealNumber(value)) return;
                this.keybinds.taiko.innerRight = VirtualKeyCode[value];
            }
        },
        [Bindings.TaikoOuterLeft]: {
            setValue: (value: number) => {
                if (!this.isRealNumber(value)) return;
                this.keybinds.taiko.outerLeft = VirtualKeyCode[value];
            }
        },
        [Bindings.TaikoOuterRight]: {
            setValue: (value: number) => {
                if (!this.isRealNumber(value)) return;
                this.keybinds.taiko.outerRight = VirtualKeyCode[value];
            }
        },
        [Bindings.QuickRetry]: {
            setValue: (value: number) => {
                if (!this.isRealNumber(value)) return;
                this.keybinds.quickRetry = VirtualKeyCode[value];
            }
        }
    };

    isRealNumber(value: any) {
        return typeof value === 'number' && !isNaN(value) && isFinite(value);
    }

    updateConfigState(configurationAddr: number) {
        try {
            if (this.configPositions.length === 0) {
                const offsets = this.game.memory.configOffsets(
                    configurationAddr,
                    this.configList
                );
                if (offsets instanceof Error) throw offsets;

                this.configPositions = offsets;
            }

            for (const position of this.configPositions) {
                try {
                    const result = this.game.memory.configValue(
                        configurationAddr,
                        position,
                        this.configList
                    );

                    if (result instanceof Error) throw result;
                    if (result === null || !result.key || !result.value)
                        continue;

                    this.configList[result.key].setValue(result.value);

                    this.resetReportCount(
                        `settings updateConfigState [${position}]`
                    );
                } catch (exc) {
                    this.reportError(
                        `settings updateConfigState [${position}]`,
                        10,
                        ClientType[this.game.client],
                        this.game.pid,
                        `settings updateConfigState [${position}]`,
                        (exc as any).message
                    );
                    wLogger.debug(
                        ClientType[this.game.client],
                        this.game.pid,
                        `settings updateConfigState [${position}]`,
                        exc
                    );
                }
            }

            this.resetReportCount('settings updateConfigState');
        } catch (exc) {
            this.reportError(
                'settings updateConfigState',
                10,
                ClientType[this.game.client],
                this.game.pid,
                `settings updateConfigState`,
                (exc as any).message
            );
            wLogger.debug(
                ClientType[this.game.client],
                this.game.pid,
                `settings updateConfigState`,
                exc
            );
        }
    }

    updateBindingState(bindingConfigAddr: number) {
        try {
            if (this.bindingPositions.length === 0) {
                const offsets = this.game.memory.bindingsOffsets(
                    bindingConfigAddr,
                    this.bindingList
                );
                if (offsets instanceof Error) throw offsets;

                this.bindingPositions = offsets;
            }

            for (const position of this.bindingPositions) {
                try {
                    const result = this.game.memory.bindingValue(
                        bindingConfigAddr,
                        position
                    );
                    if (result instanceof Error) throw result;

                    const bindable = this.bindingList[result.key];
                    if (bindable === null || bindable === undefined) {
                        continue;
                    }

                    bindable.setValue(result.value);

                    this.resetReportCount(
                        `settings updateBindingState [${position}]`
                    );
                } catch (exc) {
                    this.reportError(
                        `settings updateBindingState [${position}]`,
                        10,
                        ClientType[this.game.client],
                        this.game.pid,
                        `settings updateBindingState [${position}]`,
                        (exc as any).message
                    );
                    wLogger.debug(
                        ClientType[this.game.client],
                        this.game.pid,
                        `settings updateBindingState [${position}]`,
                        exc
                    );
                }
            }

            this.resetReportCount('settings updateBindingState');
        } catch (exc) {
            this.reportError(
                'settings updateBindingState',
                10,
                ClientType[this.game.client],
                this.game.pid,
                `settings updateBindingState`,
                (exc as any).message
            );
            wLogger.debug(
                ClientType[this.game.client],
                this.game.pid,
                `settings updateBindingState`,
                exc
            );
        }
    }

    updateState() {
        try {
            const pointers = this.game.memory.settingsPointers();
            if (pointers instanceof Error) throw pointers;

            this.updateConfigState(pointers.config);
            this.updateBindingState(pointers.binding);

            this.resetReportCount('settings updatestate');
        } catch (exc) {
            this.reportError(
                'settings updatestate',
                10,
                ClientType[this.game.client],
                this.game.pid,
                `settings updatestate`,
                (exc as any).message
            );
            wLogger.debug(
                ClientType[this.game.client],
                this.game.pid,
                `settings updatestate`,
                exc
            );
        }
    }
}
