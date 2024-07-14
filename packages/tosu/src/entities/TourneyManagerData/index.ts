import { config, sleep, wLogger } from '@tosu/common';

import { AbstractEntity } from '@/entities/AbstractEntity';

import { ITourneyManagetChatItem } from './types';

const TOURNAMENT_CHAT_ENGINE = 'A1 ?? ?? ?? ?? 89 45 F0 8B D1 85 C9 75';

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

    async updateState() {
        try {
            wLogger.debug('TMD(updateState) Starting');

            const { process, patterns } = this.osuInstance.getServices([
                'process',
                'patterns'
            ]);

            const rulesetsAddr = patterns.getPattern('rulesetsAddr');

            const s1 = performance.now();
            const rulesetAddr = process.readInt(
                process.readInt(rulesetsAddr - 0xb) + 0x4
            );
            if (rulesetAddr === 0) {
                wLogger.debug('TMD(updateState) RulesetAddr is 0');
                return;
            }

            if (this.ChatAreaAddr === 0) {
                const s2 = performance.now();
                await sleep(1000);

                const s3 = performance.now();
                this.ChatAreaAddr = process.scanSync(
                    TOURNAMENT_CHAT_ENGINE,
                    true
                );

                const s4 = performance.now();
                wLogger.debug('TMD(updateState) Chat area found');
                wLogger.timings(
                    'TourneyManagerData/updateState-0',
                    {
                        total: s4 - s1,
                        addr: s2 - s1,
                        chatArea: s4 - s3
                    },
                    performance.now()
                );
                return;
            }

            const s2 = performance.now();
            const teamLeftBase = process.readInt(rulesetAddr + 0x1c);

            const s3 = performance.now();
            const teamRightBase = process.readInt(rulesetAddr + 0x20);

            // IPCState     int32  `mem:"Ruleset + 0x54"`
            const s4 = performance.now();
            this.IPCState = process.readInt(rulesetAddr + 0x54);

            // LeftStars    int32  `mem:"[Ruleset + 0x1C] + 0x2C"`
            const s5 = performance.now();
            this.LeftStars = process.readInt(teamLeftBase + 0x2c);

            // RightStars   int32  `mem:"[Ruleset + 0x20] + 0x2C"`
            const s6 = performance.now();
            this.RightStars = process.readInt(teamRightBase + 0x2c);

            // BO           int32  `mem:"[Ruleset + 0x20] + 0x30"`
            const s7 = performance.now();
            this.BestOf = process.readInt(teamRightBase + 0x30);

            // StarsVisible int8   `mem:"[Ruleset + 0x20] + 0x38"`
            const s8 = performance.now();
            this.StarsVisible = Boolean(process.readByte(teamRightBase + 0x38));

            // ScoreVisible int8   `mem:"[Ruleset + 0x20] + 0x39"`
            const s9 = performance.now();
            this.ScoreVisible = Boolean(process.readByte(teamRightBase + 0x39));

            // TeamOneName  string `mem:"[[[Ruleset + 0x1C] + 0x20] + 0x144]"`
            const s10 = performance.now();
            this.FirstTeamName = process.readSharpString(
                process.readInt(process.readInt(teamLeftBase + 0x20) + 0x144)
            );

            // TeamTwoName  string `mem:"[[[Ruleset + 0x20] + 0x20] + 0x144]"`
            const s11 = performance.now();
            this.SecondTeamName = process.readSharpString(
                process.readInt(process.readInt(teamRightBase + 0x20) + 0x144)
            );

            // TeamOneScore int32  `mem:"[Ruleset + 0x1C] + 0x28"`
            const s12 = performance.now();
            this.FirstTeamScore = process.readInt(teamLeftBase + 0x28);

            // TeamTwoScore int32  `mem:"[Ruleset + 0x20] + 0x28"`
            const s13 = performance.now();
            this.SecondTeamScore = process.readInt(teamRightBase + 0x28);

            // IPCBaseAddr  uint32 `mem:"[[Ruleset + 0x34] + 0x4] + 0x4"`
            const s14 = performance.now();
            this.IPCBaseAddr = process.readInt(
                process.readInt(process.readInt(rulesetAddr + 0x34) + 0x4) + 0x4
            );

            const s15 = performance.now();
            const channelsList = process.readPointer(this.ChatAreaAddr + 0x1);

            const s16 = performance.now();
            const channelsItems = process.readInt(channelsList + 0x4);

            const s17 = performance.now();
            const channelsLength = process.readInt(channelsItems + 0x4);
            // Reversing array is needed for make more fast search,
            // because osu creates 40 channels with language topics, lobby, osu, etc... (bancho announces this to you)
            // and 41 is commonly for multiplayer in tourney client
            for (let i = channelsLength - 1; i >= 0; i--) {
                try {
                    const current =
                        channelsItems + patterns.getLeaderStart() + 0x4 * i;

                    const channelAddr = process.readInt(current);
                    if (channelAddr === 0) {
                        continue;
                    }

                    const chatTag = process.readSharpString(
                        process.readInt(channelAddr + 0x4)
                    );
                    if (chatTag !== '#multiplayer') {
                        continue;
                    }

                    const result: ITourneyManagetChatItem[] = [];

                    const messagesAddr = process.readInt(channelAddr + 0x10);

                    const messagesItems = process.readInt(messagesAddr + 0x4);
                    const messagesSize = process.readInt(messagesAddr + 0xc);

                    if (this.Messages.length === messagesSize) {
                        // Not needed an update
                        continue;
                    }

                    for (let i = 0; i < messagesSize; i++) {
                        try {
                            const current =
                                messagesItems +
                                patterns.getLeaderStart() +
                                0x4 * i;
                            const currentItem = process.readInt(current);

                            // [Base + 0x4]
                            const content = process.readSharpString(
                                process.readInt(currentItem + 0x4)
                            );
                            // NOTE: Check for empty, and !mp commands
                            if (
                                content === '' ||
                                (!config.showMpCommands &&
                                    content.startsWith('!mp'))
                            ) {
                                continue;
                            }
                            // [Base + 0x8]
                            const timeName = process.readSharpString(
                                process.readInt(currentItem + 0x8)
                            );
                            const [time] = timeName.split(' ');

                            result.push({
                                time: time.trim(),
                                name: timeName
                                    .replace(time, '')
                                    .replace(/:$/, '')
                                    .trimStart(),
                                content
                            });

                            this.resetReportCount('TMD(chatMessage)');
                        } catch (exc) {
                            this.reportError(
                                'TMD(chatMessage)',
                                10,
                                `TMD(chatMessage) ${(exc as any).message}`
                            );
                            wLogger.debug(exc);
                        }
                    }

                    this.Messages = result;
                    wLogger.debug('TMD(updateState) Chat Updated');

                    this.resetReportCount('TMD(channelUpdate)');
                } catch (exc) {
                    this.reportError(
                        'TMD(channelUpdate)',
                        10,
                        `TMD(channelUpdate) ${(exc as any).message}`
                    );
                    wLogger.debug(exc);
                }
            }

            const s18 = performance.now();
            wLogger.debug('TMD(updateState) updated');

            wLogger.timings(
                'TourneyManagerData/updateState',
                {
                    total: s18 - s1,
                    addr: s2 - s1,
                    leftBase: s3 - s2,
                    RightBase: s4 - s3,
                    ipcstate: s5 - s4,
                    leftstars: s6 - s5,
                    rightstars: s7 - s6,
                    bestof: s8 - s7,
                    starsvisible: s9 - s8,
                    scorevisible: s10 - s9,
                    firstname: s11 - s10,
                    secondname: s12 - s11,
                    firstscore: s13 - s12,
                    secondscore: s14 - s13,
                    ipcaddr: s15 - s14,
                    list: s16 - s15,
                    items: s17 - s16,
                    length: s18 - s17
                },
                performance.now()
            );

            this.resetReportCount('TMD(updateState)');
        } catch (exc) {
            this.reportError(
                'TMD(updateState)',
                10,
                `TMD(updateState) ${(exc as any).message}`
            );
            wLogger.debug(exc);
        }
    }
}
