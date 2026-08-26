import { config, context } from '@tosu/common';
import { describe, expect, test } from 'bun:test';

import { buildEmptyPage } from './counters';

// Belt-and-braces: the bunfig.toml preload (test-setup.ts) is not discovered
// when tests run from a subdirectory (e.g. `cd packages/server && bun test`).
config.openDashboardOnStartup = false;

// renderHomepage() compares these via semver.gt(); they are otherwise only
// populated at startup/update-check time, which never runs in tests.
context.currentVersion = '1.0.0';
context.updateVersion = '1.0.0';

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
});
