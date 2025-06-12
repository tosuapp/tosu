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

export interface SettingsScoreMeter {
    type: number;
    size: number;
}

export interface SettingsMania {
    speedBPMScale: boolean;
    usePerBeatmapSpeedScale: boolean;
    scrollSpeed: number;
    scrollDirection: number;
}
