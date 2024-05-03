import { wLogger } from '@tosu/common';

export interface PatternData {
    baseAddr: number;
    playTimeAddr: number;
    chatCheckerAddr: number;
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
    gameTimePtr: number;
    spectatingUserPtr: number;
}

export class MemoryPatterns {
    private patterns: PatternData;

    // set default leaderStart = windows
    private leaderStart: number = 0x8;

    constructor() {
        this.patterns = {
            baseAddr: 0,
            playTimeAddr: 0,
            chatCheckerAddr: 0,
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
            gameTimePtr: 0,
            spectatingUserPtr: 0
        };

        if (process.platform !== 'win32') {
            this.leaderStart = 0xc;
        }
    }

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

    checkIsBasesValid(): boolean {
        Object.entries(this.patterns).map((entry) =>
            wLogger.debug(
                `MP(checkIsBasesValid) ${entry[0]}: ${entry[1]
                    .toString(16)
                    .toUpperCase()}`
            )
        );
        return !Object.values(this.patterns).some((base) => base === 0);
    }
}
