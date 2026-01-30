import { ClientType, measureTime, wLogger } from '@tosu/common';
import {
    DifficultyCalculatorFactory,
    Mod,
    ModsCollection,
    OsuDifficultyCalculator,
    OsuPerformanceCalculator,
    PerformanceCalculatorFactory,
    Ruleset
} from '@tosuapp/osu-native-wrapper';

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
                mods: sanitizeMods(this.mods.array),
                lazer: this.game.client === ClientType.lazer
            };
            const t1 = performance.now();

            const mods = commonParams.mods;
            if (
                this.game.client !== ClientType.lazer &&
                !mods.some((m) => m.acronym === 'CL')
            ) {
                mods.unshift({ acronym: 'CL' });
            }

            let nativeMods: ModsCollection | null = null;
            const nativeModsOwned: Mod[] = [];

            try {
                if (mods.length > 0) {
                    nativeMods = ModsCollection.create();

                    for (const m of mods) {
                        let mod: Mod;
                        try {
                            mod = Mod.create(m.acronym);
                        } catch {
                            continue;
                        }

                        nativeModsOwned.push(mod);
                        nativeMods.add(mod);
                    }
                }

                const ruleset = Ruleset.fromId(this.mode);
                try {
                    const difficultyCalc =
                        DifficultyCalculatorFactory.create<OsuDifficultyCalculator>(
                            ruleset,
                            currentBeatmap
                        );
                    const performanceCalc =
                        PerformanceCalculatorFactory.create<OsuPerformanceCalculator>(
                            ruleset
                        );

                    try {
                        const difficulty = nativeMods
                            ? difficultyCalc.calculateWithMods(nativeMods)
                            : difficultyCalc.calculate();

                        const curPerformance = performanceCalc.calculate(
                            {
                                ruleset,
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
                                countSliderTailHit:
                                    this.statistics.sliderTailHit,
                                countLargeTickMiss:
                                    this.statistics.largeTickMiss
                            },
                            difficulty
                        );

                        const totalHits =
                            this.statistics.great +
                            this.statistics.ok +
                            this.statistics.meh +
                            this.statistics.miss;

                        const fcAccuracy =
                            this.mode === 0 && totalHits > 0
                                ? ((this.statistics.great +
                                      this.statistics.miss) *
                                      300 +
                                      this.statistics.ok * 100 +
                                      this.statistics.meh * 50) /
                                  (totalHits * 300)
                                : this.accuracy / 100;

                        const fcPerformance = performanceCalc.calculate(
                            {
                                ruleset,
                                beatmap: currentBeatmap,
                                mods: nativeMods,
                                maxCombo:
                                    beatmapPP.calculatedMapAttributes.maxCombo,
                                accuracy: fcAccuracy,
                                countMiss: 0,
                                countMeh: this.statistics.meh,
                                countOk: this.statistics.ok,
                                countGood: this.statistics.good,
                                countGreat:
                                    this.statistics.great +
                                    this.statistics.miss,
                                countPerfect: this.statistics.perfect,
                                countSliderTailHit:
                                    this.statistics.sliderTailHit,
                                countLargeTickMiss:
                                    this.statistics.largeTickMiss
                            },
                            difficulty
                        );

                        this.pp = curPerformance.total;
                        this.fcPP = fcPerformance.total;
                    } finally {
                        performanceCalc.destroy();
                        difficultyCalc.destroy();
                    }
                } finally {
                    ruleset.destroy();
                }
            } finally {
                nativeMods?.destroy();
                for (const mod of nativeModsOwned) {
                    mod.destroy();
                }
            }

            const t2 = performance.now();

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
