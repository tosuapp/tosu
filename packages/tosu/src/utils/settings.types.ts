export type AllowedTypes =
    | 'bool'
    | 'byte'
    | 'int'
    | 'double'
    | 'string'
    | 'bstring'
    | 'enum';

export type ConfigList = Record<string, [AllowedTypes, valuePath: string]>;
export type BindingsList = Record<number, [AllowedTypes, valuePath: string]>;

export type SettingsObject = Record<string, string | number | boolean>;

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

export interface Volume {
    masterInactive: number;
    master: number;
    music: number;
    effect: number;
}

export interface Audio {
    ignoreBeatmapSounds: boolean;
    useSkinSamples: boolean;
    volume: Volume;
    offset: Offset;
}

export interface Background {
    storyboard: boolean;
    video: boolean;
    blur: number;
    dim: number;
}

export interface Client {
    updateAvailable: boolean;
    branch: number;
    version: string;
}

export interface Resolution {
    fullscreen: boolean;
    width: number;
    height: number;
    widthFullscreen: number;
    heightFullscreen: number;
}

export interface ScoreMeter {
    type: number;
    size: number;
}

export interface Offset {
    universal: number;
}

export interface Cursor {
    useSkinCursor: boolean;
    autoSize: boolean;
    menuSize: number;
    size: number;
}

export interface Mouse {
    disableButtons: boolean;
    disableWheel: boolean;
    rawInput: boolean;
    highPrecision: boolean;
    sensitivity: number;
}

export interface Mania {
    speedBPMScale: boolean;
    usePerBeatmapSpeedScale: boolean;
}

export interface Tablet {
    enabled: boolean;
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    pressureThreshold: number;
}
