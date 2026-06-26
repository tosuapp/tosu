import * as semver from 'semver';

import { dependencies } from '../package.json';

const CALCULATOR_VERSION = new semver.SemVer(
    dependencies['@tosuapp/lazer-calculator']
);

const PLATFORM_KEY = `${process.platform}-${process.arch}`;
const VERSION_RANGE = `^${CALCULATOR_VERSION.version}`;

export function getFullPrebuiltPackageName() {
    return `@tosuapp/${getPrebuiltPackageName()}`;
}

export function isCompatibleVersion(version: string): boolean {
    return semver.satisfies(version, VERSION_RANGE, {
        includePrerelease: true
    });
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
