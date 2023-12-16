import EventEmitter from 'events';
import fs from 'fs';
import { injectGameOverlay } from 'game-overlay';
import path from 'path';
import { Process } from 'tsprocess/dist/process';

import { buildResult } from '@/api/utils/buildResult';
import { config } from '@/config';
import { AllTimesData } from '@/entities/AllTimesData';
import { BassDensityData } from '@/entities/BassDensityData';
import { BeatmapPPData } from '@/entities/BeatmapPpData';
import { DataRepo } from '@/entities/DataRepoList';
import { GamePlayData } from '@/entities/GamePlayData';
import { MenuData } from '@/entities/MenuData';
import { ResultsScreenData } from '@/entities/ResultsScreenData';
import { Settings } from '@/entities/Settings';
import { TourneyManagerData } from '@/entities/TourneyManagerData';
import { TourneyUserProfileData } from '@/entities/TourneyUserProfileData';
import { wLogger } from '@/logger';
import { BaseData, MemoryBase } from '@/objects/memoryBase';
import { sleep } from '@/utils/sleep';

import { InstanceManager } from './instanceManager';

const SCAN_PATTERNS: {
    [k in keyof BaseData]: string;
} = {
    baseAddr: 'F8 01 74 04 83 65', //-0xC
    menuModsAddr: 'C8 FF 00 00 00 00 00 81 0D 00 00 00 00 00 08 00 00', //+0x9
    playTimeAddr: '5E 5F 5D C3 A1 ?? ?? ?? ?? 89 ?? 04', //+0x5
    chatCheckerAddr: '0A D7 23 3C 00 00 ?? 01', //-0x20 (value)
    statusAddr: '48 83 F8 04 73 1E',
    skinDataAddr: '75 21 8B 1D',
    settingsClassAddr: '83 E0 20 85 C0 7E 2F',
    rulesetsAddr: '7D 15 A1 ?? ?? ?? ?? 85 C0',
    canRunSlowlyAddr: '55 8B EC 80 3D ?? ?? ?? ?? 00 75 26 80 3D',
    getAudioLengthAddr: '55 8B EC 83 EC 08 A1 ?? ?? ?? ?? 85 C0'
};

export class OsuInstance {
    entities: DataRepo;

    pid: number;
    process: Process;
    path: string = '';

    isReady: boolean;
    isDestroyed: boolean = false;
    isTourneyManager: boolean = false;
    isTourneySpectator: boolean = false;

    emitter: EventEmitter;

    constructor(pid: number) {
        this.pid = pid;
        this.entities = new DataRepo();

        this.process = new Process(this.pid);
        this.emitter = new EventEmitter();

        this.path = this.process.path;

        this.entities.set('process', this.process);
        this.entities.set('bases', new MemoryBase(this.entities));
        this.entities.set('settings', new Settings());
        this.entities.set('allTimesData', new AllTimesData(this.entities));
        this.entities.set('beatmapPpData', new BeatmapPPData(this.entities));
        this.entities.set('menuData', new MenuData(this.entities));
        this.entities.set(
            'bassDensityData',
            new BassDensityData(this.entities)
        );
        this.entities.set('gamePlayData', new GamePlayData(this.entities));
        this.entities.set(
            'resultsScreenData',
            new ResultsScreenData(this.entities)
        );
        this.entities.set(
            'tourneyUserProfileData',
            new TourneyUserProfileData(this.entities)
        );
        this.entities.set(
            'tourneyManagerData',
            new TourneyManagerData(this.entities)
        );
    }

    setIsTourneySpectator(newVal: boolean) {
        this.isTourneySpectator = newVal;
    }

    async start() {
        wLogger.info(
            `Running memory chimera... RESOLVING PATTERNS FOR ${this.pid}`
        );
        while (!this.isReady) {
            const basesRepo = this.entities.get('bases');
            if (!basesRepo) {
                throw new Error(
                    'Bases repo not initialized, missed somewhere?'
                );
            }

            try {
                for (const baseKey in SCAN_PATTERNS) {
                    basesRepo.setBase(
                        baseKey as never,
                        this.process.scanSync(SCAN_PATTERNS[baseKey], true)
                    );
                }

                if (!basesRepo.checkIsBasesValid()) {
                    wLogger.info('PATTERN RESOLVING FAILED, TRYING AGAIN....');
                    throw new Error('Memory resolve failed');
                }

                wLogger.info(
                    'ALL PATTERNS ARE RESOLVED, STARTING WATCHING THE DATA'
                );
                this.isReady = true;
            } catch (exc) {
                console.log(exc);
                wLogger.error(
                    'PATTERN SCANNING FAILED, TRYING ONE MORE TIME...'
                );
                this.emitter.emit('onResolveFailed', this.pid);
                return;
            }
        }

        /**
         * ENABLING GOSU OVERLAY
         */
        if (config.enableGosuOverlay) {
            await injectGameOverlay(this.process);
        }

        this.update();
        if (config.enableKeyOverlay) {
            this.updateKeyOverlay();
        }
        this.updateMapMetadata();
        this.watchProcessHealth();
    }

    async update() {
        wLogger.debug('[InstancesOsu:update] starting');

        const {
            allTimesData,
            menuData,
            bassDensityData,
            gamePlayData,
            resultsScreenData,
            settings,
            tourneyUserProfileData,
            tourneyManagerData
        } = this.entities.getServices([
            'allTimesData',
            'menuData',
            'bassDensityData',
            'gamePlayData',
            'resultsScreenData',
            'settings',
            'tourneyUserProfileData',
            'tourneyManagerData'
        ]);

        let prevTime = 0;
        while (!this.isDestroyed) {
            await Promise.all([
                allTimesData.updateState(),
                menuData.updateState()
            ]);

            // osu! calculates audioTrack length a little bit after updating menuData, sooo.. lets this thing run regardless of menuData updating
            await menuData.updateMP3Length();

            if (!settings.gameFolder) {
                settings.setGameFolder(path.join(this.path, '../'));

                // condition when user have different BeatmapDirectory in osu! config
                if (fs.existsSync(allTimesData.SongsFolder)) {
                    settings.setSongsFolder(allTimesData.SongsFolder);
                } else {
                    settings.setSongsFolder(
                        path.join(this.path, '../', allTimesData.SongsFolder)
                    );
                }
            }

            switch (allTimesData.Status) {
                case 0:
                    await bassDensityData.updateState();
                    break;
                case 5:
                    // Reset Gameplay/ResultScreen data on joining to songSelect
                    if (!gamePlayData.isDefaultState) {
                        gamePlayData.init();
                        resultsScreenData.init();
                    }
                    break;
                case 2:
                    // Reset gameplay data on retry
                    if (prevTime > allTimesData.PlayTime) {
                        gamePlayData.init(true);
                    }

                    prevTime = allTimesData.PlayTime;

                    if (allTimesData.PlayTime < 150) {
                        break;
                    }

                    await gamePlayData.updateState();
                    break;
                case 7:
                    await resultsScreenData.updateState();
                    break;
                case 22:
                    if (!this.isTourneyManager) {
                        this.isTourneyManager = true;
                    }
                    await tourneyManagerData.updateState();
                    break;
                default:
                    gamePlayData.init();
                    resultsScreenData.init();
                    break;
            }

            if (this.isTourneySpectator) {
                await tourneyUserProfileData.updateState();
            }

            await sleep(config.pollRate);
        }
    }

    async updateKeyOverlay() {
        wLogger.debug(`[InstancesOsu:updateKeyOverlay] starting`);

        const { allTimesData, gamePlayData } = this.entities.getServices([
            'allTimesData',
            'gamePlayData'
        ]);

        while (!this.isDestroyed) {
            switch (allTimesData.Status) {
                case 2:
                    if (allTimesData.PlayTime < 150) {
                        break;
                    }

                    await gamePlayData.updateKeyOverlay();
                    // await
                    break;
                default:
                // no-default
            }

            await sleep(config.keyOverlayPollRate);
        }
    }

    async updateMapMetadata() {
        wLogger.debug(`[InstancesOsu:updateMapMetadata] starting`);

        let previousState = '';

        while (true) {
            const {
                menuData,
                allTimesData,
                settings,
                gamePlayData,
                beatmapPpData
            } = this.entities.getServices([
                'menuData',
                'allTimesData',
                'settings',
                'gamePlayData',
                'beatmapPpData'
            ]);

            const currentMods =
                allTimesData.Status === 2 || allTimesData.Status === 7
                    ? gamePlayData.Mods
                    : allTimesData.MenuMods;

            const currentTimeMD5 = `${menuData.MD5}:${menuData.MenuGameMode}:${currentMods}:${menuData.MP3Length}`;

            if (
                menuData.Path.endsWith('.osu') &&
                settings.gameFolder &&
                previousState !== currentTimeMD5
            ) {
                previousState = currentTimeMD5;

                await beatmapPpData.updateMapMetadata(currentMods);
            }

            await sleep(config.pollRate);
        }
    }

    async watchProcessHealth() {
        while (!this.isDestroyed) {
            if (!Process.isProcessExist(this.process.handle)) {
                this.isDestroyed = true;
                wLogger.info(`osu!.exe at ${this.pid} got destroyed`);
                this.emitter.emit('onDestroy', this.pid);
            }

            await sleep(config.pollRate);
        }
    }

    getState(instancesManager: InstanceManager) {
        return buildResult(this.entities, instancesManager);
    }
}
