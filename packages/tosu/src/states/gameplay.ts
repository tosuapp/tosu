import rosu, { HitResultPriority, PerformanceArgs } from '@kotrikd/rosu-pp';
import { ClientType, config, measureTime, wLogger } from '@tosu/common';

import { AbstractInstance } from '@/instances';
import { AbstractState } from '@/states/index';
import {
    KeyOverlayButton,
    LeaderboardPlayer,
    Statistics
} from '@/states/types';
import { calculateGrade, calculatePassedObjects } from '@/utils/calculators';
import { defaultCalculatedMods, sanitizeMods } from '@/utils/osuMods';
import { CalculateMods, OsuMods } from '@/utils/osuMods.types';

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
    isDefaultState: boolean = true;
    isKeyOverlayDefaultState: boolean = true;

    performanceAttributes: rosu.PerformanceAttributes | undefined;
    gradualPerformance: rosu.GradualPerformance | undefined;

    retries: number;
    playerName: string;
    mods: CalculateMods = Object.assign({}, defaultCalculatedMods);
    hitErrors: number[];
    mode: number;
    maxCombo: number;
    score: number;

    statistics: Statistics;
    maximumStatistics: Statistics;

    hitMissPrev: number;
    hitUR: number;
    hitSB: number;
    comboPrev: number;
    combo: number;
    playerHPSmooth: number;
    playerHP: number;
    accuracy: number;
    unstableRate: number;
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

    constructor(game: AbstractInstance) {
        super(game);

        this.init();
    }

    init(isRetry?: boolean, from?: string) {
        wLogger.debug(
            ClientType[this.game.client],
            this.game.pid,
            `gameplay init (${isRetry} - ${from})`
        );

        this.hitErrors = [];
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

        this.previousPassedObjects = 0;
        this.gradualPerformance = undefined;
        this.performanceAttributes = undefined;
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

    resetQuick() {
        wLogger.debug(
            ClientType[this.game.client],
            this.game.pid,
            `gameplay resetQuick`
        );

        this.previousPassedObjects = 0;
        this.gradualPerformance = undefined;
        this.performanceAttributes = undefined;
    }

    resetKeyOverlay() {
        if (this.isKeyOverlayDefaultState) {
            return;
        }

        wLogger.debug(
            ClientType[this.game.client],
            this.game.pid,
            `gameplay resetKeyOverlay`
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
                    ClientType[this.game.client],
                    this.game.pid,
                    `gameplay updateState`,
                    result
                );
                return 'not-ready';
            }

            // Resetting default state value, to define other componenets that we have touched gameplay
            // needed for ex like you done with replay watching/gameplay and return to mainMenu, you need alteast one reset to gameplay/resultScreen
            this.isDefaultState = false;

            this.retries = result.retries;
            this.playerName = result.playerName;
            this.mods = result.mods;
            this.mode = result.mode;
            this.score = result.score;
            this.playerHPSmooth = result.playerHPSmooth;
            this.playerHP = result.playerHP;
            this.accuracy = result.accuracy;

            this.statistics = result.statistics;
            this.maximumStatistics = result.maximumStatistics;

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
            this.updateStarsAndPerformance();
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
                ClientType[this.game.client],
                this.game.pid,
                `gameplay updateState`,
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
                    ClientType[this.game.client],
                    this.game.pid,
                    `gameplay updateKeyOverlay`,
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
                    ClientType[this.game.client],
                    this.game.pid,
                    `gameplay updateKeyOverlay`,
                    keysLine
                );
                this.cachedkeys = keysLine;
            }

            this.game.resetReportCount('gameplay updateKeyOverlay');
        } catch (exc) {
            this.game.reportError(
                'gameplay updateKeyOverlay',
                10,
                ClientType[this.game.client],
                this.game.pid,
                `gameplay updateKeyOverlay`,
                (exc as any).message
            );
            wLogger.debug(
                ClientType[this.game.client],
                this.game.pid,
                `gameplay updateKeyOverlay`,
                exc
            );
        }
    }

    updateHitErrors() {
        try {
            const result = this.game.memory.hitErrors();
            if (result instanceof Error) throw result;
            if (typeof result === 'string') {
                if (result === '') return;

                wLogger.debug(
                    ClientType[this.game.client],
                    this.game.pid,
                    `gameplay updateHitErrors`,
                    result
                );

                return 'not-ready';
            }

            this.hitErrors = result;

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
                ClientType[this.game.client],
                this.game.pid,
                `gameplay updateHitErrors`,
                exc
            );
        }
    }

    // IMPROVE, WE DONT NEED TO SUM EVERY HITERROR EACH TIME (for future)
    private calculateUR(): number {
        if (this.hitErrors.length < 1) {
            return 0;
        }

        let totalAll = 0.0;
        for (const hit of this.hitErrors) {
            totalAll += hit;
        }

        const average = totalAll / this.hitErrors.length;
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
                ClientType[this.game.client],
                this.game.pid,
                `gameplay updateLeaderboard`,
                exc
            );
        }
    }

    @measureTime
    private updateStarsAndPerformance() {
        try {
            if (!config.calculatePP) {
                wLogger.debug(
                    ClientType[this.game.client],
                    this.game.pid,
                    `gameplay updateStarsAndPerformance pp calculation disabled`
                );
                return;
            }

            const { global, beatmapPP, menu } = this.game.getServices([
                'global',
                'beatmapPP',
                'menu'
            ]);

            if (!global.gameFolder) {
                wLogger.debug(
                    ClientType[this.game.client],
                    this.game.pid,
                    `gameplay updateStarsAndPerformance game folder not found`
                );
                return;
            }

            const currentBeatmap = beatmapPP.getCurrentBeatmap();
            if (!currentBeatmap) {
                wLogger.debug(
                    ClientType[this.game.client],
                    this.game.pid,
                    `gameplay updateStarsAndPerformance can't get current map`
                );
                return;
            }

            const currentState = `${menu.checksum}:${menu.gamemode}:${this.mods.checksum}:${menu.mp3Length}`;
            const isUpdate = this.previousState !== currentState;

            const commonParams = {
                mods: sanitizeMods(this.mods.array),
                lazer: this.game.client === ClientType.lazer
            };

            // update precalculated attributes
            if (
                isUpdate ||
                !this.gradualPerformance ||
                !this.performanceAttributes
            ) {
                this.gradualPerformance?.free();
                this.performanceAttributes?.free();

                const difficulty = new rosu.Difficulty(commonParams);

                this.gradualPerformance =
                    difficulty.gradualPerformance(currentBeatmap);
                this.performanceAttributes = new rosu.Performance(
                    commonParams
                ).calculate(currentBeatmap);

                this.previousState = currentState;
            }

            if (!this.gradualPerformance || !this.performanceAttributes) {
                wLogger.debug(
                    ClientType[this.game.client],
                    this.game.pid,
                    `gameplay updateStarsAndPerformance One of the things not ready`,
                    `gradual: ${this.gradualPerformance === undefined} - attributes: ${this.performanceAttributes === undefined}`
                );
                return;
            }

            const passedObjects = calculatePassedObjects(
                this.mode,
                this.statistics
            );

            const offset = passedObjects - this.previousPassedObjects;
            if (offset <= 0) return;

            const currPerformance = this.gradualPerformance.nth(
                {
                    nGeki: this.statistics.perfect,
                    n300: this.statistics.great,
                    nKatu: this.statistics.good,
                    n100: this.statistics.ok,
                    n50: this.statistics.meh,
                    misses: this.statistics.miss,
                    sliderEndHits: this.statistics.sliderTailHit,
                    osuSmallTickHits: this.statistics.smallTickHit,
                    osuLargeTickHits: this.statistics.largeTickHit,
                    maxCombo: this.maxCombo
                },
                offset - 1
            );

            if (currPerformance) {
                beatmapPP.updateCurrentAttributes(
                    currPerformance.difficulty.stars,
                    currPerformance.pp
                );

                beatmapPP.updatePPAttributes('curr', currPerformance);
            }

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

            const calcOptions: PerformanceArgs = {
                nGeki: this.statistics.perfect,
                n300:
                    maxJudgementsAmount -
                    this.statistics.ok -
                    this.statistics.meh -
                    this.statistics.miss,
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
            if (this.mode === 3) {
                calcOptions.nGeki =
                    maxJudgementsAmount -
                    this.statistics.ok -
                    this.statistics.meh -
                    this.statistics.miss;
                calcOptions.n300 = this.statistics.great;
                calcOptions.hitresultPriority = HitResultPriority.Fastest;
                delete calcOptions.combo;
            }

            const maxAchievablePerformance = new rosu.Performance(
                calcOptions
            ).calculate(this.performanceAttributes);

            if (maxAchievablePerformance) {
                beatmapPP.currAttributes.maxAchievable =
                    maxAchievablePerformance.pp;
            }

            if (this.mode === 3) {
                delete calcOptions.nGeki;
                delete calcOptions.n300;
                delete calcOptions.nKatu;
                calcOptions.n100 = this.statistics.ok;
                calcOptions.n50 = this.statistics.meh;
                calcOptions.misses = this.statistics.miss;
                delete calcOptions.sliderEndHits;
                delete calcOptions.smallTickHits;
                delete calcOptions.largeTickHits;
                calcOptions.accuracy = this.accuracy;
                calcOptions.hitresultPriority = HitResultPriority.Fastest;
            } else {
                calcOptions.n300 = this.statistics.great + this.statistics.miss;
                calcOptions.combo = beatmapPP.calculatedMapAttributes.maxCombo;
                calcOptions.sliderEndHits =
                    this.performanceAttributes.state?.sliderEndHits;
                calcOptions.smallTickHits =
                    this.performanceAttributes.state?.osuSmallTickHits;
                calcOptions.largeTickHits =
                    this.performanceAttributes.state?.osuLargeTickHits;
                calcOptions.misses = 0;
            }

            const fcPerformance = new rosu.Performance(calcOptions).calculate(
                this.performanceAttributes
            );

            if (fcPerformance) {
                beatmapPP.currAttributes.fcPP = fcPerformance.pp;
                beatmapPP.updatePPAttributes('fc', fcPerformance);
            }

            this.previousPassedObjects = passedObjects;

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
                ClientType[this.game.client],
                this.game.pid,
                `gameplay updateStarsAndPerformance`,
                exc
            );
        }
    }
}
