import { platform } from 'process';
import { Process } from 'tsprocess/dist/process';

import { AbstractInstance } from '@/instances';
import { Gameplay } from '@/states/gameplay';
import { Global } from '@/states/global';

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

        this.preciseDataLoop = this.preciseDataLoop.bind(this);
    }

    abstract resolvePatterns(): boolean;

    abstract initiateDataLoops(): void;

    abstract regularDataLoop(): void;

    abstract preciseDataLoop(Global: Global, Gameplay: Gameplay): void;

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
}
