import { wLogger } from '@tosu/common';
import * as internalCalculator from '@tosuapp/lazer-calculator-prebuilt';
import EventEmitter from 'node:events';
import { resolve } from 'node:path';

import { downloadCalculator } from './downloader';
import { isCompatibleVersion } from './package';
import { onlinePpRegistry } from './registry';

export type LazerCalculator =
    typeof import('@tosuapp/lazer-calculator-prebuilt');

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
            wLogger.info('Successfully loaded external pp calculator.');
        } catch (err) {
            wLogger.error(
                'Failed to load external pp calculator. Falling back to internal pp calculator.'
            );
            wLogger.debug('Failed to load pp calculator:', err);
            currentCalculator = internalCalculator;
        }

        this.events.emit('changed');
    }
};

async function resolveCalculator(module: PpModule): Promise<LazerCalculator> {
    switch (module.type) {
        case 'internal': {
            wLogger.info('Using internal pp calculator');
            return internalCalculator;
        }

        case 'dist-tag': {
            wLogger.info(
                `Loading external pp calculator. channel: ${module.tag}`
            );

            const pkg = await onlinePpRegistry.fetch(module.tag);
            if (!isCompatibleVersion(pkg.version)) {
                const msg = `Incompatible pp calculator. channel: ${module.tag}`;
                wLogger.error(msg);

                throw new Error(msg);
            }

            return loadCalculator(
                await downloadCalculator(pkg.version, () => pkg.dist)
            );
        }

        case 'release': {
            wLogger.info(
                `Loading external pp calculator. version: ${module.version}`
            );

            if (!isCompatibleVersion(module.version)) {
                const msg = `Incompatible pp calculator. version: ${module.version}`;
                wLogger.error(msg);

                throw new Error(msg);
            }

            return loadCalculator(
                await downloadCalculator(module.version, async () => {
                    const pkg = await onlinePpRegistry.fetch(module.version);
                    return pkg.dist;
                })
            );
        }

        case 'local': {
            wLogger.info(`Loading local pp calculator. path: ${module.path}`);

            return loadCalculator(module.path);
        }
    }
}

function loadCalculator(path: string): LazerCalculator {
    return require(resolve(process.cwd(), path)) as LazerCalculator;
}

export { ppModuleManager, onlinePpRegistry };
