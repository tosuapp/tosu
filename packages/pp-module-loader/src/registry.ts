import { NpmRegistry } from 'npm-registry-sdk';

import type { PpModule } from '.';
import { getFullPrebuiltPackageName, isCompatiableVersion } from './package';

const npmRegistry = new NpmRegistry();

export const onlinePpRegistry = {
    async fetch(): Promise<PpModule[]> {
        const pkg = await npmRegistry.getPackage(getFullPrebuiltPackageName());
        const list: PpModule[] = [];

        for (const version in pkg.versions) {
            if (!isCompatiableVersion(version)) continue;

            list.push({ type: 'release', version });
        }

        for (const tag in pkg['dist-tags']) {
            const version = pkg['dist-tags'][tag];
            if (!isCompatiableVersion(version)) continue;

            list.push({ type: 'dist-tag', tag });
        }

        return list;
    }
};

export async function resolveDistTag(tag: string): Promise<string | undefined> {
    const dist = (await npmRegistry.getDistTags(
        getFullPrebuiltPackageName()
    )) as Record<string, string>;

    if (!dist[tag] || !isCompatiableVersion(dist[tag])) {
        return;
    }

    return dist[tag];
}
