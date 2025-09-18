import {
    Bitness,
    ClientType,
    GameState,
    JsonSafeParse,
    config,
    getCachePath,
    sleep,
    wLogger
} from '@tosu/common';
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';

import localOffsets from '@/assets/offsets.json';
import { LazerMemory } from '@/memory/lazer';

import { AbstractInstance } from '.';

export class LazerInstance extends AbstractInstance {
    memory: LazerMemory;
    osuVersion: string;
    previousCombo: number = 0;

    constructor(pid: number) {
        super(pid, Bitness.x64);
        this.memory = new LazerMemory(this.process, this);
    }

    override async initiate() {
        try {
            const cacheFolder = getCachePath();
            if (!fs.existsSync(cacheFolder))
                await fsp.mkdir(cacheFolder, { recursive: true });

            let attempts = 1;
            while (attempts < 5 && !this.osuVersion) {
                if (attempts > 1)
                    wLogger.warn(
                        ClientType[this.client],
                        `Trying to find osu version #${attempts}`
                    );

                try {
                    this.osuVersion = this.memory.gameVersion() || '';

                    wLogger.info(
                        ClientType[this.client],
                        `Version: ${this.osuVersion}`
                    );

                    break;
                } catch (exc) {
                    wLogger.debug(
                        ClientType[this.client],
                        this.pid,
                        'Unable to find osu version',
                        exc
                    );
                } finally {
                    attempts++;
                    await sleep(1000);
                }
            }

            if (!this.osuVersion) {
                wLogger.error(
                    ClientType[this.client],
                    this.pid,
                    'Unable to find osu version, report to devs: https://discord.gg/WX7BTs8kwh'
                );

                this.regularDataLoop();
                this.preciseDataLoop();

                return;
            }

            const controller = new AbortController();
            const links = [
                `https://tosu.app/offsets/${this.osuVersion}.json`,
                `https://osuck.net/offsets/${this.osuVersion}.json`
            ];

            const jsonCache = path.join(cacheFolder, `${this.osuVersion}.json`);
            if (
                localOffsets.OsuVersion !== this.osuVersion &&
                fs.existsSync(jsonCache)
            ) {
                this.memory.offsets = JsonSafeParse({
                    isFile: true,
                    payload: jsonCache,
                    defaultValue: null
                });

                wLogger.info(
                    ClientType[this.client],
                    this.pid,
                    'reading offsets from cache',
                    this.osuVersion
                );
            }

            if (
                this.memory.offsets === null ||
                this.memory.offsets.OsuVersion !== this.osuVersion
            ) {
                for (let i = 0; i < links.length; i++) {
                    const link = links[i];
                    const host = new URL(link).host;

                    const timeout = setTimeout(() => controller.abort, 10_000);
                    try {
                        const request = await fetch(link, {
                            method: 'GET',
                            signal: controller.signal
                        });

                        clearTimeout(timeout);
                        if (!request.ok) {
                            wLogger.error(
                                ClientType[this.client],
                                this.pid,
                                'initiate fetch',
                                host,
                                request.status,
                                request.statusText
                            );
                            continue;
                        }

                        const text = await request.text();
                        const json = JsonSafeParse({
                            isFile: false,
                            payload: text,
                            defaultValue: null
                        });
                        if (json === null) continue;

                        wLogger.info(
                            ClientType[this.client],
                            this.pid,
                            'searching offsets online',
                            host,
                            this.osuVersion
                        );

                        this.memory.offsets = json;
                        await fsp.writeFile(jsonCache, text, 'utf8');

                        break;
                    } catch (exc) {
                        wLogger.error(
                            ClientType[this.client],
                            this.pid,
                            'initiate fetch',
                            (exc as any).message
                        );
                        wLogger.debug(
                            ClientType[this.client],
                            this.pid,
                            'initiate fetch',
                            exc
                        );
                    }
                }
            }

            if (this.memory.offsets === null) {
                wLogger.error(
                    ClientType[this.client],
                    this.pid,
                    'offsets not found for this version',
                    this.osuVersion
                );
                return;
            }

            this.regularDataLoop();
            this.preciseDataLoop();
        } catch (exc) {
            wLogger.error(
                ClientType[this.client],
                this.pid,
                'initiate',
                (exc as Error).message
            );
            wLogger.debug(ClientType[this.client], this.pid, 'initiate', exc);
        }
    }

    async regularDataLoop(): Promise<void> {
        wLogger.debug(ClientType[this.client], this.pid, 'regularDataLoop');

        const {
            global,
            menu,
            beatmapPP,
            gameplay,
            resultScreen,
            settings,
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
                    case GameState.spectating: // is playing (after player is loaded)
                    case GameState.watchingReplay: // is playing (after player is loaded)
                        // Reset gameplay data on retry
                        if (this.previousTime > global.playTime) {
                            gameplay.init(true);
                            beatmapPP.resetAttributes();
                        }

                        // reset before first object
                        if (global.playTime <= beatmapPP.timings.firstObj) {
                            gameplay.resetQuick();
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

                    case GameState.lobby:
                        lazerMultiSpectating.updateState();

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

    async preciseDataLoop(): Promise<void> {
        const { global, gameplay } = this.getServices(['global', 'gameplay']);

        while (!this.isDestroyed) {
            try {
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
