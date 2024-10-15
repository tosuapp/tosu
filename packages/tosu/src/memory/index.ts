import { wLogger } from '@tosu/common';
import { platform } from 'process';
import { Process } from 'tsprocess/dist/process';

import type { AbstractInstance } from '@/instances';
import type {
    IAudioVelocityBase,
    IBindingValue,
    IConfigValue,
    IGameplay,
    IGlobal,
    IGlobalPrecise,
    IHitErrors,
    IKeyOverlay,
    ILeaderboard,
    IMP3Length,
    IMenu,
    IOffsets,
    IResultScreen,
    ISettingsPointers,
    ITourney,
    ITourneyChat,
    ITourneyUser,
    IUser
} from '@/memory/types';
import type { ITourneyManagerChatItem } from '@/states/tourney';
import type { BindingsList, ConfigList } from '@/utils/settings.types';

export type ScanPatterns = {
    [k in keyof any]: {
        pattern: string;
        offset?: number;
        isTourneyOnly?: boolean;
    };
};

export abstract class AbstractMemory<M extends Record<string, number>> {
    abstract patterns: M;

    pid: number;
    process: Process;
    path: string = '';

    game: AbstractInstance;

    private leaderStart: number = platform !== 'win32' ? 0xc : 0x8;

    constructor(process: Process, instance: AbstractInstance) {
        this.process = process;

        this.pid = process.id;
        this.path = process.path;

        this.game = instance;
    }

    abstract getScanPatterns(): ScanPatterns;
    abstract audioVelocityBase(): IAudioVelocityBase;
    abstract user(): IUser;
    abstract settingsPointers(): ISettingsPointers;
    abstract configOffsets(address: number, list: ConfigList): IOffsets;
    abstract bindingsOffsets(address: number, list: BindingsList): IOffsets;
    abstract configValue(
        address: number,
        position: number,
        list: ConfigList
    ): IConfigValue;

    abstract bindingValue(address: number, position: number): IBindingValue;
    abstract resultScreen(): IResultScreen;
    abstract gameplay(): IGameplay;
    abstract keyOverlay(mode: number): IKeyOverlay;
    abstract hitErrors(): IHitErrors;
    abstract global(): IGlobal;
    abstract globalPrecise(): IGlobalPrecise;
    abstract menu(previousChecksum: string): IMenu;
    abstract mp3Length(): IMP3Length;
    abstract tourney(): ITourney;
    abstract tourneyChat(messages: ITourneyManagerChatItem[]): ITourneyChat;
    abstract tourneyUser(): ITourneyUser;
    abstract leaderboard(rulesetAddr: number): ILeaderboard;

    checkIsBasesValid(): boolean {
        Object.entries(this.patterns).map((entry) =>
            wLogger.debug(
                `SM(checkIsBasesValid)[${this.pid}] ${entry[0]}: ${entry[1]
                    .toString(16)
                    .toUpperCase()}`
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
}
