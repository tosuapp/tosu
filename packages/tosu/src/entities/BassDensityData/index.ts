import { DataRepo } from '@/entities/DataRepoList';
import { wLogger } from '@/logger';

import { AbstractEntity } from '../AbstractEntity';

// yep each dto should have class!
export class BassDensityData extends AbstractEntity {
    currentAudioVelocity: number = 0.0;
    density: number = 0.0;

    constructor(services: DataRepo) {
        super(services);
    }

    async updateState() {
        wLogger.debug(`[BaseDensityData:updateState] starting`);

        const { process: osuProcess, bases } = this.services.getServices([
            'process',
            'bases'
        ]);
        if (osuProcess === null) {
            throw new Error('Process not found');
        }
        if (bases === null) {
            throw new Error('Bases repo not found');
        }

        const isWin = process.platform === 'win32';
        const leaderStart = isWin ? 0x8 : 0xc;

        // Ruleset = [[Rulesets - 0xB] + 0x4]
        const rulesetAddr = osuProcess.readInt(
            osuProcess.readInt(bases.getBase('rulesetsAddr') - 0xb) + 0x4
        );
        // [Ruleset + 0x44] + 0x10
        const audioVelocityBase = osuProcess.readInt(
            osuProcess.readInt(rulesetAddr + 0x44) + 0x10
        );

        let bass = 0.0;
        let currentAudioVelocity = this.currentAudioVelocity;
        for (let i = 0; i < 40; i++) {
            let current = audioVelocityBase + leaderStart + 0x4 * i;

            const value = osuProcess.readFloat(current);
            if (value < 0) {
                this.density = 0.5;
                return;
            }
            bass += (2 * value * (40 - i)) / 40;
        }

        if (isNaN(currentAudioVelocity) || isNaN(bass)) {
            this.currentAudioVelocity = 0;
            this.density = 0.5;
            return;
        }
        currentAudioVelocity = Math.max(
            currentAudioVelocity,
            Math.min(bass * 1.5, 6)
        );
        currentAudioVelocity *= 0.95;

        this.currentAudioVelocity = currentAudioVelocity;
        this.density = (1 + currentAudioVelocity) * 0.5;

        wLogger.debug(`[BaseDensityData:updateState] updated`);
    }
}
