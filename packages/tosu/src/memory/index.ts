import { ClientType, wLogger } from '@tosu/common';
import { Process } from 'tsprocess';

import type { AbstractInstance } from '@/instances';
import type {
    IAudioVelocityBase,
    IGameplay,
    IGlobal,
    IGlobalPrecise,
    IHitErrors,
    IKeyOverlay,
    ILeaderboard,
    IMP3Length,
    IMenu,
    IResultScreen,
    ISettings,
    ITourney,
    ITourneyChat,
    ITourneyUser,
    IUser,
    ScanPatterns
} from '@/memory/types';
import type { ITourneyManagerChatItem } from '@/states/tourney';

export abstract class AbstractMemory<M extends Record<string, number>> {
    abstract patterns: M;

    pid: number;
    process: Process;
    path: string = '';

    game: AbstractInstance;

    private leaderStart: number = 0x8;

    constructor(process: Process, instance: AbstractInstance) {
        this.process = process;

        this.pid = process.id;
        this.path = process.path;

        this.game = instance;
    }

    abstract getScanPatterns(): ScanPatterns;
    abstract audioVelocityBase(): IAudioVelocityBase;
    abstract user(): IUser;

    abstract resultScreen(): IResultScreen;
    abstract gameplay(): IGameplay;
    abstract keyOverlay(mode: number): IKeyOverlay;
    abstract hitErrors(last: number): IHitErrors;
    abstract global(): IGlobal;
    abstract globalPrecise(): IGlobalPrecise;
    abstract menu(previousChecksum: string): IMenu;
    abstract mp3Length(): IMP3Length;
    abstract tourney(): ITourney;
    abstract tourneyChat(messages: ITourneyManagerChatItem[]): ITourneyChat;
    abstract tourneyUser(): ITourneyUser;
    abstract leaderboard(mode: number): ILeaderboard;

    checkIsBasesValid(): boolean {
        Object.entries(this.patterns).map((entry) =>
            wLogger.debug(
                `checkIsBasesValid ${entry[0]}: ${entry[1].toString(16).toUpperCase()} %${ClientType[this.game.client]}%`
            )
        );
        return !Object.values(this.patterns).some((base) => base === 0);
    }

    setPattern(key: keyof M, val: M[keyof M]): boolean {
        this.patterns[key] = val;
        return true;
    }

    getPattern(key: keyof M) {
        return this.patterns[key];
    }

    getPatterns<T extends (keyof M)[]>(
        patterns: T
    ): Pick<M, T[number]> | never {
        return patterns.reduce(
            (acc, item: keyof Pick<M, T[number]>) => {
                acc[item] = this.patterns[item];
                return acc;
            },
            {} as Pick<M, T[number]>
        );
    }

    getLeaderStart() {
        return this.leaderStart;
    }

    abstract settings(): ISettings;
}
