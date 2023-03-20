import findProcess from 'find-process';
import { BeatmapDecoder } from 'osu-parsers';
import path from 'path';
import { Beatmap, Calculator } from 'rosu-pp';

import { buildResult } from '@/Api/Utils/BuildResult';
import { Process } from '@/Memory/process';
import { Bases } from '@/Services/Bases';
import { AllTimesData } from '@/Services/Entities/AllTimesData';
import { BassDensityData } from '@/Services/Entities/BassDensityData';
import { BeatmapPPData } from '@/Services/Entities/BeatmapPpData';
import { GamePlayData } from '@/Services/Entities/GamePlayData';
import { MenuData } from '@/Services/Entities/MenuData';
import { ResultsScreenData } from '@/Services/Entities/ResultsScreenData';
import { Settings } from '@/Services/Settings';
import { DataRepo } from '@/Services/repo';
import { sleep } from '@/Utils/sleep';
import { wLogger } from '@/logger';

const SCAN_PATTERNS = {
	Base: 'F8 01 74 04 83 65', //-0xC
	InMenuMods: 'C8 FF 00 00 00 00 00 81 0D 00 00 00 00 00 08 00 00', //+0x9
	PlayTime: '5E 5F 5D C3 A1 ?? ?? ?? ?? 89 ?? 04', //+0x5
	PlayContainer: '85 C9 74 1F 8D 55 F0 8B 01',
	LeaderBoard: 'A1 ?? ?? ?? ?? 8B 50 04 8B 0D', //+0x1
	SongsFolder: '?? ?? 67 ?? 2F 00 28 00',
	ChatChecker: '0A D7 23 3C 00 00 ?? 01', //-0x20 (value)
	Status: '48 83 F8 04 73 1E',
	SkinData: '75 21 8B 1D',
	SettingsClass: '83 E0 20 85 C0 7E 2F',
	Rulesets: '7D 15 A1 ?? ?? ?? ?? 85 C0'
};

export class OsuInstance {
	servicesRepo: DataRepo;

	pid: number;
	process: Process;
	path: string = '';

	isReady: boolean;
	isDestroyed: boolean = false;

	constructor(pid: number) {
		this.pid = pid;
		this.servicesRepo = new DataRepo();

		this.process = new Process(this.pid);

		this.path = this.process.getModule('osu!.exe').path;

		this.servicesRepo.set('process', this.process);
		this.servicesRepo.set('bases', new Bases(this.servicesRepo));
		this.servicesRepo.set('settings', new Settings());
		this.servicesRepo.set('allTimesData', new AllTimesData(this.servicesRepo));
		this.servicesRepo.set('beatmapPpData', new BeatmapPPData(this.servicesRepo));
		this.servicesRepo.set('menuData', new MenuData(this.servicesRepo));
		this.servicesRepo.set('bassDensityData', new BassDensityData(this.servicesRepo));
		this.servicesRepo.set('gamePlayData', new GamePlayData(this.servicesRepo));
		this.servicesRepo.set(
			'resultsScreenData',
			new ResultsScreenData(this.servicesRepo)
		);
	}

	onDestroy() {
		wLogger.info(`osu!.exe at ${this.pid} got destroyed`);
	}

	async start() {
		wLogger.info(`RESOLVING PATTERNS FOR ${this.pid}`);
		while (!this.isReady) {
			const processes = await findProcess('pid', this.pid);
			if (processes.length < 1) {
				wLogger.info('We have lost osu! process');
				this.onDestroy();
				break;
			}

			const basesRepo = this.servicesRepo.get('bases');
			if (!basesRepo) {
				throw new Error('Bases repo not initialized, missed somewhere?');
			}

			try {
				basesRepo.setBase('baseAddr', this.process.scanSync(SCAN_PATTERNS.Base));
				basesRepo.setBase(
					'chatCheckerAddr',
					this.process.scanSync(SCAN_PATTERNS.ChatChecker)
				);
				basesRepo.setBase(
					'menuModsAddr',
					this.process.scanSync(SCAN_PATTERNS.InMenuMods)
				);
				basesRepo.setBase(
					'playTimeAddr',
					this.process.scanSync(SCAN_PATTERNS.PlayTime)
				);
				basesRepo.setBase(
					'settingsClassAddr',
					this.process.scanSync(SCAN_PATTERNS.SettingsClass)
				);
				basesRepo.setBase(
					'statusAddr',
					this.process.scanSync(SCAN_PATTERNS.Status)
				);
				basesRepo.setBase(
					'skinDataAddr',
					this.process.scanSync(SCAN_PATTERNS.SkinData)
				);
				basesRepo.setBase(
					'rulesetsAddr',
					this.process.scanSync(SCAN_PATTERNS.Rulesets)
				);
				basesRepo.setBase(
					'canRunSlowlyAddr',
					this.process.scanSync('55 8B EC 80 3D ?? ?? ?? ?? 00 75 26 80 3D')
				);
				basesRepo.setBase(
					'getAudioLengthAddr',
					this.process.scanSync('55 8B EC 83 EC 08 A1 ?? ?? ?? ?? 85 C0')
				);

				if (!basesRepo.checkIsBasesValid()) {
					wLogger.info('PATTERN RESOLVING FAILED, TRYING AGAIN....');
					continue;
				}

				wLogger.info('ALL PATTERNS ARE RESOLVED, STARTING WATCHING THE DATA');
				this.isReady = true;
				break;
			} catch (exc) {
				console.log(exc);
				wLogger.error('PATTERN SCANNING FAILED, TRYING ONE MORE TIME...');
			}
		}

		this.update();
		this.updateAllStats();
	}

	async update() {
		const {
			allTimesData,
			menuData,
			bassDensityData,
			gamePlayData,
			resultsScreenData,
			settings
		} = this.servicesRepo.getServices([
			'allTimesData',
			'menuData',
			'bassDensityData',
			'gamePlayData',
			'resultsScreenData',
			'settings'
		]);

		let retriesTemp = 0;

		while (true) {
			await Promise.all([
				allTimesData.updateState(),
				menuData.updateState(),
				// osu! calculates audioTrack length a little bit after updating menuData, sooo.. lets this thing run regardless of menuData updating
				menuData.updateMP3Length()
			]);

			if (!settings.gameFolder) {
				settings.setGameFolder(path.join(this.path, '../'));
				settings.setSongsFolder(
					path.join(this.path, '../', allTimesData.SongsFolder)
				);
			}

			switch (allTimesData.Status) {
				case 0:
					bassDensityData.updateState();
					break;
				case 5:
					// Reset Gameplay/ResultScreen data on joining to songSelect
					gamePlayData.init();
					resultsScreenData.init();
					break;
				case 2:
					gamePlayData.updateState();
					if (retriesTemp > gamePlayData.Retries) {
						// unvalidate gamePlayData, because user restarted map
						gamePlayData.init();
						retriesTemp = 0;
						continue;
					}
					retriesTemp = gamePlayData.Retries;
					break;
				case 7:
					resultsScreenData.updateState();
					break;
				default:
					gamePlayData.init();
					resultsScreenData.init();
					break;
			}
			await sleep(150);
		}
	}

	async updateAllStats() {
		const { menuData, allTimesData, settings, beatmapPpData } =
			this.servicesRepo.getServices([
				'menuData',
				'allTimesData',
				'settings',
				'gamePlayData',
				'beatmapPpData'
			]);
		let prevBeatmapMd5 = '';
		let prevMods = 0;
		let prevGM = 0;
		while (true) {
			if (
				(prevBeatmapMd5 !== menuData.MD5 ||
					prevMods !== allTimesData.MenuMods ||
					prevGM !== menuData.MenuGameMode) &&
				menuData.Path.endsWith('.osu') &&
				settings.gameFolder
			) {
				// Repeating original gosumemory logic
				prevBeatmapMd5 = menuData.MD5;
				prevMods = allTimesData.MenuMods;
				prevGM = menuData.MenuGameMode;

				const mapPath = path.join(
					settings.songsFolder,
					menuData.Folder,
					menuData.Path
				);
				const beatmap = new Beatmap({
					path: mapPath,
					ar: menuData.AR,
					od: menuData.OD,
					cs: menuData.CS,
					hp: menuData.HP
				});

				const calc = new Calculator();

				const currAttrs = calc.mods(allTimesData.MenuMods);
				const strains = currAttrs.strains(beatmap);
				const mapAttributes = currAttrs.acc(100).mapAttributes(beatmap);
				const fcPerformance = currAttrs.acc(100).performance(beatmap);

				const ppAcc = {};
				for (const acc of [100, 99, 98, 97, 96, 95]) {
					const performance = currAttrs.acc(acc).performance(beatmap);
					ppAcc[acc] = performance.pp;
				}

				let resultStrains: number[] = [];
				switch (strains.mode) {
					case 0:
						resultStrains.push(...strains.aimNoSliders);
						break;
					case 1:
						resultStrains.push(...strains.color);
						break;
					case 2:
						resultStrains.push(...strains.movement);
						break;
					case 3:
						resultStrains.push(...strains.strains);
						break;
					default:
					// no-default
				}

				// .sort((a, b) => a - b)
				beatmapPpData.updatePPData(resultStrains, ppAcc as never, {
					ar: mapAttributes.ar,
					cs: mapAttributes.cs,
					od: mapAttributes.od,
					hp: mapAttributes.hp,
					maxCombo: fcPerformance.difficulty.maxCombo,
					fullStars: fcPerformance.difficulty.stars,
					stars: fcPerformance.difficulty.stars
				});

				const decoder = new BeatmapDecoder();
				const lazerBeatmap = await decoder.decodeFromPath(mapPath);

				beatmapPpData.updateBPM(lazerBeatmap.bpmMin, lazerBeatmap.bpmMax);
				const firstObj =
					lazerBeatmap.hitObjects.length > 0
						? Math.round(lazerBeatmap.hitObjects.at(0)!.startTime)
						: 0;
				const full = Math.round(lazerBeatmap.totalLength);
				beatmapPpData.updateTimings(firstObj, full);
			}

			await sleep(500);
		}
	}

	getState() {
		return buildResult(this.servicesRepo);
	}
}
