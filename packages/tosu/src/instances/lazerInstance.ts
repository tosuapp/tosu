import {
    Bitness,
    ClientType,
    GameState,
    config,
    sleep,
    wLogger
} from '@tosu/common';

import { LazerMemory } from '@/memory/lazer';
import { Gameplay } from '@/states/gameplay';
import { Global } from '@/states/global';

import { AbstractInstance } from '.';

export class LazerInstance extends AbstractInstance {
    gameOverlayAllowed = true;
    memory: LazerMemory;
    previousCombo: number = 0;

    constructor(pid: number) {
        super(pid, Bitness.x64);

        this.memory = new LazerMemory(this.process, this);
    }

    async regularDataLoop(): Promise<void> {
        wLogger.debug(ClientType[this.client], this.pid, 'regularDataLoop');

        const {
            global,
            menu,
            beatmapPP,
            gameplay,
            resultScreen,
            user,
            lazerMultiSpectating
        } = this.getServices([
            'global',
            'menu',
            'bassDensity',
            'beatmapPP',
            'gameplay',
            'resultScreen',
            'settings',
            'tourneyManager',
            'user',
            'lazerMultiSpectating'
        ]);

        while (!this.isDestroyed) {
            try {
                const globalUpdate = global.updateState();
                if (globalUpdate === 'not-ready') {
                    await sleep(config.pollRate);
                    continue;
                }

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
                if (global.status === GameState.resultScreen) {
                    const resultUpdate = resultScreen.updateState();
                    if (resultUpdate === 'not-ready') {
                        await sleep(config.pollRate);
                        continue;
                    }
                }

                const currentMods =
                    global.status === GameState.play
                        ? gameplay.mods
                        : global.status === GameState.resultScreen
                          ? resultScreen.mods
                          : global.menuMods;

                const currentMode =
                    global.status === GameState.play
                        ? gameplay.mode
                        : global.status === GameState.resultScreen
                          ? resultScreen.mode
                          : menu.gamemode;

                const currentState = `${menu.checksum}:${currentMode}:${currentMods.checksum}`;
                const updateGraph =
                    this.previousState !== currentState ||
                    this.previousMP3Length !== menu.mp3Length;
                if (global.gameFolder && this.previousState !== currentState) {
                    const metadataUpdate = beatmapPP.updateMapMetadata(
                        currentMods,
                        currentMode,
                        true
                    );
                    if (metadataUpdate === 'not-ready') {
                        await sleep(config.pollRate);
                        continue;
                    }

                    beatmapPP.updateGraph(currentMods.array);
                    this.previousState = currentState;
                }

                if (global.gameFolder && updateGraph) {
                    beatmapPP.updateGraph(currentMods.array);
                    this.previousMP3Length = menu.mp3Length;
                }

                beatmapPP.updateEventsStatus(global.playTime, currentMods.rate);

                switch (global.status) {
                    case GameState.menu:
                        // FIXME: TODO
                        // bassDensity.updateState();
                        break;

                    case GameState.edit:
                        if (this.previousTime === global.playTime) break;

                        this.previousTime = global.playTime;
                        beatmapPP.updateEditorPP();
                        break;

                    case GameState.selectPlay:
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

                    case GameState.play: // is playing (after player is loaded)
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

                        // support replay rewind
                        if (this.previousCombo > gameplay.combo) {
                            gameplay.resetQuick();
                        }

                        this.previousTime = global.playTime;
                        this.previousCombo = gameplay.combo;
                        break;

                    case GameState.resultScreen:
                        resultScreen.updatePerformance();
                        break;

                    case GameState.selectMulti:
                    case GameState.lobby:
                        if (global.isMultiSpectating) {
                            lazerMultiSpectating.updateState();
                        }

                        break;

                    default:
                        gameplay.init(undefined, `default-${global.status}`);
                        resultScreen.init();
                        break;
                }

                user.updateState();

                await sleep(config.pollRate);
            } catch (exc) {
                wLogger.error(
                    ClientType[this.client],
                    this.pid,
                    'regularDataLoop',
                    'error within a loop',
                    (exc as Error).message
                );
                wLogger.debug(
                    ClientType[this.client],
                    this.pid,
                    'regularDataLoop',
                    'error within a loop',
                    exc
                );
            }
        }
    }

    preciseDataLoop(global: Global, gameplay: Gameplay): void {
        if (this.isDestroyed) return;
        global.updatePreciseState();

        switch (global.status) {
            case GameState.play:
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
