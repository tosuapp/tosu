import type { PpModule } from '..';
import { getFullPrebuiltPackageName, isCompatibleVersion } from '../package';
import type { NpmPackage, NpmPackageVersion } from './types';

export const onlinePpRegistry = {
    async fetchAll(): Promise<PpModule[]> {
        const pkg = await npmFetch<NpmPackage>(getFullPrebuiltPackageName());

        const list: PpModule[] = [];

        for (const version in pkg.versions) {
            if (!isCompatibleVersion(version)) continue;

            list.push({ type: 'release', version });
        }

        for (const tag in pkg['dist-tags']) {
            const version = pkg['dist-tags'][tag];
            if (!isCompatibleVersion(version)) continue;

            list.push({ type: 'dist-tag', tag });
        }

        return list;
    },

    async fetch(specifier: string): Promise<NpmPackageVersion | undefined> {
        try {
            const pkg = await npmFetch<NpmPackageVersion>(
                `${getFullPrebuiltPackageName()}/${specifier}`
            );

            return pkg;
        } catch {}
    }
};

async function npmFetch<T>(path: string): Promise<T> {
    const res = await fetch(new URL(path, 'https://registry.npmjs.org/'));
    const json = await res.json();

    return json as T;
}
