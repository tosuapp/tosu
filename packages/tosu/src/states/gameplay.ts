import { ClientType, config, measureTime, wLogger } from '@tosu/common';
import {
    NativeOsuDifficultyAttributes,
    NativeTimedOsuDifficultyAttributes
} from '@tosuapp/osu-native-napi';
import {
    DifficultyCalculatorFactory,
    Mod,
    ModsCollection,
    OsuPerformanceCalculator,
    PerformanceCalculatorFactory,
    Ruleset,
    ScoreInfoInput
} from '@tosuapp/osu-native-wrapper';

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

    private nativeRuleset?: Ruleset;
    private nativeMods?: ModsCollection | null;
    private nativeModsOwned: Mod[] = [];
    private nativeDifficulty?: NativeOsuDifficultyAttributes;
    private nativeTimedDifficulty: NativeTimedOsuDifficultyAttributes[] = [];
    private nativeTimedDifficultyCurrent?: NativeOsuDifficultyAttributes;
    private nativePerformanceCalc?: OsuPerformanceCalculator;

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

        this.previousPassedObjects = 0;
        this.destroyNativePP();
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
        this.destroyNativePP();
    }

    resetHitErrors() {
        this.hitErrors = [];
        this.totalHitErrors = 0;
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

            this.failed = result.failed;

            this.retries = result.retries;
            this.playerName = result.playerName;
            this.mods = result.mods;
            this.mode = result.mode;
            this.score = result.score;
            this.playerHPSmooth = result.playerHPSmooth;
            this.playerHP = result.playerHP;

            this.statistics = result.statistics;

            this.accuracy = calculateAccuracy({
                isLazer: this.game.client === ClientType.lazer,
                mode: this.mode,
                mods: this.mods.array,
                statistics: this.statistics
            });

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
                20,
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
            const result = this.game.memory.hitErrors(this.hitErrors.length);
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

            for (const hit of result) {
                this.hitErrors.push(hit);
                this.totalHitErrors += hit;
            }

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
                ClientType[this.game.client],
                this.game.pid,
                `gameplay updateLeaderboard`,
                exc
            );
        }
    }

    private destroyNativePP() {
        try {
            this.nativePerformanceCalc?.destroy();
        } catch {
            // todo
        }
        this.nativePerformanceCalc = undefined;

        try {
            this.nativeMods?.destroy();
        } catch {
            // todo
        }
        this.nativeMods = undefined;

        for (const mod of this.nativeModsOwned) {
            try {
                mod.destroy();
            } catch {
                // todo
            }
        }
        this.nativeModsOwned = [];

        try {
            this.nativeRuleset?.destroy();
        } catch {
            // todo
        }
        this.nativeRuleset = undefined;

        this.nativeDifficulty = undefined;
        this.nativeTimedDifficulty = [];
        this.nativeTimedDifficultyCurrent = undefined;
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

            if (
                isUpdate ||
                !this.nativeRuleset ||
                !this.nativePerformanceCalc ||
                !this.nativeDifficulty
            ) {
                const rebuild = (rulesetId: number) => {
                    this.destroyNativePP();

                    const mods = sanitizeMods(this.mods.array);
                    if (
                        this.game.client !== ClientType.lazer &&
                        !mods.some((m) => m.acronym === 'CL')
                    ) {
                        mods.unshift({ acronym: 'CL' });
                    }

                    this.nativeMods = null;
                    if (mods.length > 0) {
                        const nativeMods = ModsCollection.create();
                        this.nativeMods = nativeMods;

                        for (const m of mods) {
                            let mod: Mod;
                            try {
                                mod = Mod.create(m.acronym);
                            } catch {
                                continue;
                            }

                            this.nativeModsOwned.push(mod);
                            nativeMods.add(mod);
                        }
                    }

                    const ruleset = Ruleset.fromId(rulesetId);
                    this.nativeRuleset = ruleset;
                    const difficultyCalc =
                        DifficultyCalculatorFactory.create<any>(
                            ruleset,
                            currentBeatmap
                        );

                    try {
                        this.nativeDifficulty = this.nativeMods
                            ? difficultyCalc.calculateWithMods(this.nativeMods)
                            : difficultyCalc.calculate();

                        this.nativeTimedDifficulty = this.nativeMods
                            ? difficultyCalc.calculateWithModsTimed(
                                  this.nativeMods
                              )
                            : difficultyCalc.calculateTimed();
                        this.nativeTimedDifficultyCurrent = undefined;
                    } finally {
                        difficultyCalc.destroy();
                    }

                    this.nativePerformanceCalc =
                        PerformanceCalculatorFactory.create<OsuPerformanceCalculator>(
                            ruleset
                        );
                };

                try {
                    rebuild(this.mode);
                    this.previousState = currentState;
                } catch (exc) {
                    wLogger.debug(
                        ClientType[this.game.client],
                        this.game.pid,
                        `gameplay updateStarsAndPerformance rebuild`,
                        exc
                    );

                    if (currentBeatmap.native.rulesetId !== this.mode) {
                        // todo: ruleset conversion
                        try {
                            rebuild(currentBeatmap.native.rulesetId);
                            this.previousState = currentState;
                        } catch (exc2) {
                            wLogger.debug(
                                ClientType[this.game.client],
                                this.game.pid,
                                `gameplay updateStarsAndPerformance rebuild`,
                                exc2
                            );
                            return;
                        }
                    } else {
                        return;
                    }
                }
            }

            const passedObjects = calculatePassedObjects(
                this.mode,
                this.statistics
            );

            const offset = passedObjects - this.previousPassedObjects;
            if (offset <= 0) return;

            const ruleset = this.nativeRuleset;
            const performanceCalc = this.nativePerformanceCalc;
            const difficulty = this.nativeDifficulty;
            if (!ruleset || !performanceCalc || !difficulty) return;

            while (
                this.nativeTimedDifficulty.length > 0 &&
                this.nativeTimedDifficulty[0].time <= global.playTime
            ) {
                this.nativeTimedDifficultyCurrent =
                    this.nativeTimedDifficulty.shift()?.attributes ||
                    this.nativeTimedDifficultyCurrent;
            }

            const difficultyNow =
                this.nativeTimedDifficultyCurrent ||
                this.nativeTimedDifficulty[0]?.attributes ||
                difficulty;

            const scoreInput: ScoreInfoInput = {
                ruleset,
                legacyScore:
                    this.game.client !== ClientType.lazer
                        ? this.score
                        : undefined,
                beatmap: currentBeatmap,
                mods: this.nativeMods,
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
            };

            const currPerformance = performanceCalc.calculate(
                scoreInput,
                difficultyNow
            );

            beatmapPP.updatePPAttributes('curr', currPerformance);
            // todo: maxAchievable pp
            beatmapPP.currAttributes.maxAchievable = 0;

            const totalHits =
                this.statistics.great +
                this.statistics.ok +
                this.statistics.meh +
                this.statistics.miss;
            const fcAccuracy =
                this.mode === 0 && totalHits > 0
                    ? ((this.statistics.great + this.statistics.miss) * 300 +
                          this.statistics.ok * 100 +
                          this.statistics.meh * 50) /
                      (totalHits * 300)
                    : this.accuracy / 100;

            const fcPerformance = performanceCalc.calculate(
                {
                    ruleset,
                    legacyScore: this.score,
                    beatmap: currentBeatmap,
                    mods: this.nativeMods,
                    maxCombo: beatmapPP.calculatedMapAttributes.maxCombo,
                    accuracy: fcAccuracy,
                    countMiss: 0,
                    countMeh: this.statistics.meh,
                    countOk: this.statistics.ok,
                    countGood: this.statistics.good,
                    countGreat: this.statistics.great + this.statistics.miss,
                    countPerfect: this.statistics.perfect,
                    countSliderTailHit: this.statistics.sliderTailHit,
                    countLargeTickMiss: this.statistics.largeTickMiss
                },
                difficulty
            );

            beatmapPP.currAttributes.fcPP = fcPerformance.total;
            beatmapPP.updatePPAttributes('fc', fcPerformance);

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
