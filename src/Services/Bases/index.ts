import { wLogger } from "@/logger";
import { DataRepo } from "../repo";

export interface BaseData {
    statusAddr: number;
    baseAddr: number;
    menuModsAddr: number;
    playTimeAddr: number;
    chatCheckerAddr: number;
    skinDataAddr: number;
    settingsClassAddr: number;
    rulesetsAddr: number;
    canRunSlowlyAddr: number;
    getAudioLengthAddr: number;
}

export class Bases {
    services: DataRepo
    bases: BaseData

    // set default leaderStart = windows
    leaderStart: number = 0x8

    constructor(services: DataRepo) {
        this.services = services;
        this.bases = {
            statusAddr: 0,
            baseAddr: 0,
            menuModsAddr: 0,
            playTimeAddr: 0,
            chatCheckerAddr: 0,
            skinDataAddr: 0,
            settingsClassAddr: 0,
            rulesetsAddr: 0,
            canRunSlowlyAddr: 0,
            getAudioLengthAddr: 0,
        }

        if (process.platform !== "win32") {
            this.leaderStart = 0xC
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
        Object.entries(this.bases).map((entry) => wLogger.debug(`${entry[0]}: 0${entry[1].toString(16).toUpperCase()}`))
        return !Object.values(this.bases).some(base => base === 0)
    }
}