import {
    CalculateMods,
    ClientType,
    GameState,
    ModsCollection,
    NativeTimedOsuDifficultyAttributes,
    OsuMods,
    ScoreInfoInput,
    TimedLazy,
    config,
    defaultCalculatedMods,
    measureTime,
    sanitizeMods,
    silentCatch,
    wLogger
} from '@tosu/common';

import { AbstractInstance } from '@/instances';
import { AbstractState } from '@/states/index';
import {
    KeyOverlayButton,
    LeaderboardPlayer,
    Statistics
} from '@/states/types';
import {
    calculateAccuracy,
    calculateGrade,
    calculatePassedObjects
} from '@/utils/calculators';

export const defaultStatistics = {
    miss: 0,
    meh: 0,
    ok: 0,
    good: 0,
    great: 0,
    perfect: 0,
    smallTickMiss: 0,
    smallTickHit: 0,
    largeTickMiss: 0,
    largeTickHit: 0,
    smallBonus: 0,
    largeBonus: 0,
    ignoreMiss: 0,
    ignoreHit: 0,
    comboBreak: 0,
    sliderTailHit: 0,
    legacyComboIncrease: 0
};

const defaultLBPlayer = {
    name: '',
    score: 0,
    combo: 0,
    maxCombo: 0,
    accuracy: 100,
    mods: Object.assign({}, defaultCalculatedMods),
    statistics: Object.assign({}, defaultStatistics),
    team: 0,
    position: 0,
    isPassing: false
} as LeaderboardPlayer;

export class Gameplay extends AbstractState {
    isCalculating: boolean = false;
    isDefaultState: boolean = true;
    isKeyOverlayDefaultState: boolean = true;

    failed: boolean;

    retries: number;
    playerName: string;
    mods: CalculateMods = Object.assign({}, defaultCalculatedMods);
    hitErrors: number[] = [];
    mode: number;
    maxCombo: number;
    score: number;

    statistics: Statistics;
    maximumStatistics: Statistics;

    nativeMods?: ModsCollection;
    timedLazy?: TimedLazy<NativeTimedOsuDifficultyAttributes>;

    unstableRate: number;
    totalHitErrors: number = 0;

    hitMissPrev: number;
    hitUR: number;
    hitSB: number;
    comboPrev: number;
    combo: number;
    playerHPSmooth: number;
    playerHP: number;
    accuracy: number;
    gradeCurrent: string;
    gradeExpected: string;
    keyOverlay: KeyOverlayButton[];
    isReplayUiHidden: boolean;

    isLeaderboardVisible: boolean = false;
    leaderboardPlayer: LeaderboardPlayer;
    leaderboardScores: LeaderboardPlayer[] = [];

    private cachedkeys: string = '';

    previousState: string = '';
    previousPassedObjects = 0;
    previousHitErrorIndex = 0;

    constructor(game: AbstractInstance) {
        super(game);

        this.init();
    }

    init(isRetry?: boolean, from?: string) {
        wLogger.debug(
            `%${ClientType[this.game.client]}%`,
            `Initializing gameplay state (Retry: %${isRetry}% - From: %${from}%)`
        );

        this.failed = false;

        this.hitErrors = [];
        this.totalHitErrors = 0;
        this.maxCombo = 0;
        this.score = 0;
        this.statistics = Object.assign({}, defaultStatistics);
        this.maximumStatistics = Object.assign({}, defaultStatistics);

        this.hitMissPrev = 0;
        this.hitUR = 0.0;
        this.hitSB = 0;
        this.comboPrev = 0;
        this.combo = 0;
        this.playerHPSmooth = 0.0;
        this.playerHP = 0.0;
        this.accuracy = 100.0;
        this.unstableRate = 0;
        this.gradeCurrent = calculateGrade({
            isLazer: this.game.client === ClientType.lazer,

            mods: this.mods.array,
            mode: this.mode,
            accuracy: this.accuracy,

            statistics: this.statistics
        });

        this.gradeExpected = this.gradeCurrent;
        this.keyOverlay = [];
        this.isReplayUiHidden = false;

        this.resetGradual();

        // below is data that shouldn't be reseted on retry
        if (isRetry === true) {
            return;
        }

        this.isDefaultState = true;
        this.retries = 0;
        this.playerName = '';
        this.mode = 0;
        this.mods = Object.assign({}, defaultCalculatedMods);
        this.isLeaderboardVisible = false;
        this.leaderboardPlayer = Object.assign({}, defaultLBPlayer);
        this.leaderboardScores = [];
    }

    resetGradual() {
        wLogger.debug(
            `%${ClientType[this.game.client]}%`,
            `Reset gradual calculator`
        );

        silentCatch(this.timedLazy?.destroy, this.timedLazy?.enumerator);

        this.timedLazy = undefined;
        this.previousPassedObjects = 0;
    }

    resetHitErrors() {
        this.hitErrors = [];
        this.totalHitErrors = 0;
        this.previousHitErrorIndex = 0;
    }

    resetKeyOverlay() {
        if (this.isKeyOverlayDefaultState) {
            return;
        }

        wLogger.debug(
            `%${ClientType[this.game.client]}%`,
            `Resetting key overlay`
        );

        this.keyOverlay.forEach((key) => {
            key.isPressed = false;
            key.count = 0;
        });

        this.isKeyOverlayDefaultState = true;
    }

    @measureTime
    updateState() {
        try {
            const menu = this.game.get('menu');
            if (menu === null) {
                return 'not-ready';
            }

            const result = this.game.memory.gameplay();
            if (result instanceof Error) throw result;
            if (typeof result === 'string') {
                wLogger.debug(
                    `%${ClientType[this.game.client]}%`,
                    `Gameplay state update not ready:`,
                    result
                );
                return 'not-ready';
            }

            // Resetting default state value, to define other componenets that we have touched gameplay
            // needed for ex like you done with replay watching/gameplay and return to mainMenu, you need alteast one reset to gameplay/resultScreen
            this.isDefaultState = false;

            this.failed = result.failed;

            this.retries = result.retries;
            this.playerName = result.playerName;
            this.mods = result.mods;
            this.mode = result.mode;
            this.score = result.score;
            this.playerHPSmooth = result.playerHPSmooth;
            this.playerHP = result.playerHP;
            this.statistics = result.statistics;
            this.maximumStatistics = result.maximumStatistics;

            this.accuracy = calculateAccuracy({
                isLazer: this.game.client === ClientType.lazer,
                mode: this.mode,
                mods: this.mods.array,
                statistics: this.statistics
            });

            this.combo = result.combo;
            this.maxCombo = result.maxCombo;

            if (this.maxCombo > 0) {
                const baseUR = this.calculateUR();
                if (
                    (this.mods.number & OsuMods.DoubleTime) ===
                    OsuMods.DoubleTime
                ) {
                    this.unstableRate = baseUR / 1.5;
                } else if (
                    (this.mods.number & OsuMods.HalfTime) ===
                    OsuMods.HalfTime
                ) {
                    this.unstableRate = baseUR * 1.33;
                } else {
                    this.unstableRate = baseUR;
                }
            }

            if (this.comboPrev > this.maxCombo) {
                this.comboPrev = 0;
            }
            if (
                this.combo < this.comboPrev &&
                this.statistics.miss === this.hitMissPrev
            ) {
                this.hitSB += 1;
            }
            this.hitMissPrev = this.statistics.miss;
            this.comboPrev = this.combo;

            this.updateGrade(menu.objectCount);
            this.updateLeaderboard();

            this.game.resetReportCount('gameplay updateState');
        } catch (exc) {
            this.game.reportError(
                'gameplay updateState',
                10,
                ClientType[this.game.client],
                this.game.pid,
                `gameplay updateState`,
                (exc as any).message
            );
            wLogger.debug(
                `%${ClientType[this.game.client]}%`,
                `Error updating gameplay state:`,
                exc
            );
        }
    }

    @measureTime
    updateKeyOverlay() {
        try {
            const result = this.game.memory.keyOverlay(this.mode);
            if (result instanceof Error) throw result;
            if (typeof result === 'string') {
                if (result === '') return;

                wLogger.debug(
                    `%${ClientType[this.game.client]}%`,
                    `Key overlay update not ready:`,
                    result
                );
                return 'not-ready';
            }

            result.forEach((key) => {
                if (key.count < 0 || key.count > 1_000_000) {
                    key.isPressed = false;
                    key.count = 0;
                }
            });

            this.keyOverlay = result;
            this.isKeyOverlayDefaultState = false;

            const keysLine = result.map((key) => key.count).join(':');
            if (this.cachedkeys !== keysLine) {
                wLogger.debug(
                    `%${ClientType[this.game.client]}%`,
                    `Key overlay counts updated:`,
                    keysLine
                );
                this.cachedkeys = keysLine;
            }

            this.game.resetReportCount('gameplay updateKeyOverlay');
        } catch (exc) {
            this.game.reportError(
                'gameplay updateKeyOverlay',
                20,
                ClientType[this.game.client],
                this.game.pid,
                `gameplay updateKeyOverlay`,
                (exc as any).message
            );
            wLogger.debug(
                `%${ClientType[this.game.client]}%`,
                `Error updating key overlay:`,
                exc
            );
        }
    }

    updateHitErrors() {
        try {
            const result = this.game.memory.hitErrors(
                this.previousHitErrorIndex
            );
            if (result instanceof Error) throw result;
            if (typeof result === 'string') {
                if (result === '') return;

                wLogger.debug(
                    `%${ClientType[this.game.client]}%`,
                    `Hit errors update not ready:`,
                    result
                );

                return 'not-ready';
            }

            for (const hit of result.array) {
                this.hitErrors.push(hit);
                this.totalHitErrors += hit;
            }
            this.previousHitErrorIndex = result.index;

            this.game.resetReportCount('gameplay updateHitErrors');
        } catch (exc) {
            this.game.reportError(
                'gameplay updateHitErrors',
                50,
                ClientType[this.game.client],
                this.game.pid,
                `gameplay updateHitErrors`,
                (exc as any).message
            );
            wLogger.debug(
                `%${ClientType[this.game.client]}%`,
                `Error updating hit errors:`,
                exc
            );
        }
    }

    private calculateUR(): number {
        if (this.hitErrors.length < 1) {
            return 0;
        }

        const average = this.totalHitErrors / this.hitErrors.length;
        let variance = 0;
        for (const hit of this.hitErrors) {
            variance += Math.pow(hit - average, 2);
        }
        variance = variance / this.hitErrors.length;

        return Math.sqrt(variance) * 10;
    }

    private updateGrade(objectCount: number) {
        this.gradeCurrent = calculateGrade({
            isLazer: this.game.client === ClientType.lazer,

            mods: this.mods.array,
            mode: this.mode,
            accuracy: this.accuracy,

            statistics: this.statistics
        });

        this.gradeExpected = calculateGrade({
            isLazer: this.game.client === ClientType.lazer,

            mods: this.mods.array,
            mode: this.mode,
            accuracy: this.accuracy,

            statistics: Object.assign({}, this.statistics, {
                great:
                    this.statistics.great +
                    objectCount -
                    this.statistics.great -
                    this.statistics.ok -
                    this.statistics.meh -
                    this.statistics.miss
            } as Statistics)
        });
    }

    @measureTime
    private updateLeaderboard() {
        try {
            const result = this.game.memory.leaderboard(this.mode);
            if (result instanceof Error) throw result;

            this.isLeaderboardVisible = result[0];
            this.leaderboardPlayer =
                result[1] || Object.assign({}, defaultLBPlayer);
            this.leaderboardScores = result[2];

            this.game.resetReportCount('gameplay updateLeaderboard');
        } catch (exc) {
            this.game.reportError(
                'gameplay updateLeaderboard',
                10,
                ClientType[this.game.client],
                this.game.pid,
                `gameplay updateLeaderboard`,
                (exc as any).message
            );
            wLogger.debug(
                `%${ClientType[this.game.client]}%`,
                `Error updating leaderboard:`,
                exc
            );
        }
    }

    @measureTime
    updateStarsAndPerformance() {
        try {
            if (!config.calculatePP) {
                wLogger.debug(
                    `%${ClientType[this.game.client]}%`,
                    `PP calculation disabled`
                );
                return;
            }

            const { global, beatmapPP, menu } = this.game.getServices([
                'global',
                'beatmapPP',
                'menu'
            ]);

            if (!beatmapPP.ruleset) return;

            if (!global.gameFolder) {
                wLogger.debug(
                    `%${ClientType[this.game.client]}%`,
                    `Game folder not found, skipping PP calc`
                );
                return;
            }

            const beatmap = beatmapPP.getCurrentBeatmap();
            if (!beatmap) {
                wLogger.debug(
                    `%${ClientType[this.game.client]}%`,
                    `Current beatmap unavailable, skipping PP calc`
                );
                return;
            }

            const commonParams = {
                mods: sanitizeMods(this.mods.array),
                lazer: this.game.client === ClientType.lazer
            };

            const currentState = `${menu.checksum}:${beatmapPP.ruleset.rulesetId}:${this.mods.checksum}:${menu.mp3Length}`;
            if (this.previousState !== currentState || !this.timedLazy) {
                const result = this.game.calculator.gradual({
                    lazer: commonParams.lazer,
                    beatmap,
                    ruleset: beatmapPP.ruleset!,
                    mods: commonParams.mods
                });
                if (result instanceof Error) {
                    wLogger.error(
                        ClientType[this.game.client],
                        this.game.pid,
                        `gameplay updateStarsAndPerformance lazy not ready`,
                        result
                    );
                    return;
                }

                this.resetGradual();

                this.nativeMods = result.mods;
                this.timedLazy = result.timedLazy;
                this.previousState = currentState;
            }

            if (
                !this.nativeMods ||
                !this.timedLazy ||
                !beatmapPP.lazerBeatmap ||
                !beatmapPP.attributes ||
                !beatmapPP.performanceCalculator
            ) {
                wLogger.debug(
                    ClientType[this.game.client],
                    this.game.pid,
                    `gameplay updateStarsAndPerformance not ready`
                );
                return;
            }

            const passedObjects = calculatePassedObjects(
                beatmapPP.lazerBeatmap.hitObjects,
                global.playTime,
                this.previousPassedObjects
            );

            let offset = passedObjects - this.previousPassedObjects;
            if (offset <= 0 && this.isCalculating === false) return;
            this.isCalculating = true;

            let currentDifficulty;
            while (offset > 0) {
                // edge case: it can froze tosu if it starts recalculating huge amount of objects while user exited from gameplay
                if (global.status !== GameState.play || !this.timedLazy) {
                    this.isCalculating = false;
                    return;
                }

                currentDifficulty = this.timedLazy.next(
                    this.timedLazy.enumerator
                );

                offset--;
                this.previousPassedObjects++;
            }
            if (!currentDifficulty) {
                wLogger.debug(
                    ClientType[this.game.client],
                    this.game.pid,
                    `gameplay updateStarsAndPerformance no current currentAttributes`
                );

                this.isCalculating = false;
                return;
            }

            const scoreInput: ScoreInfoInput = {
                ruleset: beatmapPP.ruleset,
                legacyScore:
                    this.game.client !== ClientType.lazer
                        ? this.score
                        : undefined,
                beatmap,
                mods: this.nativeMods,
                maxCombo: this.maxCombo,
                accuracy: this.accuracy / 100,
                countMiss: this.statistics.miss,
                countMeh: this.statistics.meh,
                countOk: this.statistics.ok,
                countGood: this.statistics.good,
                countGreat: this.statistics.great,
                countPerfect: this.statistics.perfect,
                countSmallTickMiss: this.statistics.smallTickMiss,
                countSmallTickHit: this.statistics.smallTickHit,
                countLargeTickMiss: this.statistics.largeTickMiss,
                countLargeTickHit: this.statistics.largeTickHit,
                countSliderTailHit:
                    this.statistics.sliderTailHit ||
                    currentDifficulty.attributes.sliderCount
            };

            const currPerformance = beatmapPP.performanceCalculator.calculate(
                scoreInput,
                currentDifficulty.attributes
            );

            beatmapPP.updateCurrentAttributes(
                currentDifficulty.attributes.starRating || 0,
                currPerformance.total
            );

            beatmapPP.updatePPAttributes('curr', currPerformance);

            const maxJudgementsAmount =
                this.mode === 3 &&
                (this.game.client === ClientType.lazer ||
                    this.mods.array.includes({ acronym: 'SV2' }))
                    ? beatmapPP.calculatedMapAttributes.circles +
                      2 * beatmapPP.calculatedMapAttributes.sliders
                    : beatmapPP.calculatedMapAttributes.circles +
                      beatmapPP.calculatedMapAttributes.sliders +
                      beatmapPP.calculatedMapAttributes.spinners +
                      beatmapPP.calculatedMapAttributes.holds;

            const calcOptions: ScoreInfoInput = {
                ruleset: beatmapPP.ruleset,
                legacyScore: !commonParams.lazer ? this.score : undefined,
                beatmap,
                mods: this.nativeMods,
                maxCombo: this.maxCombo,
                accuracy: this.accuracy / 100,
                countMiss: this.statistics.miss,
                countMeh: this.statistics.meh,
                countOk: this.statistics.ok,
                countGood: this.statistics.good,
                countGreat:
                    maxJudgementsAmount -
                    this.statistics.ok -
                    this.statistics.meh -
                    this.statistics.miss,
                countPerfect: this.statistics.perfect,
                countSmallTickMiss: this.statistics.smallTickMiss,
                countSmallTickHit: this.statistics.smallTickHit,
                countLargeTickMiss: this.statistics.largeTickMiss,
                countLargeTickHit: this.statistics.largeTickHit,
                countSliderTailHit:
                    this.statistics.sliderTailHit ||
                    currentDifficulty.attributes.sliderCount
            };
            if (this.mode === 3) {
                calcOptions.countPerfect =
                    maxJudgementsAmount -
                    this.statistics.ok -
                    this.statistics.meh -
                    this.statistics.miss;
                calcOptions.countGreat = this.statistics.great;
                delete calcOptions.maxCombo;
            }

            const maxAchievablePerformance =
                beatmapPP.performanceCalculator.calculate(
                    calcOptions,
                    currentDifficulty.attributes
                );

            beatmapPP.currAttributes.maxAchievable =
                maxAchievablePerformance.total;

            if (this.mode === 3) {
                delete calcOptions.countPerfect;
                delete calcOptions.countGreat;
                delete calcOptions.countGood;
                calcOptions.countOk = this.statistics.ok;
                calcOptions.countMeh = this.statistics.meh;
                calcOptions.countMiss = this.statistics.miss;
                delete calcOptions.countLargeTickMiss;
                delete calcOptions.countSmallTickHit;
                delete calcOptions.countSliderTailHit;
                calcOptions.accuracy = this.accuracy / 100; // FIXME: implement per mode fc accuracy
            } else {
                delete calcOptions.legacyScore;
                calcOptions.countGreat =
                    maxJudgementsAmount -
                    this.statistics.ok -
                    this.statistics.meh -
                    this.statistics.miss;
                calcOptions.maxCombo =
                    beatmapPP.calculatedMapAttributes.maxCombo;
                calcOptions.countSliderTailHit =
                    beatmapPP.attributes.sliderCount;
                // calcOptions.smallTickHits =
                //     this.performanceAttributes.state?.osuSmallTickHits;
                calcOptions.countLargeTickMiss =
                    this.maximumStatistics.largeTickMiss;
                calcOptions.countMiss = 0;

                calcOptions.accuracy =
                    calculateAccuracy({
                        isLazer: commonParams.lazer,

                        mode: this.mode,
                        mods: commonParams.mods,
                        statistics: {
                            perfect: calcOptions.countPerfect || 0,
                            great: calcOptions.countGreat || 0,
                            good: calcOptions.countGood || 0,
                            ok: calcOptions.countOk || 0,
                            meh: calcOptions.countMeh || 0,
                            miss: calcOptions.countMiss || 0
                        }
                    }) / 100;
            }

            const fcPerformance = beatmapPP.performanceCalculator.calculate(
                calcOptions,
                beatmapPP.attributes
            );

            beatmapPP.currAttributes.fcPP = fcPerformance.total;
            beatmapPP.updatePPAttributes('fc', fcPerformance);

            this.previousPassedObjects = passedObjects;
            this.isCalculating = false;

            this.game.resetReportCount('gameplay updateStarsAndPerformance');
        } catch (exc) {
            this.game.reportError(
                'gameplay updateStarsAndPerformance',
                10,
                ClientType[this.game.client],
                this.game.pid,
                `gameplay updateStarsAndPerformance`,
                (exc as any).message
            );
            wLogger.debug(
                `%${ClientType[this.game.client]}%`,
                `Error in PP calculation loop:`,
                exc
            );
        }
    }
}
