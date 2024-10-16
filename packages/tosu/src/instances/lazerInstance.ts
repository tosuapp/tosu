import { config, sleep, wLogger } from '@tosu/common';

import { LazerMemory } from '@/memory/lazer';
import { Gameplay } from '@/states/gameplay';
import { Global } from '@/states/global';

import { AbstractInstance } from '.';

export class LazerInstance extends AbstractInstance {
    memory: LazerMemory;

    constructor(pid: number) {
        super(pid, 64);

        this.memory = new LazerMemory(this.process, this);
    }

    start(): void | Promise<void> {
        super.start();

        this.initiateDataLoops();
        this.watchProcessHealth();
    }

    injectGameOverlay(): void {
        throw new Error('Method not implemented.');
    }

    async regularDataLoop(): Promise<void> {
        wLogger.debug('SM(lazer:startDataLoop) starting');

        const { global, menu, beatmapPP, gameplay } = this.getServices([
            'global',
            'menu',
            'bassDensity',
            'beatmapPP',
            'gameplay',
            'resultScreen',
            'settings',
            'tourneyManager',
            'user'
        ]);

        while (!this.isDestroyed) {
            try {
                global.updateState();
                menu.updateState();

                if (!global.gameFolder) {
                    global.setGameFolder(this.path);
                    global.setSongsFolder(global.memorySongsFolder);
                }

                const currentState = `${menu.checksum}`;

                if (global.gameFolder && this.previousState !== currentState) {
                    beatmapPP.updateMapMetadata(0, 0, true);

                    this.previousState = currentState;
                }

                switch (global.status) {
                    case 0: // anything not in the map
                        break;
                    case 1: // is playing (after player initialized)
                        // Reset gameplay data on retry
                        if (this.previousTime > global.playTime) {
                            gameplay.init(true);
                            beatmapPP.resetAttributes();
                        }

                        // reset before first object
                        if (global.playTime < beatmapPP.timings.firstObj) {
                            gameplay.resetQuick();
                        }

                        this.previousTime = global.playTime;

                        gameplay.updateState();
                        break;
                }

                await sleep(config.pollRate);
            } catch (exc) {
                wLogger.debug(`SM(startDataLoop)[${this.pid}]`, exc);
                wLogger.error(
                    `SM(startDataLoop)[${this.pid}]`,
                    (exc as any).message
                );
            }
        }
    }

    preciseDataLoop(global: Global, gameplay: Gameplay): void {
        if (this.isDestroyed) return;

        global.updatePreciseState();

        setTimeout(() => {
            this.preciseDataLoop(global, gameplay);
        }, config.preciseDataPollRate);
    }
}
