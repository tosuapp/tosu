import rosu, { HitResultPriority } from '@kotrikd/rosu-pp';
import { ClientType, measureTime, wLogger } from '@tosu/common';

import { AbstractInstance } from '@/instances';
import { AbstractState } from '@/states';
import { calculateAccuracy, calculateGrade } from '@/utils/calculators';
import { defaultCalculatedMods, removeDebuffMods } from '@/utils/osuMods';
import { CalculateMods } from '@/utils/osuMods.types';

export class ResultScreen extends AbstractState {
    onlineId: number;
    playerName: string;
    mods: CalculateMods = Object.assign({}, defaultCalculatedMods);
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
    smallTickHits: number;
    largeTickHits: number;
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
        wLogger.debug(
            ClientType[this.game.client],
            this.game.pid,
            `resultScreen init`
        );

        this.onlineId = 0;
        this.playerName = '';
        this.mods = Object.assign({}, defaultCalculatedMods);
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
        this.smallTickHits = 0;
        this.largeTickHits = 0;
        this.grade = '';
        this.date = '';
        this.accuracy = 0;
        this.pp = 0;
        this.fcPP = 0;

        this.previousBeatmap = '';
    }

    @measureTime
    updateState() {
        try {
            const result = this.game.memory.resultScreen();
            if (result instanceof Error) throw result;
            if (typeof result === 'string') {
                wLogger.debug(
                    ClientType[this.game.client],
                    this.game.pid,
                    `resultScreen updateState`,
                    result
                );
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
            this.smallTickHits = result.smallTickHits;
            this.largeTickHits = result.largeTickHits;
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
                isLazer: this.game.client === ClientType.lazer,
                mods: this.mods.number,
                mode: this.mode,
                hits
            });

            this.accuracy = calculateAccuracy({
                isRound: true,
                mode: this.mode,
                hits
            });

            this.game.resetReportCount('resultScreen updateState');
        } catch (exc) {
            this.game.reportError(
                'resultScreen updateState',
                10,
                ClientType[this.game.client],
                this.game.pid,
                `resultScreen updateState`,
                (exc as any).message
            );
            wLogger.debug(
                ClientType[this.game.client],
                this.game.pid,
                `resultScreen updateState`,
                exc
            );
        }
    }

    @measureTime
    updatePerformance() {
        try {
            const { beatmapPP, menu } = this.game.getServices([
                'beatmapPP',
                'menu'
            ]);

            const key = `${menu.checksum}${this.mods.checksum}${this.mode}${this.playerName}`;
            if (this.previousBeatmap === key) {
                return;
            }

            const currentBeatmap = beatmapPP.getCurrentBeatmap();
            if (!currentBeatmap) {
                wLogger.debug(
                    ClientType[this.game.client],
                    this.game.pid,
                    `resultScreen updatePerformance can't get current map`
                );
                return;
            }

            const commonParams = {
                mods: removeDebuffMods(this.mods.array),
                lazer: this.game.client === ClientType.lazer
            };

            const calcOptions: rosu.PerformanceArgs = {
                nGeki: this.hitGeki,
                n300: this.hit300,
                nKatu: this.hitKatu,
                n100: this.hit100,
                n50: this.hit50,
                misses: this.hitMiss,
                sliderEndHits: this.sliderEndHits,
                smallTickHits: this.smallTickHits,
                largeTickHits: this.largeTickHits,
                combo: this.maxCombo,
                ...commonParams
            };

            const t1 = performance.now();
            const curPerformance = new rosu.Performance(calcOptions).calculate(
                currentBeatmap
            );

            const fcCalcOptions: rosu.PerformanceArgs = {
                nGeki: this.hitGeki,
                n300: this.hit300 + this.hitMiss,
                nKatu: this.hitKatu,
                n100: this.hit100,
                n50: this.hit50,
                misses: 0,
                sliderEndHits:
                    beatmapPP.performanceAttributes?.state?.sliderEndHits,
                smallTickHits:
                    beatmapPP.performanceAttributes?.state?.osuSmallTickHits,
                largeTickHits:
                    beatmapPP.performanceAttributes?.state?.osuLargeTickHits,
                combo: beatmapPP.calculatedMapAttributes.maxCombo,
                ...commonParams
            };
            if (this.mode === 3) {
                fcCalcOptions.nGeki =
                    this.hitGeki + this.hit100 + this.hit50 + this.hitMiss;
                fcCalcOptions.n300 = this.hit300;
                fcCalcOptions.nKatu = this.hitKatu;
                fcCalcOptions.n100 = 0;
                fcCalcOptions.n50 = 0;
                fcCalcOptions.misses = 0;
                delete fcCalcOptions.sliderEndHits;
                delete fcCalcOptions.smallTickHits;
                delete fcCalcOptions.largeTickHits;
                delete fcCalcOptions.combo;
                fcCalcOptions.accuracy = this.accuracy;
                fcCalcOptions.hitresultPriority = HitResultPriority.Fastest;
            }

            const t2 = performance.now();
            const fcPerformance = new rosu.Performance(fcCalcOptions).calculate(
                curPerformance
            );

            this.pp = curPerformance.pp;
            this.fcPP = fcPerformance.pp;

            curPerformance.free();
            fcPerformance.free();

            wLogger.time(
                `[${ClientType[this.game.client]}]`,
                this.game.pid,
                `resultScreen.updatePerformance`,
                `pp:${(t2 - t1).toFixed(2)}`,
                `fc pp:${(performance.now() - t2).toFixed(2)}`
            );

            this.previousBeatmap = key;
            this.game.resetReportCount('resultScreen updatePerformance');
        } catch (exc) {
            this.game.reportError(
                'resultScreen updatePerformance',
                10,
                ClientType[this.game.client],
                this.game.pid,
                `resultScreen updatePerformance`,
                (exc as any).message
            );
            wLogger.debug(
                ClientType[this.game.client],
                this.game.pid,
                `resultScreen updatePerformance`,
                exc
            );
        }
    }
}
