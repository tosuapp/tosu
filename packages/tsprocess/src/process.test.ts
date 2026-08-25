import { describe, expect, test } from 'bun:test';
import path from 'node:path';

import { Process } from './process';

describe('tsprocess native addon', () => {
    test('finds the current process by executable name', () => {
        const pids = Process.findProcesses([path.basename(process.execPath)]);
        expect(pids).toContain(process.pid);
    });

    test('reports the current process as 64-bit', () => {
        expect(Process.isProcess64bit(process.pid)).toBe(true);
    });
});
