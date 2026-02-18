import rosu, { HitResultPriority } from '@kotrikd/rosu-pp';
import { ClientType, measureTime, wLogger } from '@tosu/common';

import { AbstractInstance } from '@/instances';
import { AbstractState } from '@/states';
import { calculateGrade } from '@/utils/calculators';
import { defaultCalculatedMods, sanitizeMods } from '@/utils/osuMods';
import { CalculateMods } from '@/utils/osuMods.types';

import { defaultStatistics } from './gameplay';
import { Statistics } from './types';

export class ResultScreen extends AbstractState {
    onlineId: number;
    playerName: string;

    mods: CalculateMods = Object.assign({}, defaultCalculatedMods);
    mode: number;
    maxCombo: number;

    score: number;
    statistics: Statistics;
    maximumStatistics: Statistics;

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
            `%${ClientType[this.game.client]}%`,
            `Initializing result screen`
        );

        this.onlineId = 0;
        this.playerName = '';
        this.mods = Object.assign({}, defaultCalculatedMods);
        this.mode = 0;
        this.maxCombo = 0;
        this.score = 0;
        this.statistics = Object.assign({}, defaultStatistics);
        this.maximumStatistics = Object.assign({}, defaultStatistics);
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
                    `%${ClientType[this.game.client]}%`,
                    `Result screen state update not ready:`,
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
            this.accuracy = result.accuracy;
            this.statistics = result.statistics;
            this.maximumStatistics = result.maximumStatistics;
            this.date = result.date;

            this.grade = calculateGrade({
                isLazer: this.game.client === ClientType.lazer,

                mods: this.mods.array,
                mode: this.mode,
                accuracy: this.accuracy,

                statistics: this.statistics
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
                `%${ClientType[this.game.client]}%`,
                `Error updating result screen state:`,
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
                    `%${ClientType[this.game.client]}%`,
                    `Result screen PP calc skipped: Can't get current map`
                );
                return;
            }

            const commonParams = {
                mods: sanitizeMods(this.mods.array),
                lazer: this.game.client === ClientType.lazer
            };

            const calcOptions: rosu.PerformanceArgs = {
                nGeki: this.statistics.perfect,
                n300: this.statistics.great,
                nKatu: this.statistics.good,
                n100: this.statistics.ok,
                n50: this.statistics.meh,
                misses: this.statistics.miss,
                sliderEndHits: this.statistics.sliderTailHit,
                smallTickHits: this.statistics.smallTickHit,
                largeTickHits: this.statistics.largeTickHit,
                combo: this.maxCombo,
                ...commonParams
            };

            const t1 = performance.now();
            const curPerformance = new rosu.Performance(calcOptions).calculate(
                currentBeatmap
            );

            const fcCalcOptions: rosu.PerformanceArgs = {
                nGeki: this.statistics.perfect,
                n300: this.statistics.great + this.statistics.miss,
                nKatu: this.statistics.good,
                n100: this.statistics.ok,
                n50: this.statistics.meh,
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
                    this.statistics.perfect +
                    this.statistics.ok +
                    this.statistics.meh +
                    this.statistics.miss;
                fcCalcOptions.n300 = this.statistics.great;
                fcCalcOptions.nKatu = this.statistics.good;
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
                `%${ClientType[this.game.client]}%`,
                `Result screen PP calc: PP: %${(t2 - t1).toFixed(2)}ms%, FC PP: %${(performance.now() - t2).toFixed(2)}ms%`
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
                `%${ClientType[this.game.client]}%`,
                `Error updating result screen performance:`,
                exc
            );
        }
    }
}
