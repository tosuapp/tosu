import { wLogger } from '@tosu/common';

import { DataRepo } from '@/entities/DataRepoList';

export interface BaseData {
    statusAddr: number;
    baseAddr: number;
    menuModsAddr: number;
    playTimeAddr: number;
    chatCheckerAddr: number;
    skinDataAddr: number;
    configurationAddr: number;
    bindingsAddr: number;
    rulesetsAddr: number;
    canRunSlowlyAddr: number;
    getAudioLengthAddr: number;
    userProfileAddr: number;
}

export class MemoryBase {
    entities: DataRepo;
    bases: BaseData;

    // set default leaderStart = windows
    leaderStart: number = 0x8;

    constructor(entities: DataRepo) {
        this.entities = entities;
        this.bases = {
            statusAddr: 0,
            baseAddr: 0,
            menuModsAddr: 0,
            playTimeAddr: 0,
            chatCheckerAddr: 0,
            skinDataAddr: 0,
            configurationAddr: 0,
            bindingsAddr: 0,
            rulesetsAddr: 0,
            canRunSlowlyAddr: 0,
            getAudioLengthAddr: 0,
            userProfileAddr: 0
        };

        if (process.platform !== 'win32') {
            this.leaderStart = 0xc;
        }
    }

    setBase(key: keyof BaseData, val: number): boolean {
        this.bases[key] = val;
        return true;
    }

    getBase(key: keyof BaseData) {
        if (key in this.bases) {
            return this.bases[key];
        }

        this.bases[key] = 0;
        return 0;
    }

    getLeaderStart() {
        return this.leaderStart;
    }

    checkIsBasesValid(): boolean {
        Object.entries(this.bases).map((entry) =>
            wLogger.debug(
                `MB(checkIsBasesValid) ${entry[0]}: 0${entry[1]
                    .toString(16)
                    .toUpperCase()}`
            )
        );
        return !Object.values(this.bases).some((base) => base === 0);
    }
}
