import { wLogger } from '@tosu/common';
import * as internalCalculator from '@tosuapp/lazer-calculator';
import EventEmitter from 'node:events';
import { resolve } from 'node:path';

import { downloadCalculator } from './downloader';
import { isCompatibleVersion } from './package';
import { onlinePpRegistry } from './registry';

export type LazerCalculator = typeof import('@tosuapp/lazer-calculator');

export type PpModule =
    | { type: 'internal' }
    | { type: 'dist-tag'; tag: string }
    | { type: 'release'; version: string }
    | { type: 'local'; path: string };

let currentCalculator = internalCalculator;

const ppModuleManager = {
    events: new EventEmitter<{ changed: [] }>(),

    get current(): LazerCalculator {
        return currentCalculator;
    },

    async load(module: PpModule): Promise<void> {
        try {
            currentCalculator = await resolveCalculator(module);
            wLogger.info('[calculator]', 'Successfully loaded calculator.');
        } catch (err) {
            wLogger.error(
                '[calculator] Failed to load external calculator. Falling back to internal calculator.'
            );
            wLogger.debug('Failed to load calculator:', err);
            currentCalculator = internalCalculator;
        }

        this.events.emit('changed');
    }
};

async function resolveCalculator(module: PpModule): Promise<LazerCalculator> {
    switch (module.type) {
        case 'internal': {
            wLogger.info('[calculator]', 'Using internal calculator');
            return internalCalculator;
        }

        case 'dist-tag': {
            wLogger.info(
                '[calculator]',
                `Using dist-tag "${module.tag}" calculator`
            );

            const pkg = await onlinePpRegistry.fetch(module.tag);
            if (!pkg || !isCompatibleVersion(pkg.version)) {
                const msg = `tag "${module.tag}" is not available or not compatible`;
                wLogger.error('[calculator]', msg);

                throw new Error(msg);
            }

            return loadCalculator(
                await downloadCalculator(pkg.version, () => pkg.dist)
            );
        }

        case 'release': {
            wLogger.info(
                '[calculator]',
                `Using release "${module.version}" calculator`
            );

            if (!isCompatibleVersion(module.version)) {
                const msg = `release "${module.version}" is not compatible`;
                wLogger.error('[calculator]', msg);

                throw new Error(msg);
            }

            return loadCalculator(
                await downloadCalculator(module.version, async () => {
                    const pkg = await onlinePpRegistry.fetch(module.version);
                    if (!pkg) {
                        throw new Error(
                            `Calculator version: "${module.version}" is not available for download.`
                        );
                    }

                    return pkg.dist;
                })
            );
        }

        case 'local': {
            wLogger.info(
                '[calculator]',
                `Using local calculator from "${module.path}"`
            );

            return loadCalculator(module.path);
        }
    }
}

function loadCalculator(path: string): LazerCalculator {
    return require(resolve(process.cwd(), path)) as LazerCalculator;
}

export { ppModuleManager, onlinePpRegistry };
