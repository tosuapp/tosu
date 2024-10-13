import { config, wLogger } from '@tosu/common';
import { injectGameOverlay } from '@tosu/game-overlay';

import { AbstractInstance } from '@/instances/index';
import { StableMemory } from '@/memory/stable';

export class OsuInstance extends AbstractInstance {
    memory: StableMemory;

    constructor(pid: number) {
        super(pid);

        this.memory = new StableMemory(this.process, this);
        this.set('memory', new StableMemory(this.process, this));
    }

    async start() {
        wLogger.info(`[${this.pid}] Running memory chimera...`);

        const memoryRepo = this.get('memory');
        if (!memoryRepo) {
            throw new Error('Bases repo not initialized, missed somewhere?');
        }

        while (!this.isReady) {
            try {
                const s1 = performance.now();
                const result = memoryRepo.resolvePatterns();
                if (!result) {
                    throw new Error('Memory resolve failed');
                }

                wLogger.debug(
                    `[${this.pid}] Took ${(performance.now() - s1).toFixed(2)} ms to scan patterns`
                );

                wLogger.info(
                    `[${this.pid}] ALL PATTERNS ARE RESOLVED, STARTING WATCHING THE DATA`
                );
                this.isReady = true;
            } catch (exc) {
                wLogger.error(
                    `[${this.pid}] PATTERN SCANNING FAILED, TRYING ONE MORE TIME...`
                );
                wLogger.debug(exc);
                this.emitter.emit('onResolveFailed', this.pid);
                return;
            }
        }

        /**
         * ENABLING GOSU OVERLAY
         */
        if (config.enableGosuOverlay) {
            await this.injectGameOverlay();
        }

        memoryRepo.initiateDataLoops();
        this.watchProcessHealth();
    }

    async injectGameOverlay() {
        await injectGameOverlay(this.process);
    }
}
