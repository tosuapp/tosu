import { ClientType, measureTime, wLogger } from '@tosu/common';

import { IRoom } from '@/memory/types';
import { AbstractState } from '@/states/index';

export class Room extends AbstractState {
    info: IRoom | undefined = undefined;

    @measureTime
    updateState() {
        try {
            const room = this.game.memory.room();
            this.info = room !== 'not-ready' ? room : undefined;
        } catch (exc) {
            this.info = undefined;

            this.game.reportError(
                'Room updatestate',
                10,
                ClientType[this.game.client],
                this.game.pid,
                `Room updatestate`,
                (exc as any).message
            );
            wLogger.debug(
                `%${ClientType[this.game.client]}%`,
                `Error updating Room state:`,
                exc
            );
        }
    }
}
