import { ClientType, measureTime, wLogger } from '@tosu/common';

import { IRankedPlay } from '@/memory/types';
import { AbstractState } from '@/states/index';

export class RankedPlay extends AbstractState {
    info: IRankedPlay | undefined = undefined;

    @measureTime
    updateState() {
        try {
            const play = this.game.memory.rankedPlay();
            this.info = play !== 'not-ready' ? play : undefined;
        } catch (exc) {
            this.info = undefined;

            this.game.reportError(
                'rankedplay updatestate',
                10,
                ClientType[this.game.client],
                this.game.pid,
                `rankedplay updatestate`,
                (exc as any).message
            );
            wLogger.debug(
                `%${ClientType[this.game.client]}%`,
                `Error updating rankedplay state:`,
                exc
            );
        }
    }
}
