import { DataRepo } from '@/Services/repo';

import { AbstractEntity } from '../types';

interface BeatmapPPAcc {
	'100': number;
	'99': number;
	'98': number;
	'97': number;
	'96': number;
	'95': number;
}

interface BeatmapPPAttributes {
	ar: number;
	cs: number;
	hp: number;
	od: number;
	maxCombo: number;
	fullStars: number;
	stars: number;
}

interface BeatmapPPCurrentAttributes {
	stars: number;
	pp: number;
	fcPP: number;
	maxThisPlayPP: number;
}

interface BeatmapPPTimings {
	firstObj: number;
	full: number;
}

export class BeatmapPPData extends AbstractEntity {
	strains: number[];
	minBPM: number;
	maxBPM: number;
	ppAcc: BeatmapPPAcc;
	calculatedMapAttributes: BeatmapPPAttributes;
	currAttributes: BeatmapPPCurrentAttributes;
	timings: BeatmapPPTimings;

	constructor(services: DataRepo) {
		super(services);

		this.init();
	}

	init() {
		this.strains = [];
		this.minBPM = 0.0;
		this.maxBPM = 0.0;
		this.ppAcc = {
			'100': 0.0,
			'99': 0.0,
			'98': 0.0,
			'97': 0.0,
			'96': 0.0,
			'95': 0.0
		};
		this.calculatedMapAttributes = {
			ar: 0.0,
			cs: 0.0,
			hp: 0.0,
			od: 0.0,
			maxCombo: 0,
			fullStars: 0.0,
			stars: 0.0
		};
		this.currAttributes = {
			stars: 0.0,
			pp: 0.0,
			maxThisPlayPP: 0.0,
			fcPP: 0.0
		};
		this.timings = {
			firstObj: 0,
			full: 0
		};
	}

	updatePPData(
		strains: number[],
		ppAcc: BeatmapPPAcc,
		mapAttributes: BeatmapPPAttributes
	) {
		this.strains = strains;
		this.ppAcc = ppAcc;
		this.calculatedMapAttributes = mapAttributes;
	}

	updateCurrentAttributes(stars: number, pp: number) {
		const maxThisPlayPP =
			pp > this.currAttributes.maxThisPlayPP
				? pp
				: this.currAttributes.maxThisPlayPP;

		this.currAttributes = {
			...this.currAttributes,
			stars,
			pp,
			maxThisPlayPP
		};
	}

	updateFcPP(fcPP: number) {
		this.currAttributes = {
			...this.currAttributes,
			fcPP: fcPP
		};
	}

	updateBPM(minBPM: number, maxBPM: number) {
		this.minBPM = minBPM;
		this.maxBPM = maxBPM;
	}

	updateTimings(firstObj: number, full: number) {
		this.timings = {
			firstObj,
			full
		};
	}
}
