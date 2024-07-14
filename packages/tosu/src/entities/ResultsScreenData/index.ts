import { wLogger } from '@tosu/common';
import rosu from 'rosu-pp-js';

import { AbstractEntity } from '@/entities/AbstractEntity';
import { OsuInstance } from '@/objects/instanceManager/osuInstance';
import { calculateAccuracy, calculateGrade } from '@/utils/calculators';
import { netDateBinaryToDate } from '@/utils/converters';
import { OsuMods } from '@/utils/osuMods.types';

export class ResultsScreenData extends AbstractEntity {
    OnlineId: number;
    PlayerName: string;
    Mods: OsuMods;
    Mode: number;
    MaxCombo: number;
    Score: number;
    Hit100: number;
    Hit300: number;
    Hit50: number;
    HitGeki: number;
    HitKatu: number;
    HitMiss: number;
    Grade: string;
    Date: string;
    Accuracy: number;
    pp: number;
    fcPP: number;

    previousBeatmap: string;

    constructor(osuInstance: OsuInstance) {
        super(osuInstance);

        this.init();
    }

    init() {
        wLogger.debug('RSD(init) Reset');

        this.PlayerName = '';
        this.Mods = 0;
        this.Mode = 0;
        this.MaxCombo = 0;
        this.Score = 0;
        this.Hit100 = 0;
        this.Hit300 = 0;
        this.Hit50 = 0;
        this.HitGeki = 0;
        this.HitKatu = 0;
        this.HitMiss = 0;
        this.Grade = '';
        this.Date = '';
        this.Accuracy = 0;
        this.pp = 0;
        this.fcPP = 0;
    }

    updateState() {
        try {
            const { process, patterns, allTimesData, beatmapPpData, menuData } =
                this.osuInstance.getServices([
                    'process',
                    'patterns',
                    'allTimesData',
                    'beatmapPpData',
                    'menuData'
                ]);
            if (process === null) {
                throw new Error('Process not found');
            }
            if (patterns === null) {
                throw new Error('Bases repo not found');
            }
            if (allTimesData === null) {
                throw new Error('AllTimesData not found');
            }

            const { rulesetsAddr } = patterns.getPatterns(['rulesetsAddr']);

            const s1 = performance.now();
            const rulesetAddr = process.readInt(
                process.readInt(rulesetsAddr - 0xb) + 0x4
            );
            if (rulesetAddr === 0) {
                wLogger.debug('RSD(updateState) rulesetAddr is zero');
                return;
            }

            const s2 = performance.now();
            const resultScreenBase = process.readInt(rulesetAddr + 0x38);
            if (resultScreenBase === 0) {
                wLogger.debug('RSD(updateState) resultScreenBase is zero');
                return;
            }

            // OnlineId   int64   `mem:"[Ruleset + 0x38] + 0x4"`
            const s3 = performance.now();
            this.OnlineId = process.readLong(resultScreenBase + 0x4);

            // PlayerName string  `mem:"[[Ruleset + 0x38] + 0x28]"`
            const s4 = performance.now();
            this.PlayerName = process.readSharpString(
                process.readInt(resultScreenBase + 0x28)
            );

            // ModsXor1   int32   `mem:"[[Ruleset + 0x38] + 0x1C] + 0xC"` ^ ModsXor2   int32   `mem:"[[Ruleset + 0x38] + 0x1C] + 0x8"`
            const s5 = performance.now();
            this.Mods =
                process.readInt(
                    process.readInt(resultScreenBase + 0x1c) + 0xc
                ) ^
                process.readInt(process.readInt(resultScreenBase + 0x1c) + 0x8);

            // Mode       int32   `mem:"[Ruleset + 0x38] + 0x64"`
            const s6 = performance.now();
            this.Mode = process.readInt(resultScreenBase + 0x64);

            // MaxCombo   int16   `mem:"[Ruleset + 0x38] + 0x68"`
            const s7 = performance.now();
            this.MaxCombo = process.readShort(resultScreenBase + 0x68);

            // Score      int32   `mem:"[Ruleset + 0x38] + 0x78"`
            const s8 = performance.now();
            this.Score = process.readInt(resultScreenBase + 0x78);

            // Hit100     int16   `mem:"[Ruleset + 0x38] + 0x88"`
            const s9 = performance.now();
            this.Hit100 = process.readShort(resultScreenBase + 0x88);

            // Hit300     int16   `mem:"[Ruleset + 0x38] + 0x8A"`
            const s10 = performance.now();
            this.Hit300 = process.readShort(resultScreenBase + 0x8a);

            // Hit50      int16   `mem:"[Ruleset + 0x38] + 0x8C"`
            const s11 = performance.now();
            this.Hit50 = process.readShort(resultScreenBase + 0x8c);

            // HitGeki    int16   `mem:"[Ruleset + 0x38] + 0x8E"`
            const s12 = performance.now();
            this.HitGeki = process.readShort(resultScreenBase + 0x8e);

            // HitKatu    int16   `mem:"[Ruleset + 0x38] + 0x90"`
            const s13 = performance.now();
            this.HitKatu = process.readShort(resultScreenBase + 0x90);

            // HitMiss    int16   `mem:"[Ruleset + 0x38] + 0x92"`
            const s14 = performance.now();
            this.HitMiss = process.readShort(resultScreenBase + 0x92);

            const s15 = performance.now();
            this.Date = netDateBinaryToDate(
                process.readInt(resultScreenBase + 0xa4),
                process.readInt(resultScreenBase + 0xa0)
            ).toISOString();

            const s16 = performance.now();

            const hits = {
                300: this.Hit300,
                geki: 0,
                100: this.Hit100,
                katu: 0,
                50: this.Hit50,
                0: this.HitMiss
            };

            this.Grade = calculateGrade({
                mods: this.Mods,
                mode: this.Mode,
                hits
            });

            this.Accuracy = calculateAccuracy({
                mode: this.Mode,
                hits
            });

            const key = `${menuData.MD5}${this.Mods}${this.Mode}${this.PlayerName}`;
            if (this.previousBeatmap === key) {
                return;
            }

            const currentBeatmap = beatmapPpData.getCurrentBeatmap();
            if (!currentBeatmap) {
                wLogger.debug("RSD(updateState) can't get current map");
                return;
            }

            const scoreParams: rosu.PerformanceArgs = {
                combo: this.MaxCombo,
                mods: this.Mods,
                misses: this.HitMiss,
                n50: this.Hit50,
                n100: this.Hit100,
                n300: this.Hit300,
                nKatu: this.HitKatu,
                nGeki: this.HitGeki
            };

            const s17 = performance.now();
            const curPerformance = new rosu.Performance(scoreParams).calculate(
                currentBeatmap
            );

            const s18 = performance.now();
            const fcPerformance = new rosu.Performance({
                mods: this.Mods,
                misses: 0,
                accuracy: this.Accuracy
            }).calculate(curPerformance);

            this.pp = curPerformance.pp;
            this.fcPP = fcPerformance.pp;

            const s19 = performance.now();
            curPerformance.free();
            fcPerformance.free();

            const s20 = performance.now();

            this.previousBeatmap = key;

            wLogger.timings(
                'ResultsScreenData/updateState',
                {
                    total: s20 - s1,
                    addr: s2 - s1,
                    base: s3 - s2,
                    scoreid: s4 - s3,
                    name: s5 - s4,
                    mods: s6 - s5,
                    mode: s7 - s6,
                    maxcombo: s8 - s7,
                    score: s9 - s8,
                    hit100: s10 - s9,
                    hit300: s11 - s10,
                    hit50: s12 - s11,
                    hitgeki: s13 - s12,
                    hitkatu: s14 - s13,
                    hitmiss: s15 - s14,
                    date: s16 - s15,
                    pp: s18 - s17,
                    fc: s19 - s18,
                    free: s20 - s19
                },
                performance.now()
            );

            this.resetReportCount('RSD(updateState)');
        } catch (exc) {
            this.reportError(
                'RSD(updateState)',
                10,
                `RSD(updateState) ${(exc as any).message}`
            );
            wLogger.debug(exc);
        }
    }
}
