import { config, sleep, wLogger } from '@tosu/common';

import { AbstractState } from '@/states';

const TOURNAMENT_CHAT_ENGINE = 'A1 ?? ?? ?? ?? 89 45 F0 8B D1 85 C9 75';

export type ITourneyManagetChatItem = {
    time: string;
    name: string;
    content: string;
};

export class TourneyManager extends AbstractState {
    isDefaultState: boolean = true;

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

    UserAccuracy: number = 0.0;
    UserRankedScore: number = 0;
    UserPlayCount: number = 0;
    UserGlobalRank: number = 0;
    UserPP: number = 0;
    UserName: string = '';
    UserCountry: string = '';
    UserID: number = 0;

    reset() {
        if (this.isDefaultState) {
            return;
        }

        this.isDefaultState = true;
        this.UserAccuracy = 0.0;
        this.UserRankedScore = 0;
        this.UserPlayCount = 0;
        this.UserGlobalRank = 0;
        this.UserPP = 0;
        this.UserName = '';
        this.UserCountry = '';
        this.UserID = 0;
    }

    async updateState() {
        try {
            wLogger.debug('TMD(updateState) Starting');

            const { process, memory } = this.game.getServices([
                'process',
                'memory'
            ]);

            const rulesetsAddr = memory.getPattern('rulesetsAddr');

            const rulesetAddr = process.readInt(
                process.readInt(rulesetsAddr - 0xb) + 0x4
            );
            if (rulesetAddr === 0) {
                wLogger.debug('TMD(updateState) RulesetAddr is 0');
                return;
            }

            if (this.ChatAreaAddr === 0) {
                await sleep(1000);
                this.ChatAreaAddr = process.scanSync(TOURNAMENT_CHAT_ENGINE);
                wLogger.debug('TMD(updateState) Chat area found');
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
            this.StarsVisible = Boolean(process.readByte(teamRightBase + 0x38));
            // ScoreVisible int8   `mem:"[Ruleset + 0x20] + 0x39"`
            this.ScoreVisible = Boolean(process.readByte(teamRightBase + 0x39));
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

            const channelsList = process.readPointer(this.ChatAreaAddr + 0x1);
            const channelsItems = process.readInt(channelsList + 0x4);

            const channelsLength = process.readInt(channelsItems + 0x4);
            // Reversing array is needed for make more fast search,
            // because osu creates 40 channels with language topics, lobby, osu, etc... (bancho announces this to you)
            // and 41 is commonly for multiplayer in tourney client
            for (let i = channelsLength - 1; i >= 0; i--) {
                try {
                    const current =
                        channelsItems + memory.getLeaderStart() + 0x4 * i;

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
                                memory.getLeaderStart() +
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

            wLogger.debug('TMD(updateState) updated');

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

    updateUser() {
        const { process, gameplay, memory } = this.game.getServices([
            'process',
            'gameplay',
            'memory'
        ]);

        const spectatingUserDrawable = process.readPointer(
            memory.getPattern('spectatingUserPtr')
        );
        if (!spectatingUserDrawable) {
            wLogger.debug('TUPD(updateState) Slot is not equiped');

            this.reset();
            if (gameplay.isDefaultState !== true)
                gameplay.init(undefined, 'tourney');
            return;
        }

        this.resetReportCount('TUPD(updateState) Slot');

        try {
            // UserDrawable + 0x4
            this.UserAccuracy = process.readDouble(
                spectatingUserDrawable + 0x4
            );
            // UserDrawable + 0xc
            this.UserRankedScore = process.readLong(
                spectatingUserDrawable + 0xc
            );
            // UserDrawable + 0x7C
            this.UserPlayCount = process.readInt(spectatingUserDrawable + 0x7c);
            // UserDrawable + 0x84
            this.UserGlobalRank = process.readInt(
                spectatingUserDrawable + 0x84
            );
            // UserDrawable + 0x9C
            this.UserPP = process.readInt(spectatingUserDrawable + 0x9c);
            // [UserDrawable + 0x30]
            this.UserName = process.readSharpString(
                process.readInt(spectatingUserDrawable + 0x30)
            );
            // [UserDrawable + 0x2C]
            this.UserCountry = process.readSharpString(
                process.readInt(spectatingUserDrawable + 0x2c)
            );
            // UserDrawable + 0x70
            this.UserID = process.readInt(spectatingUserDrawable + 0x70);

            this.isDefaultState = false;

            this.resetReportCount('TUPD(updateState)');
        } catch (exc) {
            this.reportError(
                'TUPD(updateState)',
                10,
                `TUPD(updateState) ${(exc as any).message}`
            );
            wLogger.debug(exc);
        }
    }
}
