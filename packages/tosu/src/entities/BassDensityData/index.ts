import { wLogger } from '@tosu/common';

import { AbstractEntity } from '@/entities/AbstractEntity';

// yep each dto should have class!
export class BassDensityData extends AbstractEntity {
    currentAudioVelocity: number = 0.0;
    density: number = 0.0;

    updateState() {
        try {
            const { process: osuProcess, patterns } =
                this.osuInstance.getServices(['process', 'patterns']);
            if (osuProcess === null) {
                throw new Error('Process not found');
            }

            const isWin = process.platform === 'win32';
            const leaderStart = isWin ? 0x8 : 0xc;

            // Ruleset = [[Rulesets - 0xB] + 0x4]
            const s1 = performance.now();
            const rulesetAddr = osuProcess.readInt(
                osuProcess.readInt(patterns.getPattern('rulesetsAddr') - 0xb) +
                    0x4
            );
            if (rulesetAddr === 0) {
                wLogger.debug('BDD(updateState) rulesetAddr is zero');
                return;
            }

            // [Ruleset + 0x44] + 0x10
            const s2 = performance.now();
            const audioVelocityBase = osuProcess.readInt(
                osuProcess.readInt(rulesetAddr + 0x44) + 0x10
            );

            const s3 = performance.now();
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

            const s4 = performance.now();
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

            const s5 = performance.now();
            currentAudioVelocity = Math.max(
                currentAudioVelocity,
                Math.min(bass * 1.5, 6)
            );
            currentAudioVelocity *= 0.95;

            this.currentAudioVelocity = currentAudioVelocity;
            this.density = (1 + currentAudioVelocity) * 0.5;

            const s6 = performance.now();
            wLogger.timings(
                'BassBensityData/updateState',
                {
                    total: s6 - s1,
                    addr: s2 - s1,
                    base: s3 - s2,
                    length: s4 - s3,
                    loop: s5 - s4,
                    calc: s6 - s5
                },
                performance.now()
            );

            this.resetReportCount('BDD(updateState)');
        } catch (exc) {
            this.reportError(
                'BDD(updateState)',
                10,
                `BDD(updateState) ${(exc as any).message}`
            );
            wLogger.debug(exc);
        }
    }
}
