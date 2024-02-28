export interface Keybinds {
    osu: KeybindsOsu;
    fruits: KeybindsFruits;
    taiko: KeybindsTaiko;
    quickRetry: string;
}

export interface KeybindsOsu {
    k1: string;
    k2: string;
    smokeKey: string;
}

export interface KeybindsFruits {
    k1: string;
    k2: string;
    Dash: string;
}

export interface KeybindsTaiko {
    innerLeft: string;
    innerRight: string;
    outerLeft: string;
    outerRight: string;
}

interface Volume {
    master: number;
    music: number;
    effect: number;
}

interface Audio {
    ignoreBeatmapSounds: boolean;
    useSkinSamples: boolean;
    volume: Volume;
}

interface Background {
    dim: number;
    video: boolean;
    storyboard: boolean;
}

interface Client {
    updateAvailable: boolean;
    branch: number;
    version: string;
}

interface Resolution {
    fullscreen: boolean;
    width: number;
    height: number;
    widthFullscreen: number;
    heightFullscreen: number;
}

interface ScoreMeter {
    type: number;
    size: number;
}

interface Offset {
    universal: number;
}

interface Cursor {
    useSkinCursor: boolean;
    autoSize: boolean;
    size: number;
}

interface Mouse {
    disableButtons: boolean;
    disableWheel: boolean;
    rawInput: boolean;
    sensitivity: number;
}

interface Mania {
    speedBPMScale: boolean;
    usePerBeatmapSpeedScale: boolean;
}

export class Settings {
    audio: Audio = {
        ignoreBeatmapSounds: false,
        useSkinSamples: false,
        volume: {
            master: 0,
            music: 0,
            effect: 0
        }
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
    offset: Offset = { universal: 0 };
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
    progressBarType: boolean = false;

    showInterface: boolean = false;
    gameFolder: string = '';
    skinFolder: string = '';
    songsFolder: string = '';

    setShowInterface(value: boolean) {
        this.showInterface = value;
    }

    setGameFolder(value: string) {
        this.gameFolder = value;
    }

    setSkinFolder(value: string) {
        this.skinFolder = value;
    }

    setSongsFolder(value: string) {
        this.songsFolder = value;
    }
}
