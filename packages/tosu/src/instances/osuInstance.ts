import {
    Bitness,
    ClientType,
    GameState,
    config,
    sleep,
    wLogger
} from '@tosu/common';
import fs from 'fs';

import { AbstractInstance } from '@/instances/index';
import { StableMemory } from '@/memory/stable';
import { safeJoin } from '@/utils/converters';

export class OsuInstance extends AbstractInstance {
    memory: StableMemory;

    constructor(pid: number) {
        super(pid, Bitness.x86);

        this.memory = new StableMemory(this.process, this);
    }

    async regularDataLoop() {
        wLogger.debug(ClientType[this.client], this.pid, 'regularDataLoop');

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
                if (menuUpdate === 'not-ready') continue;

                // osu! calculates audioTrack length a little bit after updating menu, sooo.. lets this thing run regardless of menu updating
                if (menu.folder !== '' && menu.folder !== null) {
                    menu.updateMP3Length();
                }

                if (!global.gameFolder) {
                    global.setGameFolder(this.path);

                    // condition when user have different BeatmapDirectory in osu! config
                    if (fs.existsSync(global.memorySongsFolder)) {
                        global.setSongsFolder(global.memorySongsFolder);
                    } else {
                        global.setSongsFolder(
                            safeJoin(this.path, global.memorySongsFolder)
                        );
                    }
                }

                // update important data before doing rest
                if (global.status === GameState.resultScreen) {
                    const resultUpdate = resultScreen.updateState();
                    if (resultUpdate === 'not-ready') continue;
                }

                settings.updateState();

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
                if (
                    menu.filename?.endsWith('.osu') &&
                    global.gameFolder &&
                    this.previousState !== currentState
                ) {
                    const metadataUpdate = beatmapPP.updateMapMetadata(
                        currentMods,
                        currentMode
                    );
                    if (metadataUpdate === 'not-ready') continue;

                    beatmapPP.updateGraph(currentMods.array);
                    this.previousState = currentState;
                }

                if (
                    menu.filename?.endsWith('.osu') &&
                    global.gameFolder &&
                    updateGraph
                ) {
                    beatmapPP.updateGraph(currentMods.array);
                    this.previousMP3Length = menu.mp3Length;
                }

                beatmapPP.updateEventsStatus(global.playTime, currentMods.rate);

                switch (global.status) {
                    case GameState.menu:
                        bassDensity.updateState();
                        break;

                    case GameState.edit:
                        if (this.previousTime === global.playTime) break;

                        this.previousTime = global.playTime;
                        beatmapPP.updateEditorPP();
                        break;

                    case GameState.selectEdit:
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

                    case GameState.play:
                    case GameState.spectating:
                    case GameState.watchingReplay:
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

                    case GameState.resultScreen:
                        resultScreen.updatePerformance();
                        break;

                    case GameState.tourney:
                        if (!this.isTourneyManager) {
                            this.isTourneyManager = true;
                        }
                        tourneyManager.updateState();
                        break;

                    // do not spam reset on multiplayer and direct
                    case GameState.lobby:
                    case GameState.matchSetup:
                    case GameState.onlineSelection:
                        break;

                    default:
                        gameplay.init(undefined, `default-${global.status}`);
                        resultScreen.init();
                        break;
                }

                if (this.isTourneySpectator) {
                    tourneyManager.updateUser();
                }

                user.updateState();
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
            } finally {
                await sleep(config.pollRate);
            }
        }
    }

    async preciseDataLoop(): Promise<void> {
        const { global, gameplay } = this.getServices(['global', 'gameplay']);

        while (!this.isDestroyed) {
            try {
                global.updatePreciseState();

                switch (global.status) {
                    case GameState.play:
                    case GameState.spectating:
                    case GameState.watchingReplay:
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

                await sleep(config.preciseDataPollRate);
            } catch (exc) {
                wLogger.error(
                    ClientType[this.client],
                    this.pid,
                    'preciseDataLoop',
                    'error within a loop',
                    (exc as Error).message
                );
                wLogger.debug(
                    ClientType[this.client],
                    this.pid,
                    'preciseDataLoop',
                    'error within a loop',
                    exc
                );
            }
        }
    }
}
