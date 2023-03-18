import { wLogger } from "@/logger";
import { DataRepo } from "@/Services/repo";

// yep each dto should have class!
export class BassDensityData {
    services: DataRepo;

    currentAudioVelocity: number = 0.00;
    density: number = 0.00;

    constructor(services: DataRepo) {
        this.services = services;
    }

    async updateState() {
        const { process: osuProcess, bases } = this.services.getServices(["process", "bases"]);
        if (osuProcess === null) {
            throw new Error("Process not found")
        }
        if (bases === null) {
            throw new Error("Bases repo not found")
        }

        const isWin = process.platform === "win32";
        const leaderStart = isWin ? 0x8 : 0xC;

        // Ruleset = [[Rulesets - 0xB] + 0x4]
        const rulesetAddr = osuProcess.readInt(osuProcess.readInt(bases.getBase("rulesetsAddr") - 0xB) + 0x4)
        // [Ruleset + 0x44] + 0x10
        const audioVelocityBase = osuProcess.readInt(osuProcess.readInt(rulesetAddr + 0x44) + 0x10)

        let bass = 0.00;
        let currentAudioVelocity = this.currentAudioVelocity;
        for (let i = 0; i < 40; i++) {
            let current = audioVelocityBase + leaderStart + 0x4 * i;

            const value = osuProcess.readFloat(current)
            if (value < 0) {
                return 0.5
            }
            bass += 2 * value * (40 - i) / 40
        }
        
        if (isNaN(currentAudioVelocity) || isNaN(bass)) {
            this.currentAudioVelocity = 0
            return 0.5
        }
        currentAudioVelocity = Math.max(currentAudioVelocity, Math.min(bass * 1.5, 6))
        currentAudioVelocity *= 0.95

        this.currentAudioVelocity = currentAudioVelocity
        this.density = (1 + currentAudioVelocity) * 0.5
        wLogger.debug(`BassDensity: ${this.density}`)
    }
}