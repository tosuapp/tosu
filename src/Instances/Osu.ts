import EventEmitter from 'events';
import fs from 'fs';
import path from 'path';
import { Process } from 'tsprocess/dist/process';

import { buildResult } from '@/Api/Utils/BuildResult';
import { BaseData, Bases } from '@/Services/Bases';
import { AllTimesData } from '@/Services/Entities/AllTimesData';
import { BassDensityData } from '@/Services/Entities/BassDensityData';
import { BeatmapPPData } from '@/Services/Entities/BeatmapPpData';
import { GamePlayData } from '@/Services/Entities/GamePlayData';
import { MenuData } from '@/Services/Entities/MenuData';
import { ResultsScreenData } from '@/Services/Entities/ResultsScreenData';
import { TourneyManagerData } from '@/Services/Entities/TourneyManagerData';
import { TourneyUserProfileData } from '@/Services/Entities/TourneyUserProfileData';
import { Settings } from '@/Services/Settings';
import { DataRepo } from '@/Services/repo';
import { sleep } from '@/Utils/sleep';
import { config } from '@/config';
import { wLogger } from '@/logger';

import { InstancesManager } from './InstancesManager';

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
    servicesRepo: DataRepo;

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
        this.servicesRepo = new DataRepo();

        this.process = new Process(this.pid);
        this.emitter = new EventEmitter();

        this.path = this.process.path;

        this.servicesRepo.set('process', this.process);
        this.servicesRepo.set('bases', new Bases(this.servicesRepo));
        this.servicesRepo.set('settings', new Settings());
        this.servicesRepo.set(
            'allTimesData',
            new AllTimesData(this.servicesRepo)
        );
        this.servicesRepo.set(
            'beatmapPpData',
            new BeatmapPPData(this.servicesRepo)
        );
        this.servicesRepo.set('menuData', new MenuData(this.servicesRepo));
        this.servicesRepo.set(
            'bassDensityData',
            new BassDensityData(this.servicesRepo)
        );
        this.servicesRepo.set(
            'gamePlayData',
            new GamePlayData(this.servicesRepo)
        );
        this.servicesRepo.set(
            'resultsScreenData',
            new ResultsScreenData(this.servicesRepo)
        );
        this.servicesRepo.set(
            'tourneyUserProfileData',
            new TourneyUserProfileData(this.servicesRepo)
        );
        this.servicesRepo.set(
            'tourneyManagerData',
            new TourneyManagerData(this.servicesRepo)
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
            const basesRepo = this.servicesRepo.get('bases');
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
                break;
            }
        }

        this.update();
        if (config.enableKeyOverlay) {
            this.updateKeyOverlay();
        }
        this.updateMapMetadata();
        this.watchProcessHealth();
    }

    async update() {
        const {
            allTimesData,
            menuData,
            bassDensityData,
            gamePlayData,
            resultsScreenData,
            settings,
            tourneyUserProfileData,
            tourneyManagerData
        } = this.servicesRepo.getServices([
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
                        gamePlayData.init();
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
        const { allTimesData, gamePlayData } = this.servicesRepo.getServices([
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
        let prevBeatmapMd5 = '';
        let prevMods = 0;
        let prevGM = 0;
        let prevTime = 0;

        while (true) {
            const {
                menuData,
                allTimesData,
                settings,
                gamePlayData,
                beatmapPpData
            } = this.servicesRepo.getServices([
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

            if (
                (prevBeatmapMd5 !== menuData.MD5 ||
                    prevMods !== currentMods ||
                    prevGM !== menuData.MenuGameMode ||
                    prevTime !== menuData.MP3Length) &&
                menuData.Path.endsWith('.osu') &&
                settings.gameFolder
            ) {
                // Repeating original gosumemory logic
                prevBeatmapMd5 = menuData.MD5;
                prevMods = allTimesData.MenuMods;
                prevGM = menuData.MenuGameMode;
                prevTime = menuData.MP3Length;

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

    getState(instancesManager: InstancesManager) {
        return buildResult(this.servicesRepo, instancesManager);
    }
}
