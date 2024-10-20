import { config, sleep, wLogger } from '@tosu/common';

import { LazerMemory } from '@/memory/lazer';
import { Gameplay } from '@/states/gameplay';
import { Global } from '@/states/global';

import { AbstractInstance } from '.';

export class LazerInstance extends AbstractInstance {
    memory: LazerMemory;
    previousCombo: number = 0;

    constructor(pid: number) {
        super(pid, 64);

        this.memory = new LazerMemory(this.process, this);
    }

    injectGameOverlay(): void {
        throw new Error('Method not implemented.');
    }

    async regularDataLoop(): Promise<void> {
        wLogger.debug('SM(lazer:startDataLoop) starting');

        const { global, menu, beatmapPP, gameplay, resultScreen, user } =
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
                const menuUpdate = menu.updateState();
                if (menuUpdate === 'not-ready') {
                    await sleep(config.pollRate);
                    continue;
                }

                menu.updateMP3Length();

                if (!global.gameFolder) {
                    global.setGameFolder(this.path);
                    global.setSongsFolder(global.memorySongsFolder);
                }

                // update important data before doing rest
                if (global.status === 7) {
                    const resultUpdate = resultScreen.updateState();
                    if (resultUpdate === 'not-ready') {
                        await sleep(config.pollRate);
                        continue;
                    }
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
                const updateGraph =
                    this.previousState !== currentState ||
                    this.previousMP3Length !== menu.mp3Length;
                if (global.gameFolder && this.previousState !== currentState) {
                    beatmapPP.updateMapMetadata(currentMods, currentMode, true);

                    this.previousState = currentState;
                }

                if (global.gameFolder && updateGraph) {
                    beatmapPP.updateGraph(currentMods);
                    this.previousMP3Length = menu.mp3Length;
                }

                beatmapPP.updateRealTimeBPM(global.playTime, currentMods);

                switch (global.status) {
                    case 0:
                        // FIXME: TODO
                        // bassDensity.updateState();
                        break;
                    case 2: // is playing (after player is loaded)
                        // support replay rewind
                        if (this.previousCombo > gameplay.combo) {
                            gameplay.resetQuick();
                        }

                        // Reset gameplay data on retry
                        if (this.previousTime > global.playTime) {
                            gameplay.init(true);
                            beatmapPP.resetAttributes();
                        }

                        // reset before first object
                        if (global.playTime <= beatmapPP.timings.firstObj) {
                            gameplay.resetQuick();
                            break;
                        }

                        gameplay.updateState();

                        this.previousTime = global.playTime;
                        this.previousCombo = gameplay.combo;
                        break;

                    case 5:
                        // Reset Gameplay/ResultScreen data on joining to songSelect
                        if (!gameplay.isDefaultState) {
                            gameplay.init(undefined, '4,5');
                            resultScreen.init();
                            beatmapPP.resetAttributes();
                        }

                        // Reset ResultScreen if we in song select
                        if (resultScreen.playerName) {
                            resultScreen.init();
                        }
                        break;

                    case 7: // result screen
                        resultScreen.updatePerformance();
                        break;

                    default:
                        gameplay.init(undefined, `default-${global.status}`);
                        resultScreen.init();
                        break;
                }

                user.updateState();

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
