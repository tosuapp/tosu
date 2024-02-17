import { wLogger } from '@tosu/common';

import { DataRepo } from '@/entities/DataRepoList';

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

        const { process, patterns } = this.services.getServices([
            'process',
            'patterns'
        ]);

        const rulesetsAddr = patterns.getPattern('rulesetsAddr');

        const rulesetAddr = process.readInt(
            process.readInt(rulesetsAddr - 0xb) + 0x4
        );
        if (rulesetAddr === 0) {
            wLogger.debug('[TMD] RulesetAddr is 0');
            return;
        }

        if (this.ChatAreaAddr === 0) {
            this.ChatAreaAddr = await process.scanAsync(
                TOURNAMENT_CHAT_AREA,
                true
            );
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
            const current = tabsBase + patterns.getLeaderStart() + 0x4 * i;

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
                const current =
                    messagesItems + patterns.getLeaderStart() + 0x4 * i;
                const currentItem = process.readInt(current);

                // [Base + 0x4]
                const content = process.readSharpString(
                    process.readInt(currentItem + 0x4)
                );
                // NOTE: Check for empty, and !mp commands
                if (content === '' || content.startsWith('!mp')) {
                    continue;
                }
                // [Base + 0x8]
                const timeName = process.readSharpString(
                    process.readInt(currentItem + 0x8)
                );
                const [time, name] = timeName.split(' ');

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
