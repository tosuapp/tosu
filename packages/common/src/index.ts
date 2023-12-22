export * from './utils/downloader';
export * from './utils/logger';
export * from './utils/platforms';
export * from './utils/agruments';

export const sleep = (ms: number) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
};
