import { wLogger } from '@tosu/common';

import { OsuInstance } from '@/objects/instanceManager/osuInstance';

export abstract class AbstractEntity {
    errorsCount: { [key: string | number]: number } = {};
    osuInstance: OsuInstance;

    constructor(osuInstance: OsuInstance) {
        this.osuInstance = osuInstance;
    }

    updateState() {
        throw Error('Error: updateState not implemented');
    }

    reportError(id: string | number, maxAmount: number, ...args: any[]) {
        this.errorsCount[id] = (this.errorsCount[id] || 0) + 1;

        if (this.errorsCount[id] <= maxAmount) {
            wLogger.debugError(...args);
            return;
        }

        wLogger.error(...args);
    }

    resetReportCount(id: string | number) {
        this.errorsCount[id] = 0;
    }
}
