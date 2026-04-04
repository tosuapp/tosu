import { ClientType, measureTime, wLogger } from '@tosu/common';
import type { ScoreInfoData } from '@tosu/pp';

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
            const diffAttrs = beatmapPP.difficultyAttributes;
            if (!currentBeatmap || !diffAttrs) {
                wLogger.debug(
                    `%${ClientType[this.game.client]}%`,
                    `Result screen PP calc skipped: Can't get current map`
                );
                return;
            }

            const mods = sanitizeMods(this.mods.array).map((r) => r.acronym);
            if (this.game.client !== ClientType.lazer) {
                // Add classic mod if client is not on lazer.
                mods.push('CL');
            }

            const calcOptions: ScoreInfoData = {
                totalScore: this.score,
                maxCombo: this.maxCombo,
                accuracy: this.accuracy / 100,
                mods,
                largeTickHits: this.statistics.largeTickHit,
                largeTickMisses: this.statistics.largeTickMiss || 0,
                smallTickHits: this.statistics.smallTickHit,
                smallTickMisses: this.statistics.smallTickMiss || 0,
                sliderEndHits: this.statistics.sliderTailHit,
                comboBreaks: this.statistics.comboBreak || 0,
                ignoreHits: this.statistics.ignoreHit || 0,
                ignoreMisses: this.statistics.ignoreMiss || 0,
                largeBonuses: this.statistics.largeBonus || 0,
                smallBonuses: this.statistics.smallBonus || 0,
                perfects: this.statistics.perfect,
                greats: this.statistics.great,
                goods: this.statistics.good,
                oks: this.statistics.ok,
                mehs: this.statistics.meh,
                misses: this.statistics.miss
            };

            const t1 = performance.now();
            const curPerformance = currentBeatmap.calculatePerformance(
                diffAttrs,
                calcOptions
            );

            const fcCalcOptions: ScoreInfoData = {
                ...calcOptions,
                greats: this.statistics.great + this.statistics.miss,
                misses: 0,
                maxCombo: beatmapPP.calculatedMapAttributes.maxCombo
            };
            if (this.mode === 3) {
                fcCalcOptions.perfects =
                    this.statistics.perfect +
                    this.statistics.ok +
                    this.statistics.meh +
                    this.statistics.miss;
                fcCalcOptions.greats = this.statistics.great;
                fcCalcOptions.goods = this.statistics.good;
                fcCalcOptions.oks = 0;
                fcCalcOptions.mehs = 0;
                fcCalcOptions.misses = 0;
                fcCalcOptions.accuracy = this.accuracy / 100;
            }

            const t2 = performance.now();
            const fcPerformance = currentBeatmap.calculatePerformance(
                diffAttrs,
                fcCalcOptions
            );

            this.pp = curPerformance.pp;
            this.fcPP = fcPerformance.pp;

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
