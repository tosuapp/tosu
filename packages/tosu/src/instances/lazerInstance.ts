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

    injectGameOverlay(): void {
        throw new Error('Method not implemented.');
    }

    async regularDataLoop(): Promise<void> {
        wLogger.debug('SM(lazer:startDataLoop) starting');

        const { global, menu, beatmapPP, gameplay, resultScreen } =
            this.getServices([
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

                if (global.status === 7) {
                    resultScreen.updateState();
                }

                const currentMods =
                    global.status === 2
                        ? gameplay.mods
                        : global.status === 7
                          ? resultScreen.mods
                          : global.menuMods;

                const currentMode =
                    global.status === 2
                        ? gameplay.mode
                        : global.status === 7
                          ? resultScreen.mode
                          : menu.gamemode;

                const currentState = `${menu.checksum}:${currentMode}:${currentMods}`;

                if (global.gameFolder && this.previousState !== currentState) {
                    beatmapPP.updateMapMetadata(0, 0, true);

                    this.previousState = currentState;
                }

                switch (global.status) {
                    case 0: // anything not in the map
                        if (resultScreen.playerName) {
                            resultScreen.init();
                        }
                        break;
                    case 2: // is playing (after player is loaded)
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
                    case 7: // result screen
                        resultScreen.updatePerformance();
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

        switch (global.status) {
            case 2:
                if (global.playTime < 150) {
                    break;
                }

                if (config.enableKeyOverlay) {
                    gameplay.updateKeyOverlay();
                }
                gameplay.updateHitErrors();
                break;
            default:
                gameplay.resetKeyOverlay();
                break;
        }

        setTimeout(() => {
            this.preciseDataLoop(global, gameplay);
        }, config.preciseDataPollRate);
    }
}
