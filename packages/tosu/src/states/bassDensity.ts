import { ClientType, measureTime, wLogger } from '@tosu/common';

import { AbstractState } from '@/states';

// yep each dto should have class!
export class BassDensity extends AbstractState {
    currentAudioVelocity: number = 0.0;
    density: number = 0.0;

    @measureTime
    updateState() {
        try {
            const audioVelocityBase = this.game.memory.audioVelocityBase();
            if (typeof audioVelocityBase === 'string') {
                wLogger.debug(
                    `%${ClientType[this.game.client]}%`,
                    `Failed to resolve audio patterns:`,
                    audioVelocityBase
                );
                return;
            }

            let bass = 0.0;
            let currentAudioVelocity = this.currentAudioVelocity;
            for (let i = 0; i < 40; i++) {
                const value = audioVelocityBase[i];
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

            this.game.resetReportCount('BassDensity updateState');
        } catch (exc) {
            this.game.reportError(
                'BassDensity updateState',
                10,
                ClientType[this.game.client],
                this.game.pid,
                'BassDensity updateState',
                (exc as Error).message
            );
            wLogger.debug(
                `%${ClientType[this.game.client]}%`,
                `Error updating bass density state:`,
                exc
            );
        }
    }
}
