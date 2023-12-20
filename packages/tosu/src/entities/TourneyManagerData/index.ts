import { DataRepo } from '@/entities/DataRepoList';
import { wLogger } from '@/logger';

import { AbstractEntity } from '../AbstractEntity';
import { ITourneyManagetChatItem } from './types';

const TOURNAMENT_CHAT_AREA = '33 47 9D FF 5B 7F FF FF';

export class TourneyManagerData extends AbstractEntity {
    ChatAreaAddr: number = 0;

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

    Messages: ITourneyManagetChatItem[] = [];

    constructor(services: DataRepo) {
        super(services);
    }

    async updateState() {
        wLogger.debug(`[TourneyManagerData:updateState] starting`);

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

        if (this.ChatAreaAddr === 0) {
            this.ChatAreaAddr = process.scanSync(TOURNAMENT_CHAT_AREA, true);
            wLogger.debug('[TMD] Chat area found');
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

        const chatBase = this.ChatAreaAddr - 0x44;

        // [Base + 0x1C] + 0x4
        const tabsBase = process.readInt(
            process.readInt(chatBase + 0x1c) + 0x4
        );
        const tabsLength = process.readInt(tabsBase + 0x4);

        for (let i = 0; i < tabsLength; i++) {
            const current = tabsBase + bases.leaderStart + 0x4 * i;

            const slotAddr = process.readInt(current);
            if (slotAddr === 0) {
                continue;
            }

            // [[Base + 0xC] + 0x4]
            const chatTag = process.readSharpString(
                process.readInt(process.readInt(slotAddr + 0xc) + 0x4)
            );
            if (chatTag !== '#multiplayer') {
                continue;
            }

            const result: ITourneyManagetChatItem[] = [];

            // [[Base + 0xC] + 0x10] + 0x4
            const messagesAddr = process.readInt(
                process.readInt(slotAddr + 0xc) + 0x10
            );

            const messagesItems = process.readInt(messagesAddr + 0x4);
            const messagesSize = process.readInt(messagesAddr + 0xc);

            if (this.Messages.length === messagesSize) {
                // Not needed an update
                continue;
            }

            for (let i = 0; i < messagesSize; i++) {
                let current = messagesItems + bases.leaderStart + 0x4 * i;
                let currentItem = process.readInt(current);

                // [Base + 0x4]
                let content = process.readSharpString(
                    process.readInt(currentItem + 0x4)
                );
                // NOTE: Check for empty, and !mp commands
                if (content === '' || content.startsWith('!mp')) {
                    continue;
                }
                // [Base + 0x8]
                let timeName = process.readSharpString(
                    process.readInt(currentItem + 0x8)
                );
                let [time, name] = timeName.split(' ');

                result.push({
                    time: time.trim(),
                    name: name.substring(0, name.length - 1),
                    content
                });
            }

            this.Messages = result;
            wLogger.debug('[TourneyManagerData:chat] updated');
        }

        wLogger.debug(`[TourneyManagerData:updateState] updated`);
    }
}
