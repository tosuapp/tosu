import { config, wLogger } from '@tosu/common';
import rosu from 'rosu-pp-js';
import { Process } from 'tsprocess/dist/process';

import { AbstractInstance } from '@/instances';
import { AbstractState } from '@/states/index';
import { calculateGrade, calculatePassedObjects } from '@/utils/calculators';
import { OsuMods } from '@/utils/osuMods.types';

export interface KeyOverlay {
    K1Pressed: boolean;
    K1Count: number;
    K2Pressed: boolean;
    K2Count: number;
    M1Pressed: boolean;
    M1Count: number;
    M2Pressed: boolean;
    M2Count: number;
}

export interface LeaderboardPlayer {
    Name: string;
    Score: number;
    Combo: number;
    MaxCombo: number;
    Mods: number;
    H300: number;
    H100: number;
    H50: number;
    H0: number;
    Team: number;
    Position: number;
    IsPassing: boolean;
}

export class Gameplay extends AbstractState {
    isDefaultState: boolean = true;
    isKeyOverlayDefaultState: boolean = true;

    performanceAttributes: rosu.PerformanceAttributes | undefined;
    gradualPerformance: rosu.GradualPerformance | undefined;

    retries: number;
    playerName: string;
    mods: OsuMods;
    hitErrors: number[];
    mode: number;
    maxCombo: number;
    score: number;
    hit100: number;
    hit300: number;
    hit50: number;
    hitGeki: number;
    hitKatu: number;
    hitMiss: number;
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
    leaderboard?: Leaderboard;
    keyOverlay: KeyOverlay;
    isReplayUiHidden: boolean;

    private cachedkeys: string = '';

    previousState: string = '';
    previousPassedObjects = 0;

    constructor(game: AbstractInstance) {
        super(game);

        this.init();
    }

    init(isRetry?: boolean, from?: string) {
        wLogger.debug(`GD(init) Reset (${isRetry} - ${from})`);

        this.hitErrors = [];
        this.maxCombo = 0;
        this.score = 0;
        this.hit100 = 0;
        this.hit300 = 0;
        this.hit50 = 0;
        this.hitGeki = 0;
        this.hitKatu = 0;
        this.hitMiss = 0;
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
            mods: this.mods,
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
        // below is gata that shouldn't be reseted on retry
        if (isRetry === true) {
            return;
        }

        this.isDefaultState = true;
        this.retries = 0;
        this.playerName = '';
        this.mode = 0;
        this.mods = 0;
        this.leaderboard = undefined;
    }

    resetQuick() {
        wLogger.debug('GD(resetQuick) Reset ');

        this.previousPassedObjects = 0;
    }

    resetKeyOverlay() {
        if (this.isKeyOverlayDefaultState) {
            return;
        }

        wLogger.debug('GD(resetKeyOverlay) Reset');

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
            const process = this.game.process;
            const memory = this.game.memory;
            const menu = this.game.get('menu');
            if (menu === null) {
                return 'not-ready';
            }

            const result = this.game.memory.gameplay();
            if (result instanceof Error) throw result;
            if (typeof result === 'string') {
                wLogger.debug(`GD(updateState) ${result}`);
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
            this.combo = result.combo;
            this.maxCombo = result.maxCombo;

            if (this.maxCombo > 0) {
                const baseUR = this.calculateUR();
                if ((this.mods & OsuMods.DoubleTime) === OsuMods.DoubleTime) {
                    this.unstableRate = baseUR / 1.5;
                } else if (
                    (this.mods & OsuMods.HalfTime) ===
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
                this.hitMiss === this.hitMissPrev
            ) {
                this.hitSB += 1;
            }
            this.hitMissPrev = this.hitMiss;
            this.comboPrev = this.combo;

            this.updateGrade(menu.ObjectCount);
            this.updateStarsAndPerformance();
            this.updateLeaderboard(
                process,
                memory.getLeaderStart(),
                result.address
            );

            this.resetReportCount('GD(updateState)');
        } catch (exc) {
            this.reportError(
                'GD(updateState)',
                10,
                `GD(updateState) ${(exc as any).message}`
            );
            wLogger.debug(exc);
        }
    }

    updateKeyOverlay() {
        try {
            const result = this.game.memory.keyOverlay(this.mode);
            if (result instanceof Error) throw result;
            if (typeof result === 'string') {
                if (result === '') return;

                wLogger.debug(`GD(updateKeyOverlay)`, result);
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
                wLogger.debug(`GD(updateKeyOverlay) updated ${keysLine}`);
                this.cachedkeys = keysLine;
            }

            this.resetReportCount('GD(updateKeyOverlay)');
        } catch (exc) {
            this.reportError(
                'GD(updateKeyOverlay)',
                10,
                `GD(updateKeyOverlay) ${(exc as any).message}`
            );
            wLogger.debug(exc);
        }
    }

    updateHitErrors() {
        try {
            const result = this.game.memory.hitErors();
            if (result instanceof Error) throw result;
            if (typeof result === 'string') {
                if (result === '') return;

                wLogger.debug(`GD(updateHitErrors)`, result);
                return 'not-ready';
            }

            this.hitErrors = result;

            this.resetReportCount('GD(updateHitErrors)');
        } catch (exc) {
            this.reportError(
                'GD(updateHitErrors)',
                50,
                `GD(updateHitErrors) ${(exc as any).message}`
            );
            wLogger.debug(exc);
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
            mods: this.mods,
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
            mods: this.mods,
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

    private updateLeaderboard(
        process: Process,
        leaderStart: number,
        rulesetAddr: number
    ) {
        try {
            // [Ruleset + 0x7C]
            const leaderBoardBase = process.readInt(rulesetAddr + 0x7c);

            // [Ruleset + 0x7C] + 0x24
            const leaderBoardAddr =
                leaderBoardBase > 0
                    ? process.readInt(leaderBoardBase + 0x24)
                    : 0;
            if (!this.leaderboard) {
                this.leaderboard = new Leaderboard(process, leaderBoardAddr);
            } else {
                this.leaderboard.updateBase(leaderBoardAddr);
            }
            this.leaderboard.readLeaderboard(leaderStart);

            this.resetReportCount('GD(updateLeaderboard)');
        } catch (exc) {
            this.reportError(
                'GD(updateLeaderboard)',
                10,
                `GD(updateLeaderboard) ${(exc as any).message}`
            );
            wLogger.debug(exc);
        }
    }

    private updateStarsAndPerformance() {
        try {
            const t1 = performance.now();
            if (!config.calculatePP) {
                wLogger.debug(
                    'GD(updateStarsAndPerformance) pp calculation disabled'
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
                    'GD(updateStarsAndPerformance) game folder not found'
                );
                return;
            }

            const currentBeatmap = beatmapPP.getCurrentBeatmap();
            if (!currentBeatmap) {
                wLogger.debug(
                    "GD(updateStarsAndPerformance) can't get current map"
                );
                return;
            }

            const currentState = `${menu.MD5}:${menu.MenuGameMode}:${this.mods}:${menu.MP3Length}`;
            const isUpdate = this.previousState !== currentState;

            // update precalculated attributes
            if (
                isUpdate ||
                !this.gradualPerformance ||
                !this.performanceAttributes
            ) {
                if (this.gradualPerformance) this.gradualPerformance.free();
                if (this.performanceAttributes)
                    this.performanceAttributes.free();

                const difficulty = new rosu.Difficulty({ mods: this.mods });
                this.gradualPerformance = new rosu.GradualPerformance(
                    difficulty,
                    currentBeatmap
                );

                this.performanceAttributes = new rosu.Performance({
                    mods: this.mods
                }).calculate(currentBeatmap);

                this.previousState = currentState;
            }

            if (!this.gradualPerformance || !this.performanceAttributes) {
                wLogger.debug(
                    `GD(updateStarsAndPerformance) One of things not ready. GP:${this.gradualPerformance === undefined} - PA:${this.performanceAttributes === undefined}`
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

            const scoreParams: rosu.ScoreState = {
                maxCombo: this.maxCombo,
                misses: this.hitMiss,
                n50: this.hit50,
                n100: this.hit100,
                n300: this.hit300,
                nKatu: this.hitKatu,
                nGeki: this.hitGeki
            };

            const currPerformance = this.gradualPerformance.nth(
                scoreParams,
                offset - 1
            )!;

            const fcPerformance = new rosu.Performance({
                mods: this.mods,
                misses: 0,
                accuracy: this.accuracy
            }).calculate(this.performanceAttributes);
            const t2 = performance.now();

            if (currPerformance) {
                beatmapPP.updateCurrentAttributes(
                    currPerformance.difficulty.stars,
                    currPerformance.pp
                );

                beatmapPP.updatePPAttributes('curr', currPerformance);
            }

            if (fcPerformance) {
                beatmapPP.currAttributes.fcPP = fcPerformance.pp;
                beatmapPP.updatePPAttributes('fc', fcPerformance);
            }

            this.previousPassedObjects = passedObjects;

            wLogger.debug(
                `GD(updateStarsAndPerformance) [${(t2 - t1).toFixed(2)}ms] elapsed time`
            );

            this.resetReportCount('GD(updateStarsAndPerformance)');
        } catch (exc) {
            this.reportError(
                'GD(updateStarsAndPerformance)',
                10,
                `GD(updateStarsAndPerformance) ${(exc as any).message}`
            );
            wLogger.debug(exc);
        }
    }
}

class Leaderboard {
    private process: Process;

    private leaderboardBase: number = 0;

    leaderBoard: LeaderboardPlayer[] = [];

    player: LeaderboardPlayer | undefined;

    isScoreboardVisible: boolean = false;

    constructor(process: Process, leaderboardBase: number) {
        this.process = process;
        this.leaderboardBase = leaderboardBase;
    }

    updateBase(newBase: number) {
        this.leaderboardBase = newBase;
    }

    private readLeaderPlayerStruct(
        base: number
    ): [LeaderboardPlayer, boolean] | undefined {
        const IsLeaderBoardVisible = this.process.readByte(
            this.process.readInt(base + 0x24) + 0x20
        );
        const scoreboardEntry = this.process.readInt(base + 0x20);
        if (scoreboardEntry === 0) {
            return undefined;
        }

        // [[Base + 0x20] + 0x1C] + 0x8
        const ModsXor1 = this.process.readInt(
            this.process.readInt(scoreboardEntry + 0x1c) + 0x8
        );
        // [[Base + 0x20] + 0x1C] + 0xC
        const ModsXor2 = this.process.readInt(
            this.process.readInt(scoreboardEntry + 0x1c) + 0xc
        );
        return [
            {
                // [Base + 0x8]
                Name: this.process.readSharpString(
                    this.process.readInt(base + 0x8)
                ),
                // Base + 0x30
                Score: this.process.readInt(base + 0x30),
                // [Base + 0x20] + 0x94
                Combo: this.process.readShort(scoreboardEntry + 0x94),
                // [Base + 0x20] + 0x68
                MaxCombo: this.process.readShort(scoreboardEntry + 0x68),
                Mods: ModsXor1 ^ ModsXor2,
                // [Base + 0x20] + 0x8A
                H300: this.process.readShort(scoreboardEntry + 0x8a),
                // [Base + 0x20] + 0x88
                H100: this.process.readShort(scoreboardEntry + 0x88),
                // [Base + 0x20] + 0x8C
                H50: this.process.readShort(scoreboardEntry + 0x8c),
                // [Base + 0x20] + 0x92
                H0: this.process.readShort(scoreboardEntry + 0x92),
                // Base + 0x40
                Team: this.process.readInt(base + 0x40),
                // Base + 0x2C
                Position: this.process.readInt(base + 0x2c),
                // Base + 0x4B
                IsPassing: Boolean(this.process.readByte(base + 0x4b))
            },
            Boolean(IsLeaderBoardVisible)
        ];
    }

    readLeaderboard(leaderStart: number) {
        if (this.leaderboardBase === 0) {
            this.clear();
            return this.leaderBoard;
        }

        const playerBase = this.process.readInt(this.leaderboardBase + 0x10);
        const playerEntry = this.readLeaderPlayerStruct(playerBase);
        if (playerEntry) {
            [this.player, this.isScoreboardVisible] = playerEntry;
        }

        const playersArray = this.process.readInt(this.leaderboardBase + 0x4);
        const amOfSlots = this.process.readInt(playersArray + 0xc);
        if (amOfSlots < 1) {
            return;
        }

        const newLeaderBoard: LeaderboardPlayer[] = [];

        const items = this.process.readInt(playersArray + 0x4);
        const itemsSize = this.process.readInt(playersArray + 0xc);

        for (let i = 0; i < itemsSize; i++) {
            const current = items + leaderStart + 0x4 * i;

            const lbEntry = this.readLeaderPlayerStruct(
                this.process.readInt(current)
            );

            if (!lbEntry) {
                // break due to un-consistency of leaderboard
                break;
            }

            newLeaderBoard.push(lbEntry[0]);
        }
        this.leaderBoard = newLeaderBoard;
    }

    clear() {
        this.player = undefined;
        this.leaderBoard = [];
    }
}
