import rosu from '@kotrikd/rosu-pp';
import { wLogger } from '@tosu/common';

import { AbstractInstance } from '@/instances';
import { AbstractState } from '@/states';
import { calculateAccuracy, calculateGrade } from '@/utils/calculators';
import { OsuMods } from '@/utils/osuMods.types';

export class ResultScreen extends AbstractState {
    onlineId: number;
    playerName: string;
    mods: OsuMods;
    mode: number;
    maxCombo: number;
    score: number;
    hit100: number;
    hit300: number;
    hit50: number;
    hitGeki: number;
    hitKatu: number;
    hitMiss: number;
    sliderEndHits: number;
    sliderTickHits: number;
    grade: string;
    date: string;
    accuracy: number;
    pp: number;
    fcPP: number;

    previousBeatmap: string;

    constructor(game: AbstractInstance) {
        super(game);

        this.init();
    }

    init() {
        wLogger.debug('RSD(init) Reset');

        this.onlineId = 0;
        this.playerName = '';
        this.mods = 0;
        this.mode = 0;
        this.maxCombo = 0;
        this.score = 0;
        this.hit100 = 0;
        this.hit300 = 0;
        this.hit50 = 0;
        this.hitGeki = 0;
        this.hitKatu = 0;
        this.hitMiss = 0;
        this.sliderEndHits = 0;
        this.sliderTickHits = 0;
        this.grade = '';
        this.date = '';
        this.accuracy = 0;
        this.pp = 0;
        this.fcPP = 0;

        this.previousBeatmap = '';
    }

    updateState() {
        try {
            const result = this.game.memory.resultScreen();
            if (result instanceof Error) throw result;
            if (typeof result === 'string') {
                wLogger.debug(`RSD(updateState) ${result}`);
                return 'not-ready';
            }

            this.onlineId = result.onlineId;
            this.playerName = result.playerName;
            this.mods = result.mods;
            this.mode = result.mode;
            this.maxCombo = result.maxCombo;
            this.score = result.score;
            this.hit100 = result.hit100;
            this.hit300 = result.hit300;
            this.hit50 = result.hit50;
            this.hitGeki = result.hitGeki;
            this.hitKatu = result.hitKatu;
            this.hitMiss = result.hitMiss;
            this.sliderEndHits = result.sliderEndHits;
            this.sliderTickHits = result.sliderTickHits;
            this.date = result.date;

            const hits = {
                300: this.hit300,
                geki: 0,
                100: this.hit100,
                katu: 0,
                50: this.hit50,
                0: this.hitMiss
            };

            this.grade = calculateGrade({
                mods: this.mods,
                mode: this.mode,
                hits
            });

            this.accuracy = calculateAccuracy({
                mode: this.mode,
                hits
            });

            this.resetReportCount('RSD(updateState)');
        } catch (exc) {
            this.reportError(
                'RSD(updateState)',
                10,
                `RSD(updateState) ${(exc as any).message}`
            );
            wLogger.debug(exc);
        }
    }

    updatePerformance() {
        try {
            const { beatmapPP, menu } = this.game.getServices([
                'beatmapPP',
                'menu'
            ]);

            const key = `${menu.checksum}${this.mods}${this.mode}${this.playerName}`;
            if (this.previousBeatmap === key) {
                return;
            }

            const currentBeatmap = beatmapPP.getCurrentBeatmap();
            if (!currentBeatmap) {
                wLogger.debug("RSD(updatePerformance) can't get current map");
                return;
            }

            const scoreParams: rosu.PerformanceArgs = {
                combo: this.maxCombo,
                mods: this.mods,
                misses: this.hitMiss,
                n50: this.hit50,
                n100: this.hit100,
                n300: this.hit300,
                nKatu: this.hitKatu,
                nGeki: this.hitGeki,
                sliderEndHits: this.sliderEndHits,
                sliderTickHits: this.sliderTickHits,
                lazer: this.game.client === 'lazer'
            };

            const curPerformance = new rosu.Performance(scoreParams).calculate(
                currentBeatmap
            );
            const fcPerformance = new rosu.Performance({
                mods: this.mods,
                misses: 0,
                accuracy: this.accuracy
            }).calculate(curPerformance);

            this.pp = curPerformance.pp;
            this.fcPP = fcPerformance.pp;

            curPerformance.free();
            fcPerformance.free();

            this.previousBeatmap = key;
            this.resetReportCount('RSD(updatePerformance)');
        } catch (exc) {
            this.reportError(
                'RSD(updatePerformance)',
                10,
                `RSD(updatePerformance) ${(exc as any).message}`
            );
            wLogger.debug(exc);
        }
    }
}
