const PLATFORM_KEY = `${process.platform}-${process.arch}`;

export function getPrebuiltPackageName() {
    switch (PLATFORM_KEY) {
        case 'win32-x64':
            return '@tosuapp/lazer-calculator-win32-x64';

        case 'linux-x64':
            return '@tosuapp/lazer-calculator-linux-x64';

        default:
            throw new Error(`Unsupported platform: ${PLATFORM_KEY}`);
    }
}
