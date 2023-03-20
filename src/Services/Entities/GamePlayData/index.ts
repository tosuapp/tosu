import path from 'path';
import { Beatmap, Calculator } from 'rosu-pp';

import { Leaderboard } from '@/Instances/Leaderboard';
import { Process } from '@/Memory/process';
import { DataRepo } from '@/Services/repo';
import { calculateGrade } from '@/Utils/calculateGrade';
import { OsuMods } from '@/Utils/osuMods.types';
import { resolvePassedObjects } from '@/Utils/resolvePassedObjects';
import { wLogger } from '@/logger';

import { AbstractEntity } from '../types';

export interface KeyOverlay {
	K1Pressed: boolean;
	K1Count: number;
	K2Pressed: boolean;
	K2Count: number;
	M1Pressed: boolean;
	M1Count: number;
	M2Pressed: boolean;
	M2Count: number;
}

export class GamePlayData extends AbstractEntity {
	Retries: number;
	PlayerName: string;
	Mods: OsuMods;
	HitErrors: number[];
	Mode: number;
	MaxCombo: number;
	Score: number;
	ScoreV2: number;
	Hit100: number;
	Hit300: number;
	Hit50: number;
	HitGeki: number;
	HitKatu: number;
	HitMiss: number;
	HitMissPrev: number;
	HitUR: number;
	HitSB: number;
	ComboPrev: number;
	Combo: number;
	PlayerHPSmooth: number;
	PlayerHP: number;
	Accuracy: number;
	UnstableRate: number;
	GradeCurrent: string;
	GradeExpected: string;
	Leaderboard?: Leaderboard;
	KeyOverlay: KeyOverlay;
	isReplayUiHidden: boolean;

	constructor(services: DataRepo) {
		super(services);

		this.init();
	}

	init() {
		this.Retries = 0;
		this.PlayerName = '';
		this.Mods;
		this.HitErrors = [];
		this.Mode = 0;
		this.MaxCombo = 0;
		this.Score = 0;
		this.ScoreV2 = 0;
		this.Hit100 = 0;
		this.Hit300 = 0;
		this.Hit50 = 0;
		this.HitGeki = 0;
		this.HitKatu = 0;
		this.HitMiss = 0;
		this.HitMissPrev = 0;
		this.HitUR = 0.0;
		this.HitSB = 0;
		this.ComboPrev = 0;
		this.Combo = 0;
		this.PlayerHPSmooth = 0.0;
		this.PlayerHP = 0.0;
		this.Accuracy = 0.0;
		this.UnstableRate = 0;
		this.GradeCurrent = '';
		this.GradeExpected = '';
		this.Leaderboard = undefined;
		this.KeyOverlay = {} as KeyOverlay;
		this.isReplayUiHidden = false;
	}

	async updateState() {
		const { process, bases, allTimesData, menuData } = this.services.getServices([
			'process',
			'bases',
			'allTimesData',
			'menuData'
		]);

		const { baseAddr, rulesetsAddr } = bases.bases;

		const rulesetAddr = process.readInt(process.readInt(rulesetsAddr - 0xb) + 0x4);
		const gameplayBase = process.readInt(rulesetAddr + 0x68);
		const scoreBase = process.readInt(gameplayBase + 0x38);

		if (allTimesData.IsWatchingReplay) {
			// rulesetAddr mean ReplayWatcher... Sooo....
			// Ruleset + 0x1D4
			this.isReplayUiHidden = Boolean(process.readByte(rulesetAddr + 0x1d4));
		} else {
			this.isReplayUiHidden = false;
		}

		// [Ruleset + 0x7C]
		const leaderBoardBase = process.readInt(rulesetAddr + 0x7c);

		// [Base - 0x33] + 0x8
		this.Retries = process.readInt(process.readInt(baseAddr - 0x33) + 0x8);
		// [[[Ruleset + 0x68] + 0x38] + 0x28]
		this.PlayerName = process.readSharpString(
			process.readInt(process.readInt(gameplayBase + 0x38) + 0x28)
		);
		// [[[Ruleset + 0x68] + 0x38] + 0x1C] + 0xC ^ [[[Ruleset + 0x68] + 0x38] + 0x1C] + 0x8
		this.Mods =
			process.readInt(process.readInt(scoreBase + 0x1c) + 0xc) ^
			process.readInt(process.readInt(scoreBase + 0x1c) + 0x8);
		// [[[Ruleset + 0x68] + 0x38] + 0x38]
		this.HitErrors = this.getHitErrors(process, scoreBase);
		// [[Ruleset + 0x68] + 0x38] + 0x64
		this.Mode = process.readInt(scoreBase + 0x64);
		// [[Ruleset + 0x68] + 0x38] + 0x68
		this.MaxCombo = process.readShort(scoreBase + 0x68);
		// [[Ruleset + 0x68] + 0x38] + 0x78
		this.Score = process.readInt(scoreBase + 0x78);
		// Ruleset + 0xF8
		this.ScoreV2 = process.readInt(rulesetAddr + 0xf8);
		// [[Ruleset + 0x68] + 0x38] + 0x88
		this.Hit100 = process.readShort(scoreBase + 0x88);
		// [[Ruleset + 0x68] + 0x38] + 0x8A
		this.Hit300 = process.readShort(scoreBase + 0x8a);
		// [[Ruleset + 0x68] + 0x38] + 0x8C
		this.Hit50 = process.readShort(scoreBase + 0x8c);
		// [[Ruleset + 0x68] + 0x38] + 0x8E
		this.HitGeki = process.readShort(scoreBase + 0x8e);
		// [[Ruleset + 0x68] + 0x38] + 0x90
		this.HitKatu = process.readShort(scoreBase + 0x90);
		// [[Ruleset + 0x68] + 0x38] + 0x92
		this.HitMiss = process.readShort(scoreBase + 0x92);
		// [[Ruleset + 0x68] + 0x38] + 0x94
		this.Combo = process.readShort(scoreBase + 0x94);
		// [[Ruleset + 0x68] + 0x40] + 0x14
		this.PlayerHPSmooth = process.readDouble(
			process.readInt(gameplayBase + 0x40) + 0x14
		);
		// [[Ruleset + 0x68] + 0x40] + 0x1C
		this.PlayerHP = process.readDouble(process.readInt(gameplayBase + 0x40) + 0x1c);
		// [[Ruleset + 0x68] + 0x48] + 0xC
		this.Accuracy = process.readDouble(process.readInt(gameplayBase + 0x48) + 0xc);

		// [Ruleset + 0x7C] + 0x24
		const leaderBoardAddr =
			leaderBoardBase > 0 ? process.readInt(leaderBoardBase + 0x24) : 0;
		wLogger.debug(
			`leaderboardAddr = ${leaderBoardAddr.toString(16)} (${leaderBoardAddr})`
		);
		if (!this.Leaderboard) {
			this.Leaderboard = new Leaderboard(process, leaderBoardAddr);
		} else {
			this.Leaderboard.updateBase(leaderBoardAddr);
		}
		this.Leaderboard.readLeaderboard();

		if ((this.Mods & OsuMods.ScoreV2) === OsuMods.ScoreV2) {
			this.Score = this.ScoreV2;
		}

		if (this.MaxCombo > 0) {
			const baseUR = this.calculateUR();
			if (
				(this.Mods & OsuMods.DoubleTime) === OsuMods.DoubleTime ||
				(this.Mods & OsuMods.Nightcore) === OsuMods.Nightcore
			) {
				this.UnstableRate = baseUR / 1.5;
			} else if ((this.Mods & OsuMods.HalfTime) === OsuMods.HalfTime) {
				this.UnstableRate = baseUR * 1.33;
			} else {
				this.UnstableRate = baseUR;
			}
		}

		// [[Ruleset + 0xB0] + 0x10] + 0x4
		const keyOverlayArrayAddr = process.readInt(
			process.readInt(process.readInt(rulesetAddr + 0xb0) + 0x10) + 0x4
		);
		this.KeyOverlay = this.getKeyOverlay(process, keyOverlayArrayAddr);

		const remaining =
			menuData.ObjectCount - this.Hit300 - this.Hit100 - this.Hit50 - this.HitMiss;
		this.GradeCurrent = calculateGrade(
			menuData.MenuGameMode,
			allTimesData.MenuMods,
			this.Hit300,
			this.Hit100,
			this.Hit50,
			this.HitMiss,
			this.Accuracy
		);
		this.GradeExpected = calculateGrade(
			menuData.MenuGameMode,
			allTimesData.MenuMods,
			this.Hit300 + remaining,
			this.Hit100,
			this.Hit50,
			this.HitMiss,
			this.Accuracy
		);

		if (this.ComboPrev > this.MaxCombo) {
			this.ComboPrev = 0;
		}
		if (this.Combo < this.ComboPrev && this.HitMiss === this.HitMissPrev) {
			this.HitSB += 1;
		}
		this.HitMissPrev = this.HitMiss;
		this.ComboPrev = this.Combo;

		this.updateStars();
	}

	private getKeyOverlay(process: Process, keyOverlayArrayAddr: number) {
		return {
			// [Base + 0x8] + 0x1C
			K1Pressed: Boolean(
				process.readByte(process.readInt(keyOverlayArrayAddr + 0x8) + 0x1c)
			),
			// [Base + 0x8] + 0x14
			K1Count: process.readInt(process.readInt(keyOverlayArrayAddr + 0x8) + 0x14),
			// [Base + 0xC] + 0x1C
			K2Pressed: Boolean(
				process.readByte(process.readInt(keyOverlayArrayAddr + 0xc) + 0x1c)
			),
			// [Base + 0xC] + 0x14
			K2Count: process.readInt(process.readInt(keyOverlayArrayAddr + 0xc) + 0x14),
			// [Base + 0x10] + 0x1C
			M1Pressed: Boolean(
				process.readByte(process.readInt(keyOverlayArrayAddr + 0x10) + 0x1c)
			),
			// [Base + 0x10] + 0x14
			M1Count: process.readInt(process.readInt(keyOverlayArrayAddr + 0x10) + 0x14),
			// [Base + 0x14] + 0x1C
			M2Pressed: Boolean(
				process.readByte(process.readInt(keyOverlayArrayAddr + 0x14) + 0x1c)
			),
			// [Base + 0x14] + 0x14
			M2Count: process.readInt(process.readInt(keyOverlayArrayAddr + 0x14) + 0x14)
		};
	}

	private getHitErrors(process: Process, scoreBase: number = 0): Array<number> {
		if (scoreBase === 0) return [];

		const errors: Array<number> = [];

		const base = process.readInt(scoreBase + 0x38);
		const items = process.readInt(base + 0x4);
		const size = process.readInt(base + 0xc);

		for (let i = 0; i < size; i++) {
			let current = items + 0x8 + 0x4 * i;
			let error = process.readInt(current);

			errors.push(error);
		}

		return errors;
	}

	private calculateUR(): number {
		if (this.HitErrors.length < 1) {
			return 0;
		}

		let totalAll = 0.0;
		for (const hit of this.HitErrors) {
			totalAll += hit;
		}

		const average = totalAll / this.HitErrors.length;
		let variance = 0;
		for (const hit of this.HitErrors) {
			variance += Math.pow(hit - average, 2);
		}
		variance = variance / this.HitErrors.length;

		return Math.sqrt(variance) * 10;
	}

	private updateStars() {
		const { settings, menuData, allTimesData, beatmapPpData } =
			this.services.getServices([
				'settings',
				'menuData',
				'allTimesData',
				'beatmapPpData'
			]);

		if (!settings.gameFolder) {
			return;
		}

		const mapPath = path.join(settings.songsFolder, menuData.Folder, menuData.Path);
		const beatmap = new Beatmap({
			path: mapPath,
			ar: menuData.AR,
			od: menuData.OD,
			cs: menuData.CS,
			hp: menuData.HP
		});

		const scoreParams = {
			passedObjects: resolvePassedObjects(
				this.Mode,
				this.Hit300,
				this.Hit100,
				this.Hit50,
				this.HitMiss,
				this.HitKatu,
				this.HitGeki
			),
			combo: this.MaxCombo,
			mods: allTimesData.MenuMods,
			nMisses: this.HitMiss,
			n50: this.Hit50,
			n100: this.Hit100,
			n300: this.Hit300
		};

		const curPerformance = new Calculator(scoreParams).performance(beatmap);

		const fcPerformance = new Calculator({
			...scoreParams,
			passedObjects: resolvePassedObjects(
				this.Mode,
				this.Hit300 + this.HitMiss,
				this.Hit100,
				this.Hit50,
				0,
				this.HitKatu,
				this.HitGeki
			),
			n300: this.Hit300 + this.HitMiss,
			nMisses: 0
		}).performance(beatmap);

		beatmapPpData.updateCurrentAttributes(
			curPerformance.difficulty.stars,
			curPerformance.pp
		);
		beatmapPpData.updateFcPP(fcPerformance.pp);
	}
}
