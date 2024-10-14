import { config, sleep, wLogger } from '@tosu/common';
import { injectGameOverlay } from '@tosu/game-overlay';
import fs from 'fs';
import path from 'path';

import { AbstractInstance } from '@/instances/index';
import { StableMemory } from '@/memory/stable';
import { Gameplay } from '@/states/gameplay';
import { Global } from '@/states/global';

export class OsuInstance extends AbstractInstance {
    memory: StableMemory;

    constructor(pid: number) {
        super(pid);

        this.memory = new StableMemory(this.process, this);
    }

    async start() {
        super.start();

        /**
         * ENABLING GOSU OVERLAY
         */
        if (config.enableGosuOverlay) {
            await this.injectGameOverlay();
        }

        this.initiateDataLoops();
        this.watchProcessHealth();
    }

    async injectGameOverlay() {
        await injectGameOverlay(this.process);
    }

    async regularDataLoop() {
        try {
            wLogger.debug('SM(startDataLoop) starting');

            const {
                global,
                menu,
                bassDensity,
                beatmapPP,
                gameplay,
                resultScreen,
                settings,
                tourneyManager,
                user
            } = this.getServices([
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

                    // osu! calculates audioTrack length a little bit after updating menu, sooo.. lets this thing run regardless of menu updating
                    if (menu.Folder !== '' && menu.Folder !== null) {
                        menu.updateMP3Length();
                    }

                    if (!global.gameFolder) {
                        global.setGameFolder(this.path);

                        // condition when user have different BeatmapDirectory in osu! config
                        if (fs.existsSync(global.memorySongsFolder)) {
                            global.setSongsFolder(global.memorySongsFolder);
                        } else {
                            global.setSongsFolder(
                                path.join(this.path, global.memorySongsFolder)
                            );
                        }
                    }

                    // update important data before doing rest
                    if (global.status === 7) {
                        const resultUpdate = resultScreen.updateState();
                        if (resultUpdate === 'not-ready') {
                            await sleep(config.pollRate);
                            continue;
                        }
                    }

                    settings.updateState();

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
                              : menu.MenuGameMode;

                    const currentState = `${menu.MD5}:${currentMode}:${currentMods}`;
                    const updateGraph =
                        this.previousState !== currentState ||
                        this.previousMP3Length !== menu.MP3Length;
                    if (
                        menu.Path?.endsWith('.osu') &&
                        global.gameFolder &&
                        this.previousState !== currentState
                    ) {
                        const metadataUpdate = beatmapPP.updateMapMetadata(
                            currentMods,
                            currentMode
                        );
                        if (metadataUpdate === 'not-ready') {
                            await sleep(config.pollRate);
                            continue;
                        }
                        beatmapPP.updateGraph(currentMods);
                        this.previousState = currentState;
                    }

                    if (
                        menu.Path?.endsWith('.osu') &&
                        global.gameFolder &&
                        updateGraph
                    ) {
                        beatmapPP.updateGraph(currentMods);
                        this.previousMP3Length = menu.MP3Length;
                    }

                    beatmapPP.updateRealTimeBPM(global.playTime, currentMods);

                    switch (global.status) {
                        case 0:
                            bassDensity.updateState();
                            break;

                        case 1:
                            if (this.previousTime === global.playTime) break;

                            this.previousTime = global.playTime;
                            beatmapPP.updateEditorPP();
                            break;

                        // EditorSongSElect and SongSelect
                        case 4:
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

                        case 2:
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

                        case 7:
                            resultScreen.updatePerformance();
                            break;

                        case 22:
                            if (!this.isTourneyManager) {
                                this.isTourneyManager = true;
                            }
                            await tourneyManager.updateState();
                            break;

                        // do not spam reset on multiplayer and direct
                        case 11:
                        case 12:
                        case 15:
                            break;

                        default:
                            gameplay.init(
                                undefined,
                                `default-${global.status}`
                            );
                            resultScreen.init();
                            break;
                    }

                    if (this.isTourneySpectator) {
                        tourneyManager.updateUser();
                    }

                    user.updateState();
                } catch (exc) {
                    wLogger.error(
                        `SM(startDataLoop)[${this.pid}]`,
                        'error happend while another loop executed'
                    );
                    wLogger.debug(exc);
                }

                await sleep(config.pollRate);
            }
        } catch (exc) {
            wLogger.debug(`SM(startDataLoop)[${this.pid}]`, exc);
            wLogger.error(
                `SM(startDataLoop)[${this.pid}]`,
                (exc as any).message
            );
        }
    }

    preciseDataLoop(global: Global, gameplay: Gameplay) {
        if (this.isDestroyed === true) return;
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
