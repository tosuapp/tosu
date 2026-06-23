import { NpmRegistry } from 'npm-registry-sdk';
import * as semver from 'semver';
import { SemVer } from 'semver';

import type { PpModule } from '.';
import { dependencies } from '../package.json';
import { getPrebuiltPackageName } from './package';

const CALCULATOR_VERSION = new SemVer(
    dependencies['@tosuapp/lazer-calculator']
);

const npmRegistry = new NpmRegistry();

const VERSION_RANGE = `^${CALCULATOR_VERSION.version}`;

export const onlinePpRegistry = {
    async fetch(): Promise<PpModule[]> {
        const pkg = await npmRegistry.getPackage(getPrebuiltPackageName());
        const list: PpModule[] = [];

        for (const version in pkg.versions) {
            if (!semver.satisfies(version, VERSION_RANGE)) continue;

            list.push({ type: 'release', version });
        }

        for (const tag in pkg['dist-tags']) {
            const version = pkg['dist-tags'][tag];
            if (!semver.satisfies(version, VERSION_RANGE)) continue;

            list.push({ type: 'dist-tag', tag });
        }

        return list;
    }
};

export async function resolveDistTag(tag: string): Promise<string | undefined> {
    const dist = (await npmRegistry.getDistTags(
        getPrebuiltPackageName()
    )) as Record<string, string>;

    if (!dist[tag] || !semver.satisfies(dist[tag], VERSION_RANGE)) {
        return;
    }

    return dist[tag];
}
