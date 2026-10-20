import { debounce, wLogger } from '@tosu/common';

export interface TaskHandle {
    stop: () => void;
}

export class Task {
    public static recur(
        getInterval: () => number,
        callback: (stop: () => void) => void | Promise<void>
    ): TaskHandle {
        let timer: NodeJS.Timeout | null = null;
        let stopped = false;

        const stop = () => {
            stopped = true;
            if (timer) clearTimeout(timer);
        };

        const loop = async () => {
            if (stopped) return;
            try {
                await callback(stop);
            } catch (err) {
                wLogger.error(
                    'Recurring task execution error:',
                    (err as Error).message
                );
                wLogger.debug('Recurring task error details:', err);
            }

            if (!stopped) {
                const interval = Math.max(10, getInterval());
                timer = setTimeout(loop, interval);
            }
        };

        const initialInterval = Math.max(10, getInterval());
        timer = setTimeout(loop, initialInterval);

        return { stop };
    }

    public static once<T>(
        predicate: () => T | false | null | undefined,
        action: (result: T) => void | Promise<void>,
        checkIntervalMs = 100
    ): TaskHandle {
        let timer: NodeJS.Timeout | null = null;
        let done = false;

        const stop = () => {
            done = true;
            if (timer) clearTimeout(timer);
        };

        const check = async () => {
            if (done) return;
            try {
                const result = predicate();
                if (result) {
                    done = true;
                    await action(result);
                    return;
                }
            } catch (err) {
                wLogger.error(
                    'Condition waiter task error:',
                    (err as Error).message
                );
                wLogger.debug('Condition waiter error details:', err);
            }

            if (!done) {
                timer = setTimeout(check, checkIntervalMs);
            }
        };

        check();

        return { stop };
    }

    public static debounce<T extends (...args: any[]) => void>(
        delayMs: number,
        fn: T
    ): T {
        return debounce(fn, delayMs) as unknown as T;
    }
}
