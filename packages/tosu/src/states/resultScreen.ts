import {
    CalculateMods,
    ClientType,
    ScoreInfoInput,
    defaultCalculatedMods,
    measureTime,
    sanitizeMods,
    silentCatch,
    wLogger
} from '@tosu/common';

import { AbstractInstance } from '@/instances';
import { AbstractState } from '@/states';
import { calculateGrade } from '@/utils/calculators';

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
            if (
                !beatmapPP.ruleset ||
                !beatmapPP.performanceCalculator ||
                !beatmapPP.attributes
            )
                return;

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
                lazer: this.game.client === ClientType.lazer,
                mods: sanitizeMods(this.mods.array)
            };

            const nativeMods = this.game.calculator.mods(commonParams);

            const t1 = performance.now();
            const curPerformance = beatmapPP.performanceCalculator.calculate(
                {
                    ruleset: beatmapPP.ruleset,
                    legacyScore:
                        this.game.client !== ClientType.lazer
                            ? this.score
                            : undefined,
                    beatmap: currentBeatmap,
                    mods: nativeMods,
                    maxCombo: this.maxCombo,
                    accuracy: this.accuracy / 100,
                    countMiss: this.statistics.miss,
                    countMeh: this.statistics.meh,
                    countOk: this.statistics.ok,
                    countGood: this.statistics.good,
                    countGreat: this.statistics.great,
                    countPerfect: this.statistics.perfect,
                    countSliderTailHit: this.statistics.sliderTailHit,
                    countLargeTickMiss: this.statistics.largeTickMiss
                },
                beatmapPP.attributes
            );

            const calcOptions: ScoreInfoInput = {
                ruleset: beatmapPP.ruleset,
                legacyScore:
                    this.game.client !== ClientType.lazer
                        ? this.score
                        : undefined,
                beatmap: currentBeatmap,
                mods: nativeMods,
                maxCombo: beatmapPP.calculatedMapAttributes.maxCombo,
                accuracy: this.accuracy / 100,
                countMiss: 0,
                countMeh: this.statistics.meh,
                countOk: this.statistics.ok,
                countGood: this.statistics.good,
                countGreat: this.statistics.great + this.statistics.miss,
                countPerfect: this.statistics.perfect,
                countSliderTailHit: this.statistics.sliderTailHit,
                // smallTickHits:
                //     beatmapPP.performanceAttributes?.state?.osuSmallTickHits,
                countLargeTickMiss: this.statistics.largeTickMiss
            };
            if (this.mode === 3) {
                delete calcOptions.maxCombo;
                calcOptions.accuracy = this.accuracy;

                calcOptions.countMiss = 0;
                calcOptions.countMeh = 0;
                calcOptions.countOk = 0;
                calcOptions.countGood = this.statistics.good;
                calcOptions.countGreat = this.statistics.great;
                calcOptions.countPerfect =
                    this.statistics.perfect +
                    this.statistics.ok +
                    this.statistics.meh +
                    this.statistics.miss;
                delete calcOptions.countSliderTailHit;
                // delete fcCalcOptions.smallTickHits;
                delete calcOptions.countLargeTickMiss;
            }

            const t2 = performance.now();
            const fcPerformance = beatmapPP.performanceCalculator.calculate(
                calcOptions,
                beatmapPP.attributes
            );

            this.pp = curPerformance.total;
            this.fcPP = fcPerformance.total;

            silentCatch(nativeMods?.destroy);

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
