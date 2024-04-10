export * from './utils/downloader';
export * from './utils/logger';
export * from './utils/platforms';
export * from './utils/agruments';
export * from './utils/sleep';
export * from './utils/config';
export * from './utils/unzip';
export * from './utils/directories';

export const JsonSaveParse = (str: string, errorReturn: any) => {
    try {
        return JSON.parse(str);
    } catch (e) {
        return errorReturn;
    }
};
