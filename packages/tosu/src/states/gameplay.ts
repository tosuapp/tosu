import rosu, { PerformanceArgs } from '@kotrikd/rosu-pp';
import { ClientType, config, wLogger } from '@tosu/common';

import { AbstractInstance } from '@/instances';
import { AbstractState } from '@/states/index';
import { KeyOverlay, LeaderboardPlayer } from '@/states/types';
import { calculateGrade, calculatePassedObjects } from '@/utils/calculators';
import { defaultCalculatedMods, removeDebuffMods } from '@/utils/osuMods';
import { CalculateMods, OsuMods } from '@/utils/osuMods.types';

const defaultLBPlayer = {
    name: '',
    score: 0,
    combo: 0,
    maxCombo: 0,
    mods: Object.assign({}, defaultCalculatedMods),
    h300: 0,
    h100: 0,
    h50: 0,
    h0: 0,
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
    lostCombo: number;
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
    keyOverlay: KeyOverlay;
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
        this.lostCombo = 0;
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
            mods: this.mods.number,
            mode: this.mode,
            hits: {
                300: this.hit300,
                geki: 0,
                100: this.hit100,
                katu: 0,
                50: this.hit50,
                0: this.hitMiss
            }
        });

        this.gradeExpected = this.gradeCurrent;
        this.keyOverlay = {
            K1Pressed: false,
            K1Count: 0,
            K2Pressed: false,
            K2Count: 0,
            M1Pressed: false,
            M1Count: 0,
            M2Pressed: false,
            M2Count: 0
        };
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

        this.keyOverlay.K1Pressed = false;
        this.keyOverlay.K2Pressed = false;
        this.keyOverlay.M1Pressed = false;
        this.keyOverlay.M2Pressed = false;

        this.keyOverlay.K1Count = 0;
        this.keyOverlay.K2Count = 0;
        this.keyOverlay.M1Count = 0;
        this.keyOverlay.M2Count = 0;

        this.isKeyOverlayDefaultState = true;
    }

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

            this.hit100 = result.hit100;
            this.hit300 = result.hit300;
            this.hit50 = result.hit50;
            this.hitGeki = result.hitGeki;
            this.hitKatu = result.hitKatu;
            this.hitMiss = result.hitMiss;
            this.sliderEndHits = result.sliderEndHits;
            this.smallTickHits = result.smallTickHits;
            this.largeTickHits = result.largeTickHits;

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
            if (this.combo < this.comboPrev) {
                this.lostCombo += this.comboPrev;
                if (this.hitMiss === this.hitMissPrev) this.hitSB += 1;
            }
            this.hitMissPrev = this.hitMiss;
            this.comboPrev = this.combo;

            this.updateGrade(menu.objectCount);
            this.updateStarsAndPerformance();
            this.updateLeaderboard();

            this.resetReportCount('gameplay updateState');
        } catch (exc) {
            this.reportError(
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

            if (result.K1Count < 0 || result.K1Count > 1_000_000) {
                result.K1Pressed = false;
                result.K1Count = 0;
            }
            if (result.K2Count < 0 || result.K2Count > 1_000_000) {
                result.K2Pressed = false;
                result.K2Count = 0;
            }
            if (result.M1Count < 0 || result.M1Count > 1_000_000) {
                result.M1Pressed = false;
                result.M1Count = 0;
            }
            if (result.M2Count < 0 || result.M2Count > 1_000_000) {
                result.M2Pressed = false;
                result.M2Count = 0;
            }

            this.keyOverlay = result;
            this.isKeyOverlayDefaultState = false;

            const keysLine = `${this.keyOverlay.K1Count}:${this.keyOverlay.K2Count}:${this.keyOverlay.M1Count}:${this.keyOverlay.M2Count}`;
            if (this.cachedkeys !== keysLine) {
                wLogger.debug(
                    ClientType[this.game.client],
                    this.game.pid,
                    `gameplay updateKeyOverlay`,
                    keysLine
                );
                this.cachedkeys = keysLine;
            }

            this.resetReportCount('gameplay updateKeyOverlay');
        } catch (exc) {
            this.reportError(
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

            this.resetReportCount('gameplay updateHitErrors');
        } catch (exc) {
            this.reportError(
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
        const remaining =
            objectCount - this.hit300 - this.hit100 - this.hit50 - this.hitMiss;

        this.gradeCurrent = calculateGrade({
            isLazer: this.game.client === ClientType.lazer,
            mods: this.mods.number,
            mode: this.mode,
            hits: {
                300: this.hit300,
                geki: 0,
                100: this.hit100,
                katu: 0,
                50: this.hit50,
                0: this.hitMiss
            }
        });

        this.gradeExpected = calculateGrade({
            isLazer: this.game.client === ClientType.lazer,
            mods: this.mods.number,
            mode: this.mode,
            hits: {
                300: this.hit300 + remaining,
                geki: 0,
                100: this.hit100,
                katu: 0,
                50: this.hit50,
                0: this.hitMiss
            }
        });
    }

    private updateLeaderboard() {
        try {
            const result = this.game.memory.leaderboard();
            if (result instanceof Error) throw result;

            this.isLeaderboardVisible = result[0];
            this.leaderboardPlayer =
                result[1] || Object.assign({}, defaultLBPlayer);
            this.leaderboardScores = result[2];

            this.resetReportCount('gameplay updateLeaderboard');
        } catch (exc) {
            this.reportError(
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

    private updateStarsAndPerformance() {
        try {
            const t1 = performance.now();
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
                mods: removeDebuffMods(this.mods.array),
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

                this.gradualPerformance = new rosu.GradualPerformance(
                    difficulty,
                    currentBeatmap
                );
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
                this.hit300,
                this.hit100,
                this.hit50,
                this.hitMiss,
                this.hitKatu,
                this.hitGeki
            );

            const offset = passedObjects - this.previousPassedObjects;
            if (offset <= 0) return;

            const currPerformance = this.gradualPerformance.nth(
                {
                    maxCombo: this.maxCombo,
                    misses: this.hitMiss,
                    n50: this.hit50,
                    n100: this.hit100,
                    n300: this.hit300,
                    nKatu: this.hitKatu,
                    nGeki: this.hitGeki,
                    sliderEndHits: this.sliderEndHits,
                    osuSmallTickHits: this.smallTickHits,
                    osuLargeTickHits: this.largeTickHits
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

            const isMania = this.mode === 3;
            const maxBeatmapCombo = (
                isMania
                    ? this.performanceAttributes.state?.nGeki
                    : this.performanceAttributes.state?.maxCombo
            )!;

            const calcOptions: PerformanceArgs = {
                combo: Math.max(
                    this.maxCombo,
                    maxBeatmapCombo - this.lostCombo
                ),
                nGeki: isMania
                    ? maxBeatmapCombo -
                      this.hit300 -
                      this.hitKatu -
                      this.hit100 -
                      this.hit50 -
                      this.hitMiss
                    : this.hitGeki,
                n300: isMania
                    ? this.hit300
                    : maxBeatmapCombo - this.hit100 - this.hit50 - this.hitMiss,
                nKatu: this.hitKatu,
                n100: this.hit100,
                n50: this.hit50,
                smallTickHits:
                    this.performanceAttributes.state?.osuSmallTickHits,
                largeTickHits:
                    this.performanceAttributes.state?.osuLargeTickHits,
                ...commonParams
            };

            const maxAchievablePerformance = new rosu.Performance(
                calcOptions
            ).calculate(this.performanceAttributes);

            if (maxAchievablePerformance) {
                beatmapPP.currAttributes.maxAchievable =
                    maxAchievablePerformance.pp;
                beatmapPP.updatePPAttributes(
                    'maxAchievable',
                    maxAchievablePerformance
                );
            }

            calcOptions.misses = 0;
            delete calcOptions.combo;
            const fcPerformance = new rosu.Performance(calcOptions).calculate(
                this.performanceAttributes
            );

            if (fcPerformance) {
                beatmapPP.currAttributes.fcPP = fcPerformance.pp;
                beatmapPP.updatePPAttributes('fc', fcPerformance);
            }

            this.previousPassedObjects = passedObjects;
            wLogger.debug(
                ClientType[this.game.client],
                this.game.pid,
                `gameplay updateStarsAndPerformance`,
                `[${(performance.now() - t1).toFixed(2)}ms] elapsed time`
            );

            this.resetReportCount('gameplay updateStarsAndPerformance');
        } catch (exc) {
            this.reportError(
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
