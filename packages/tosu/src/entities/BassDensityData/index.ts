import { wLogger } from '@tosu/common';

import { AbstractEntity } from '../AbstractEntity';

// yep each dto should have class!
export class BassDensityData extends AbstractEntity {
    currentAudioVelocity: number = 0.0;
    density: number = 0.0;

    private updateStateErrorAttempts: number = 0;

    updateState() {
        try {
            const { process: osuProcess, patterns } = this.services.getServices(
                ['process', 'patterns']
            );
            if (osuProcess === null) {
                throw new Error('Process not found');
            }

            const isWin = process.platform === 'win32';
            const leaderStart = isWin ? 0x8 : 0xc;

            // Ruleset = [[Rulesets - 0xB] + 0x4]
            const rulesetAddr = osuProcess.readInt(
                osuProcess.readInt(patterns.getPattern('rulesetsAddr') - 0xb) +
                    0x4
            );
            if (rulesetAddr === 0) {
                wLogger.debug('BDD(updateState) rulesetAddr is zero');
                return;
            }

            // [Ruleset + 0x44] + 0x10
            const audioVelocityBase = osuProcess.readInt(
                osuProcess.readInt(rulesetAddr + 0x44) + 0x10
            );

            const bassDensityLength = osuProcess.readInt(
                audioVelocityBase + 0x4
            );
            if (bassDensityLength < 40) {
                wLogger.debug(
                    'BDD(updateState) bassDensity length less than 40 (basically it have 1024 values)'
                );
                return;
            }

            let bass = 0.0;
            let currentAudioVelocity = this.currentAudioVelocity;
            for (let i = 0; i < 40; i++) {
                const current = audioVelocityBase + leaderStart + 0x4 * i;

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

            if (this.updateStateErrorAttempts !== 0) {
                this.updateStateErrorAttempts = 0;
            }
        } catch (exc) {
            this.updateStateErrorAttempts += 1;

            if (this.updateStateErrorAttempts > 5) {
                wLogger.error(`BDD(updateState) ${(exc as any).message}`);
            }
            wLogger.debug(exc);
        }
    }
}
