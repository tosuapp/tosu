import { context } from '@tosu/common';
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';

import { buildEmptyPage } from './counters';

// renderHomepage() compares these via semver.gt(); they are otherwise only
// populated at startup/update-check time, which never runs in tests.
let previousCurrentVersion: string;
let previousUpdateVersion: string;

beforeAll(() => {
    previousCurrentVersion = context.currentVersion;
    previousUpdateVersion = context.updateVersion;

    context.currentVersion = '1.0.0';
    context.updateVersion = '1.0.0';
});

afterAll(() => {
    context.currentVersion = previousCurrentVersion;
    context.updateVersion = previousUpdateVersion;
});

describe('buildEmptyPage', () => {
    test('returns the homepage shell with an empty results list', async () => {
        const res = await buildEmptyPage();

        expect(res.status).toBe(200);
        expect(res.headers.get('content-type')).toBe(
            'text/html; charset=utf-8'
        );

        const body = await res.text();
        expect(body).toContain('tosu dashboard');
        expect(body).toContain('<div class="results"></div>');
    });

    test('still returns 200 when versions are empty/invalid', async () => {
        context.currentVersion = '';
        context.updateVersion = '';

        const res = await buildEmptyPage();

        expect(res.status).toBe(200);

        context.currentVersion = '1.0.0';
        context.updateVersion = '1.0.0';
    });
});
