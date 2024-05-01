export interface ISettings {
    type: ISettingsType;
    title: string;
    options?: any[];
    description: string;
    value: any;
}

export type ISettingsCompact = { [key: string]: any };

export type ISettingsType =
    | 'text'
    | 'number'
    | 'password'
    | 'checkbox'
    | 'options'
    | 'color'
    | 'note';

export interface ICounter {
    folderName: string;
    name: string;
    author: string;
    resolution: number[];
    authorlinks: string[];
    settings: ISettings[];

    usecase?: string;
    compatiblewith?: string;
    assets?: {
        type: string;
        url: string;
    }[];
    downloadLink?: string;
}
