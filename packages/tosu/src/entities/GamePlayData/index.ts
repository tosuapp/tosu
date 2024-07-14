import { config, wLogger } from '@tosu/common';
import rosu from 'rosu-pp-js';

import { AbstractEntity } from '@/entities/AbstractEntity';
import { Leaderboard } from '@/entities/GamePlayData/Leaderboard';
import { MenuData } from '@/entities/MenuData';
import MemoryReader from '@/memoryReaders';
import { OsuInstance } from '@/objects/instanceManager/osuInstance';
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

export class GamePlayData extends AbstractEntity {
    isDefaultState: boolean = true;
    isKeyOverlayDefaultState: boolean = true;

    PerformanceAttributes: rosu.PerformanceAttributes;
    GradualPerformance: rosu.GradualPerformance | null;

    Retries: number;
    PlayerName: string;
    Mods: OsuMods;
    HitErrors: number[];
    Mode: number;
    MaxCombo: number;
    Score: number;
    Hit100: number;
    Hit300: number;
    Hit50: number;
    HitGeki: number;
    HitKatu: number;
    HitMiss: number;
    HitMissPrev: number;
    HitUR: number;
    HitSB: number;
    ComboPrev: number;
    Combo: number;
    PlayerHPSmooth: number;
    PlayerHP: number;
    Accuracy: number;
    UnstableRate: number;
    GradeCurrent: string;
    GradeExpected: string;
    Leaderboard?: Leaderboard;
    KeyOverlay: KeyOverlay;
    isReplayUiHidden: boolean;

    private scoreBase: number = 0;
    private cachedkeys: string = '';

    previousState: string = '';
    previousPassedObjects = 0;

    constructor(osuInstance: OsuInstance) {
        super(osuInstance);

        this.init();
    }

    init(isRetry?: boolean, from?: string) {
        wLogger.debug(`GD(init) Reset (${isRetry} - ${from})`);

        this.HitErrors = [];
        this.MaxCombo = 0;
        this.Score = 0;
        this.Hit100 = 0;
        this.Hit300 = 0;
        this.Hit50 = 0;
        this.HitGeki = 0;
        this.HitKatu = 0;
        this.HitMiss = 0;
        this.HitMissPrev = 0;
        this.HitUR = 0.0;
        this.HitSB = 0;
        this.ComboPrev = 0;
        this.Combo = 0;
        this.PlayerHPSmooth = 0.0;
        this.PlayerHP = 0.0;
        this.Accuracy = 100.0;
        this.UnstableRate = 0;
        this.GradeCurrent = calculateGrade({
            mods: this.Mods,
            mode: this.Mode,
            hits: {
                300: this.Hit300,
                geki: 0,
                100: this.Hit100,
                katu: 0,
                50: this.Hit50,
                0: this.HitMiss
            }
        });

        this.GradeExpected = this.GradeCurrent;
        this.KeyOverlay = {
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
        this.GradualPerformance = null;

        // below is gata that shouldn't be reseted on retry
        if (isRetry === true) {
            return;
        }

        this.isDefaultState = true;
        this.Retries = 0;
        this.PlayerName = '';
        this.Mode = 0;
        this.Mods = 0;
        this.Leaderboard = undefined;

        this.scoreBase = 0;
    }

    resetKeyOverlay() {
        if (this.isKeyOverlayDefaultState) {
            return;
        }

        wLogger.debug('GD(resetKeyOverlay) Reset');

        this.KeyOverlay.K1Pressed = false;
        this.KeyOverlay.K2Pressed = false;
        this.KeyOverlay.M1Pressed = false;
        this.KeyOverlay.M2Pressed = false;

        this.KeyOverlay.K1Count = 0;
        this.KeyOverlay.K2Count = 0;
        this.KeyOverlay.M1Count = 0;
        this.KeyOverlay.M2Count = 0;

        this.isKeyOverlayDefaultState = true;
    }

    updateState() {
        try {
            const s1 = performance.now();
            const { process, patterns, allTimesData, menuData } =
                this.osuInstance.getServices([
                    'process',
                    'patterns',
                    'allTimesData',
                    'menuData'
                ]);

            const { baseAddr, rulesetsAddr } = patterns.getPatterns([
                'baseAddr',
                'rulesetsAddr'
            ]);

            const s2 = performance.now();
            const rulesetAddr = process.readInt(
                process.readInt(rulesetsAddr - 0xb) + 0x4
            );
            if (rulesetAddr === 0) {
                wLogger.debug('GD(updateState) RulesetAddr is 0');
                return;
            }

            const s3 = performance.now();
            const gameplayBase = process.readInt(rulesetAddr + 0x68);
            if (gameplayBase === 0) {
                wLogger.debug('GD(updateState) gameplayBase is zero');
                return;
            }

            const s4 = performance.now();
            const scoreBase = process.readInt(gameplayBase + 0x38);
            if (scoreBase === 0) {
                wLogger.debug('GD(updateState) scoreBase is zero');
                return;
            }

            this.scoreBase = scoreBase;

            const s5 = performance.now();
            const hpBarBase = process.readInt(gameplayBase + 0x40);
            if (hpBarBase === 0) {
                wLogger.debug('GD(updateState) hpBar is zero');
                return;
            }

            // Resetting default state value, to define other componenets that we have touched gamePlayData
            // needed for ex like you done with replay watching/gameplay and return to mainMenu, you need alteast one reset to gamePlayData/resultsScreenData
            this.isDefaultState = false;

            const s6 = performance.now();
            if (allTimesData.IsWatchingReplay) {
                // rulesetAddr mean ReplayWatcher... Sooo....
                // Ruleset + 0x1d8
                this.isReplayUiHidden = Boolean(
                    process.readByte(rulesetAddr + 0x1d8)
                );
            } else {
                this.isReplayUiHidden = false;
            }

            // [Base - 0x33] + 0x8
            const s7 = performance.now();
            this.Retries = process.readInt(
                process.readInt(baseAddr - 0x33) + 0x8
            );

            // [[[Ruleset + 0x68] + 0x38] + 0x28]
            const s8 = performance.now();
            this.PlayerName = process.readSharpString(
                process.readInt(scoreBase + 0x28)
            );

            // [[[Ruleset + 0x68] + 0x38] + 0x1C] + 0xC ^ [[[Ruleset + 0x68] + 0x38] + 0x1C] + 0x8
            const s9 = performance.now();
            this.Mods =
                process.readInt(process.readInt(scoreBase + 0x1c) + 0xc) ^
                process.readInt(process.readInt(scoreBase + 0x1c) + 0x8);

            // [[Ruleset + 0x68] + 0x38] + 0x64
            const s10 = performance.now();
            this.Mode = process.readInt(scoreBase + 0x64);

            // [[Ruleset + 0x68] + 0x38] + 0x68
            const s11 = performance.now();
            this.MaxCombo = process.readShort(scoreBase + 0x68);

            // [[Ruleset + 0x68] + 0x38] + 0x78
            const s12 = performance.now();
            this.Score = process.readInt(rulesetAddr + 0x100);

            // [[Ruleset + 0x68] + 0x38] + 0x88
            const s13 = performance.now();
            this.Hit100 = process.readShort(scoreBase + 0x88);

            // [[Ruleset + 0x68] + 0x38] + 0x8A
            const s14 = performance.now();
            this.Hit300 = process.readShort(scoreBase + 0x8a);

            // [[Ruleset + 0x68] + 0x38] + 0x8C
            const s15 = performance.now();
            this.Hit50 = process.readShort(scoreBase + 0x8c);

            // [[Ruleset + 0x68] + 0x38] + 0x8E
            const s16 = performance.now();
            this.HitGeki = process.readShort(scoreBase + 0x8e);

            // [[Ruleset + 0x68] + 0x38] + 0x90
            const s17 = performance.now();
            this.HitKatu = process.readShort(scoreBase + 0x90);

            // [[Ruleset + 0x68] + 0x38] + 0x92
            const s18 = performance.now();
            this.HitMiss = process.readShort(scoreBase + 0x92);

            // [[Ruleset + 0x68] + 0x38] + 0x94
            const s19 = performance.now();
            this.Combo = process.readShort(scoreBase + 0x94);

            // [[Ruleset + 0x68] + 0x40] + 0x14
            const s20 = performance.now();
            this.PlayerHPSmooth = process.readDouble(hpBarBase + 0x14) || 0;

            // [[Ruleset + 0x68] + 0x40] + 0x1C
            const s21 = performance.now();
            this.PlayerHP = process.readDouble(hpBarBase + 0x1c);

            // [[Ruleset + 0x68] + 0x48] + 0xC
            const s22 = performance.now();
            this.Accuracy = process.readDouble(
                process.readInt(gameplayBase + 0x48) + 0xc
            );

            if (this.MaxCombo > 0) {
                const baseUR = this.calculateUR();
                if ((this.Mods & OsuMods.DoubleTime) === OsuMods.DoubleTime) {
                    this.UnstableRate = baseUR / 1.5;
                } else if (
                    (this.Mods & OsuMods.HalfTime) ===
                    OsuMods.HalfTime
                ) {
                    this.UnstableRate = baseUR * 1.33;
                } else {
                    this.UnstableRate = baseUR;
                }
            }

            if (this.ComboPrev > this.MaxCombo) {
                this.ComboPrev = 0;
            }
            if (
                this.Combo < this.ComboPrev &&
                this.HitMiss === this.HitMissPrev
            ) {
                this.HitSB += 1;
            }
            this.HitMissPrev = this.HitMiss;
            this.ComboPrev = this.Combo;

            // [[[Ruleset + 0x68] + 0x38] + 0x38]
            const s23 = performance.now();
            this.updateLeaderboard(
                process,
                patterns.getLeaderStart(),
                rulesetAddr
            );

            const s24 = performance.now();
            this.updateGrade(menuData);

            const s25 = performance.now();
            this.updateStarsAndPerformance();

            const s26 = performance.now();
            wLogger.timings(
                'GamePlayData/updateState',
                {
                    total: s26 - s1,
                    init: s2 - s1,
                    addr: s3 - s2,
                    gameplaybase: s4 - s3,
                    scorebase: s5 - s4,
                    hpbarbase: s6 - s5,
                    replayui: s7 - s6,
                    retries: s8 - s7,
                    playername: s9 - s8,
                    mods: s10 - s9,
                    mode: s11 - s10,
                    maxcombo: s12 - s11,
                    score: s13 - s12,
                    hit100: s14 - s13,
                    hit300: s15 - s14,
                    hit50: s16 - s15,
                    hitgeki: s17 - s16,
                    hitkatu: s18 - s17,
                    hitmiss: s19 - s18,
                    combo: s20 - s19,
                    hpsmooth: s21 - s20,
                    hp: s22 - s21,
                    accuracy: s23 - s22,
                    updateLeaderboard: s24 - s23,
                    updateGrade: s25 - s24,
                    updateStarsAndPerformance: s26 - s25
                },
                performance.now()
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
            const { process, patterns } = this.osuInstance.getServices([
                'process',
                'patterns'
            ]);

            const s1 = performance.now();
            const rulesetAddr = process.readInt(
                process.readInt(patterns.getPattern('rulesetsAddr') - 0xb) + 0x4
            );
            if (rulesetAddr === 0) {
                wLogger.debug('GD(updateKeyOverlay) rulesetAddr is zero');
                return;
            }

            const s2 = performance.now();
            const keyOverlayPtr = process.readUInt(rulesetAddr + 0xb0);
            if (keyOverlayPtr === 0) {
                wLogger.debug(
                    `GD(updateKeyOverlay) keyOverlayPtr is zero [${keyOverlayPtr}] (${rulesetAddr}  -  ${patterns.getPattern(
                        'rulesetsAddr'
                    )})`
                );
                return;
            }

            // [[Ruleset + 0xB0] + 0x10] + 0x4
            const s3 = performance.now();
            const keyOverlayArrayAddr = process.readInt(
                process.readInt(keyOverlayPtr + 0x10) + 0x4
            );
            if (keyOverlayArrayAddr === 0) {
                wLogger.debug('GD(updateKeyOverlay) keyOverlayAddr[] is zero');
                return;
            }

            const s4 = performance.now();
            const keys = this.getKeyOverlay(process, keyOverlayArrayAddr);
            if (keys.K1Count < 0 || keys.K1Count > 1_000_000) {
                keys.K1Pressed = false;
                keys.K1Count = 0;
            }
            if (keys.K2Count < 0 || keys.K2Count > 1_000_000) {
                keys.K2Pressed = false;
                keys.K2Count = 0;
            }
            if (keys.M1Count < 0 || keys.M1Count > 1_000_000) {
                keys.M1Pressed = false;
                keys.M1Count = 0;
            }
            if (keys.M2Count < 0 || keys.M2Count > 1_000_000) {
                keys.M2Pressed = false;
                keys.M2Count = 0;
            }

            const s5 = performance.now();
            this.KeyOverlay = keys;
            this.isKeyOverlayDefaultState = false;

            const keysLine = `${keys.K1Count}:${keys.K2Count}:${keys.M1Count}:${keys.M2Count}`;
            if (this.cachedkeys !== keysLine) {
                wLogger.debug(
                    `GD(updateKeyOverlay) updated (${rulesetAddr} ${keyOverlayArrayAddr}) ${keysLine}`
                );
                this.cachedkeys = keysLine;
            }

            wLogger.timings(
                'GamePlayData/updateKeyOverlay',
                {
                    total: s5 - s1,
                    addr: s2 - s1,
                    ptr: s3 - s2,
                    array: s4 - s3,
                    get: s5 - s4
                },
                performance.now()
            );

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

    private getKeyOverlay(process: MemoryReader, keyOverlayArrayAddr: number) {
        const itemsSize = process.readInt(keyOverlayArrayAddr + 0x4);
        if (itemsSize < 4) {
            return {
                K1Pressed: false,
                K1Count: 0,
                K2Pressed: false,
                K2Count: 0,
                M1Pressed: false,
                M1Count: 0,
                M2Pressed: false,
                M2Count: 0
            };
        }

        return {
            // [Base + 0x8] + 0x1C
            K1Pressed: Boolean(
                process.readByte(
                    process.readInt(keyOverlayArrayAddr + 0x8) + 0x1c
                )
            ),
            // [Base + 0x8] + 0x14
            K1Count: process.readInt(
                process.readInt(keyOverlayArrayAddr + 0x8) + 0x14
            ),
            // [Base + 0xC] + 0x1C
            K2Pressed: Boolean(
                process.readByte(
                    process.readInt(keyOverlayArrayAddr + 0xc) + 0x1c
                )
            ),
            // [Base + 0xC] + 0x14
            K2Count: process.readInt(
                process.readInt(keyOverlayArrayAddr + 0xc) + 0x14
            ),
            // [Base + 0x10] + 0x1C
            M1Pressed: Boolean(
                process.readByte(
                    process.readInt(keyOverlayArrayAddr + 0x10) + 0x1c
                )
            ),
            // [Base + 0x10] + 0x14
            M1Count: process.readInt(
                process.readInt(keyOverlayArrayAddr + 0x10) + 0x14
            ),
            // [Base + 0x14] + 0x1C
            M2Pressed: Boolean(
                process.readByte(
                    process.readInt(keyOverlayArrayAddr + 0x14) + 0x1c
                )
            ),
            // [Base + 0x14] + 0x14
            M2Count: process.readInt(
                process.readInt(keyOverlayArrayAddr + 0x14) + 0x14
            )
        };
    }

    updateHitErrors() {
        try {
            if (this.scoreBase === 0 || !this.scoreBase) return [];

            const { process, patterns } = this.osuInstance.getServices([
                'process',
                'patterns',
                'allTimesData',
                'menuData'
            ]);

            const leaderStart = patterns.getLeaderStart();

            const s1 = performance.now();
            const base = process.readInt(this.scoreBase + 0x38);

            const s2 = performance.now();
            const items = process.readInt(base + 0x4);

            const s3 = performance.now();
            const size = process.readInt(base + 0xc);

            const s4 = performance.now();
            for (let i = this.HitErrors.length - 1; i < size; i++) {
                const current = items + leaderStart + 0x4 * i;
                const error = process.readInt(current);

                this.HitErrors.push(error);
            }

            const s5 = performance.now();
            wLogger.timings(
                'GamePlayData/updateHitErrors',
                {
                    total: s5 - s1,
                    base: s2 - s1,
                    items: s3 - s2,
                    size: s4 - s3,
                    loop: s5 - s4
                },
                performance.now()
            );

            this.resetReportCount('GD(updateHitErrors)');
        } catch (exc) {
            this.reportError(
                'GD(updateHitErrors)',
                10,
                `GD(updateHitErrors) ${(exc as any).message}`
            );
            wLogger.debug(exc);
        }
    }

    // IMPROVE, WE DONT NEED TO SUM EVERY HITERROR EACH TIME (for future)
    private calculateUR(): number {
        if (this.HitErrors.length < 1) {
            return 0;
        }

        let totalAll = 0.0;
        for (const hit of this.HitErrors) {
            totalAll += hit;
        }

        const average = totalAll / this.HitErrors.length;
        let variance = 0;
        for (const hit of this.HitErrors) {
            variance += Math.pow(hit - average, 2);
        }
        variance = variance / this.HitErrors.length;

        return Math.sqrt(variance) * 10;
    }

    private updateGrade(menuData: MenuData) {
        const remaining =
            menuData.ObjectCount -
            this.Hit300 -
            this.Hit100 -
            this.Hit50 -
            this.HitMiss;

        this.GradeCurrent = calculateGrade({
            mods: this.Mods,
            mode: this.Mode,
            hits: {
                300: this.Hit300,
                geki: 0,
                100: this.Hit100,
                katu: 0,
                50: this.Hit50,
                0: this.HitMiss
            }
        });

        this.GradeExpected = calculateGrade({
            mods: this.Mods,
            mode: this.Mode,
            hits: {
                300: this.Hit300 + remaining,
                geki: 0,
                100: this.Hit100,
                katu: 0,
                50: this.Hit50,
                0: this.HitMiss
            }
        });
    }

    private updateLeaderboard(
        process: MemoryReader,
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
            if (!this.Leaderboard) {
                this.Leaderboard = new Leaderboard(process, leaderBoardAddr);
            } else {
                this.Leaderboard.updateBase(leaderBoardAddr);
            }
            this.Leaderboard.readLeaderboard(leaderStart);

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
        const s1 = performance.now();
        if (!config.calculatePP) {
            wLogger.debug(
                'GD(updateStarsAndPerformance) pp calculation disabled'
            );
            return;
        }

        const { allTimesData, beatmapPpData, menuData } =
            this.osuInstance.getServices([
                'allTimesData',
                'beatmapPpData',
                'menuData'
            ]);

        if (!allTimesData.GameFolder) {
            wLogger.debug(
                'GD(updateStarsAndPerformance) game folder not found'
            );
            return;
        }

        const s2 = performance.now();
        const currentBeatmap = beatmapPpData.getCurrentBeatmap();
        if (!currentBeatmap) {
            wLogger.debug(
                "GD(updateStarsAndPerformance) can't get current map"
            );
            return;
        }

        const currentState = `${menuData.MD5}:${menuData.MenuGameMode}:${this.Mods}:${menuData.MP3Length}`;
        const isUpdate = this.previousState !== currentState;

        // update precalculated attributes
        const s3 = performance.now();
        if (
            isUpdate ||
            !this.GradualPerformance ||
            !this.PerformanceAttributes
        ) {
            if (this.GradualPerformance) this.GradualPerformance.free();
            if (this.PerformanceAttributes) this.PerformanceAttributes.free();

            const difficulty = new rosu.Difficulty({ mods: this.Mods });
            this.GradualPerformance = new rosu.GradualPerformance(
                difficulty,
                currentBeatmap
            );

            this.PerformanceAttributes = new rosu.Performance({
                mods: this.Mods
            }).calculate(currentBeatmap);

            this.previousState = currentState;
        }

        if (!this.GradualPerformance && !this.PerformanceAttributes) return;
        const s4 = performance.now();

        const passedObjects = calculatePassedObjects(
            this.Mode,
            this.Hit300,
            this.Hit100,
            this.Hit50,
            this.HitMiss,
            this.HitKatu,
            this.HitGeki
        );

        const offset = passedObjects - this.previousPassedObjects;
        if (offset <= 0) return;

        const scoreParams: rosu.ScoreState = {
            maxCombo: this.MaxCombo,
            misses: this.HitMiss,
            n50: this.Hit50,
            n100: this.Hit100,
            n300: this.Hit300,
            nKatu: this.HitKatu,
            nGeki: this.HitGeki
        };

        const s5 = performance.now();
        const curPerformance = this.GradualPerformance.nth(
            scoreParams,
            offset - 1
        )!;

        const s6 = performance.now();
        const fcPerformance = new rosu.Performance({
            mods: this.Mods,
            misses: 0,
            accuracy: this.Accuracy
        }).calculate(this.PerformanceAttributes);
        const s7 = performance.now();

        if (curPerformance) {
            beatmapPpData.updateCurrentAttributes(
                curPerformance.difficulty.stars,
                curPerformance.pp
            );
        }

        if (fcPerformance) {
            beatmapPpData.updateFcPP(fcPerformance.pp);
        }

        this.previousPassedObjects = passedObjects;

        const s8 = performance.now();
        wLogger.timings(
            'gamePlayData/updateStarsAndPerformance',
            {
                total: s8 - s1,
                init: s2 - s1,
                beatmap: s3 - s2,
                precalc: s4 - s3,
                current: s6 - s5,
                fc: s6 - s5,
                set: s7 - s6
            },
            performance.now()
        );

        wLogger.debug(
            `GD(updateStarsAndPerformance) [${(s8 - s1).toFixed(2)}ms] elapsed time`
        );
    }
}
