import { ClientType, measureTime, wLogger } from '@tosu/common';

import { ILazerRankedPlay } from '@/memory/types';
import { AbstractState } from '@/states/index';

export class RankedPlay extends AbstractState {
    infoExist: boolean = false;
    info: ILazerRankedPlay | undefined = undefined;

    @measureTime
    updateState() {
        try {
            const play = this.game.memory.rankedPlay();
            if (play === 'not-ready') {
                this.infoExist = false;
            } else {
                this.infoExist = true;
                this.info = play;
            }
        } catch (exc) {
            this.infoExist = false;

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
