import { describe, expect, test } from 'bun:test';

import { argumentsParser } from './arguments';

describe('argumentsParser', () => {
    test('parses argv arrays with = and boolean values', () => {
        expect(
            argumentsParser(['tosu.exe', '--update=false', '--onedrive=true'])
        ).toEqual({ update: false, onedrive: true });
    });

    test('parses numeric values from a string', () => {
        expect(argumentsParser('--port=24050 --debug=true')).toEqual({
            port: 24050,
            debug: true
        });
    });
});
