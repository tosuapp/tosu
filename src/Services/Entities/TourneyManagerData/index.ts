import { DataRepo } from '@/Services/repo';
import { wLogger } from '@/logger';

import { AbstractEntity } from '../types';

export class TourneyManagerData extends AbstractEntity {
    IPCState: number = 0;
    LeftStars: number = 0;
    RightStars: number = 0;
    BestOf: number = 0;
    StarsVisible: boolean = false;
    ScoreVisible: boolean = false;
    FirstTeamName: string = '';
    SecondTeamName: string = '';
    FirstTeamScore: number = 0;
    SecondTeamScore: number = 0;
    IPCBaseAddr: number = 0;

    constructor(services: DataRepo) {
        super(services);
    }

    async updateState() {
        const { process, bases, allTimesData } = this.services.getServices([
            'process',
            'bases',
            'allTimesData'
        ]);
        if (process === null) {
            throw new Error('Process not found');
        }
        if (bases === null) {
            throw new Error('Bases repo not found');
        }
        if (allTimesData === null) {
            throw new Error('AllTimesData not found');
        }

        const { rulesetsAddr } = bases.bases;

        const rulesetAddr = process.readInt(
            process.readInt(rulesetsAddr - 0xb) + 0x4
        );
        if (rulesetAddr === 0) {
            wLogger.debug('[TMD] RulesetAddr is 0');
            return;
        }

        const teamLeftBase = process.readInt(rulesetAddr + 0x1c);
        const teamRightBase = process.readInt(rulesetAddr + 0x20);

        // IPCState     int32  `mem:"Ruleset + 0x54"`
        this.IPCState = process.readInt(rulesetAddr + 0x54);
        // LeftStars    int32  `mem:"[Ruleset + 0x1C] + 0x2C"`
        this.LeftStars = process.readInt(teamLeftBase + 0x2c);
        // RightStars   int32  `mem:"[Ruleset + 0x20] + 0x2C"`
        this.RightStars = process.readInt(teamRightBase + 0x2c);
        // BO           int32  `mem:"[Ruleset + 0x20] + 0x30"`
        this.BestOf = process.readInt(teamRightBase + 0x30);
        // StarsVisible int8   `mem:"[Ruleset + 0x20] + 0x38"`
        this.StarsVisible = Boolean(
            process.readShort(teamRightBase + 0x38) - 255
        );
        // ScoreVisible int8   `mem:"[Ruleset + 0x20] + 0x39"`
        this.ScoreVisible = Boolean(
            process.readShort(teamRightBase + 0x39) - 255
        );
        // TeamOneName  string `mem:"[[[Ruleset + 0x1C] + 0x20] + 0x144]"`
        this.FirstTeamName = process.readSharpString(
            process.readInt(process.readInt(teamLeftBase + 0x20) + 0x144)
        );
        // TeamTwoName  string `mem:"[[[Ruleset + 0x20] + 0x20] + 0x144]"`
        this.SecondTeamName = process.readSharpString(
            process.readInt(process.readInt(teamRightBase + 0x20) + 0x144)
        );
        // TeamOneScore int32  `mem:"[Ruleset + 0x1C] + 0x28"`
        this.FirstTeamScore = process.readInt(teamLeftBase + 0x28);
        // TeamTwoScore int32  `mem:"[Ruleset + 0x20] + 0x28"`
        this.SecondTeamScore = process.readInt(teamRightBase + 0x28);
        // IPCBaseAddr  uint32 `mem:"[[Ruleset + 0x34] + 0x4] + 0x4"`
        this.IPCBaseAddr = process.readInt(
            process.readInt(process.readInt(rulesetAddr + 0x34) + 0x4) + 0x4
        );
    }
}
