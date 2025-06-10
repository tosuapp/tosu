import { ClientType, setNestedValue, wLogger } from '@tosu/common';

import { AbstractState } from '@/states/index';
import {
    Audio,
    Background,
    Client,
    Cursor,
    Keybinds,
    Mania,
    Mouse,
    Resolution,
    ScoreMeter,
    Tablet
} from '@/utils/settings.types';

export class Settings extends AbstractState {
    audio: Audio = {
        ignoreBeatmapSounds: false,
        useSkinSamples: false,
        volume: {
            masterInactive: 0,
            master: 0,
            music: 0,
            effect: 0
        },
        offset: { universal: 0 }
    };

    background: Background = {
        storyboard: false,
        video: false,
        blur: 0,
        dim: 0
    };

    client: Client = { updateAvailable: false, branch: 0, version: '' };
    resolution: Resolution = {
        fullscreen: false,
        width: 0,
        height: 0,
        widthFullscreen: 0,
        heightFullscreen: 0
    };

    scoreMeter: ScoreMeter = { type: 0, size: 0 };
    cursor: Cursor = {
        useSkinCursor: false,
        autoSize: false,
        size: 0,
        menuSize: 0
    };

    mouse: Mouse = {
        highPrecision: false,
        rawInput: false,
        disableButtons: false,
        disableWheel: false,
        sensitivity: 0
    };

    tablet: Tablet = {
        enabled: false,
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        rotation: 0,
        pressureThreshold: 0
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

    updateState() {
        try {
            const settings = this.game.memory.settings();
            if (settings instanceof Error) throw settings;

            const array = Object.entries(settings);
            for (let i = 0; i < array.length; i++) {
                const config = array[i];

                setNestedValue(this, config[0], config[1]);
            }

            this.game.resetReportCount('settings updatestate');
        } catch (exc) {
            this.game.reportError(
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
