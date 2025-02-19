import { wLogger } from '@tosu/common';

import { AbstractInstance } from '@/instances';

export type ReportError = (
    id: string | number,
    maxAmount: number,
    ...args: any[]
) => void;
export type ResetReportCount = (id: string | number) => void;

export abstract class AbstractState {
    errorsCount: { [key: string | number]: number } = {};
    game: AbstractInstance;

    constructor(game: AbstractInstance) {
        this.game = game;
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

    preventThrow(callback) {
        try {
            const result = callback();
            return result;
        } catch (error) {
            return error as Error;
        }
    }
}
