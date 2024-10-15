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

// TODO: fix this when PatternData will be separated for each
export type ScanPatterns = {
    [k in keyof any]: {
        pattern: string;
        offset?: number;
        isTourneyOnly?: boolean;
    };
};

export interface PatternData {
    baseAddr: number;
    playTimeAddr: number;
    chatCheckerPtr: number;
    skinDataAddr: number;
    settingsClassAddr: number;
    configurationAddr: number;
    bindingsAddr: number;
    rulesetsAddr: number;
    canRunSlowlyAddr: number;
    statusPtr: number;
    menuModsPtr: number;
    getAudioLengthPtr: number;
    userProfilePtr: number;
    rawLoginStatusPtr: number;
    spectatingUserPtr: number;
    gameTimePtr: number;
}

export abstract class AbstractMemory {
    pid: number;
    process: Process;
    path: string = '';

    game: AbstractInstance;

    patterns: PatternData = {
        baseAddr: 0,
        playTimeAddr: 0,
        chatCheckerPtr: 0,
        skinDataAddr: 0,
        settingsClassAddr: 0,
        configurationAddr: 0,
        bindingsAddr: 0,
        rulesetsAddr: 0,
        canRunSlowlyAddr: 0,
        statusPtr: 0,
        menuModsPtr: 0,
        getAudioLengthPtr: 0,
        userProfilePtr: 0,
        rawLoginStatusPtr: 0,
        spectatingUserPtr: 0,
        gameTimePtr: 0
    };

    private leaderStart: number = platform !== 'win32' ? 0xc : 0x8;

    constructor(process: Process, instance: AbstractInstance) {
        this.process = process;

        this.pid = process.id;
        this.path = process.path;

        this.game = instance;
    }

    abstract getScanPatterns(): ScanPatterns;

    setPattern(key: keyof PatternData, val: number): boolean {
        this.patterns[key] = val;
        return true;
    }

    getPattern(key: keyof PatternData) {
        return this.patterns[key];
    }

    getPatterns<T extends (keyof PatternData)[]>(
        patterns: T
    ): Pick<PatternData, T[number]> | never {
        return patterns.reduce(
            (acc, item: keyof Pick<PatternData, T[number]>) => {
                acc[item] = this.patterns[item];
                return acc;
            },
            {} as Pick<PatternData, T[number]>
        );
    }

    getLeaderStart() {
        return this.leaderStart;
    }

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
}
