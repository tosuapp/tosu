const PLATFORM_KEY = `${process.platform}-${process.arch}`;

export function getFullPrebuiltPackageName() {
    return `@tosuapp/${getPrebuiltPackageName()}`;
}

export function getPrebuiltPackageName() {
    switch (PLATFORM_KEY) {
        case 'win32-x64':
            return 'lazer-calculator-win32-x64';

        case 'linux-x64':
            return 'lazer-calculator-linux-x64';

        default:
            throw new Error(`Unsupported platform: ${PLATFORM_KEY}`);
    }
}
