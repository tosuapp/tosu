import { wLogger } from '@tosu/common';

import { DataRepo } from '@/entities/DataRepoList';
import { calculateAccuracy } from '@/utils/calculateAccuracy';
import { calculateGrade } from '@/utils/calculateGrade';
import { netDateBinaryToDate } from '@/utils/netDateBinaryToDate';
import { OsuMods } from '@/utils/osuMods.types';

import { AbstractEntity } from '../AbstractEntity';

export class ResultsScreenData extends AbstractEntity {
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
    Date: Date;

    constructor(services: DataRepo) {
        super(services);

        this.init();
    }

    init() {
        wLogger.debug(`[ResultsScreenData:init] reseting`);

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
        this.Date = Date.prototype;
    }

    async updateState() {
        const { process, patterns, allTimesData } = this.services.getServices([
            'process',
            'patterns',
            'allTimesData'
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

        const rulesetAddr = process.readInt(
            process.readInt(rulesetsAddr - 0xb) + 0x4
        );
        if (rulesetAddr === 0) {
            wLogger.debug('rulesetAddr is zero');
            return;
        }

        const resultScreenBase = process.readInt(rulesetAddr + 0x38);
        if (resultScreenBase === 0) {
            wLogger.debug('resultScreenBase is zero');
            return;
        }

        // PlayerName string  `mem:"[[Ruleset + 0x38] + 0x28]"`
        this.PlayerName = process.readSharpString(
            process.readInt(resultScreenBase + 0x28)
        );
        // ModsXor1   int32   `mem:"[[Ruleset + 0x38] + 0x1C] + 0xC"` ^ ModsXor2   int32   `mem:"[[Ruleset + 0x38] + 0x1C] + 0x8"`
        this.Mods =
            process.readInt(process.readInt(resultScreenBase + 0x1c) + 0xc) ^
            process.readInt(process.readInt(resultScreenBase + 0x1c) + 0x8);
        // Mode       int32   `mem:"[Ruleset + 0x38] + 0x64"`
        this.Mode = process.readInt(resultScreenBase + 0x64);
        // MaxCombo   int16   `mem:"[Ruleset + 0x38] + 0x68"`
        this.MaxCombo = process.readShort(resultScreenBase + 0x68);
        // Score      int32   `mem:"[Ruleset + 0x38] + 0x78"`
        this.Score = process.readInt(resultScreenBase + 0x78);
        // Hit100     int16   `mem:"[Ruleset + 0x38] + 0x88"`
        this.Hit100 = process.readShort(resultScreenBase + 0x88);
        // Hit300     int16   `mem:"[Ruleset + 0x38] + 0x8A"`
        this.Hit300 = process.readShort(resultScreenBase + 0x8a);
        // Hit50      int16   `mem:"[Ruleset + 0x38] + 0x8C"`
        this.Hit50 = process.readShort(resultScreenBase + 0x8c);
        // HitGeki    int16   `mem:"[Ruleset + 0x38] + 0x8E"`
        this.HitGeki = process.readShort(resultScreenBase + 0x8e);
        // HitKatu    int16   `mem:"[Ruleset + 0x38] + 0x90"`
        this.HitKatu = process.readShort(resultScreenBase + 0x90);
        // HitMiss    int16   `mem:"[Ruleset + 0x38] + 0x92"`
        this.HitMiss = process.readShort(resultScreenBase + 0x92);
        this.Grade = calculateGrade(
            this.Mode,
            this.Mods,
            this.Hit300,
            this.Hit100,
            this.Hit50,
            this.HitMiss,
            calculateAccuracy(
                this.Mode,
                this.Hit300,
                this.Hit100,
                this.Hit50,
                this.HitMiss,
                this.HitKatu,
                this.HitGeki
            ) * 100
        );
        this.Date = netDateBinaryToDate(
            process.readInt(resultScreenBase + 0xa4),
            process.readInt(resultScreenBase + 0xa0)
        );
    }
}
