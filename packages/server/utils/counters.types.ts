export interface ISettings {
    uniqueID?: number;
    type: 'text' | 'number' | 'checkbox' | 'options' | 'color' | 'note';
    title: string;
    description: string;
    value: any;
}

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
