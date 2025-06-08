import { ClientType, wLogger } from '@tosu/common';

import { type LazerInstance } from '@/instances/lazerInstance';
import { ILazerSpectator } from '@/memory/types';
import { AbstractState } from '@/states';

export class LazerMultiSpectating extends AbstractState {
    lazerSpectatingData: ILazerSpectator;

    updateState() {
        try {
            if (this.game.client !== ClientType.lazer) {
                throw new Error(
                    'lazer multi spectating is not available for stable'
                );
            }

            this.lazerSpectatingData = (
                this.game as LazerInstance
            ).memory.readSpectatingData();

            this.game.resetReportCount('lazerMultiSpectating updateState');
        } catch (exc) {
            this.game.reportError(
                'lazerMultiSpectating updateState',
                10,
                ClientType[this.game.client],
                this.game.pid,
                `lazerMultiSpectating updateState`,
                (exc as any).message
            );
            wLogger.debug(
                ClientType[this.game.client],
                this.game.pid,
                `lazerMultiSpectating updateState`,
                exc
            );
        }
    }
}
