import { describe, expect, test } from 'bun:test';

import { applyFilter } from './filters';

describe('applyFilter', () => {
    const data = {
        state: 2,
        menu: { name: 'song', bpm: 180, mods: { number: 64 } },
        play: { combo: 12 }
    };

    test('copies top-level keys', () => {
        const value = {};
        applyFilter(['state', 'play'], data, value);

        expect(value).toEqual({ state: 2, play: { combo: 12 } });
    });

    test('copies nested keys through field/keys objects', () => {
        const value = {};
        applyFilter(
            [
                {
                    field: 'menu',
                    keys: ['name', { field: 'mods', keys: ['number'] }]
                }
            ],
            data,
            value
        );

        expect(value).toEqual({ menu: { name: 'song', mods: { number: 64 } } });
    });

    test('ignores missing fields and null data', () => {
        const value = {};
        applyFilter([{ field: 'nope', keys: ['x'] }], data, value);
        applyFilter(['state'], null, value);

        expect(value).toEqual({});
    });

    test('skips a null entry in the filter array instead of throwing', () => {
        const value = {};

        expect(() =>
            applyFilter([null as any, 'a'], { a: 1, b: 2 }, value)
        ).not.toThrow();
        expect(value).toEqual({ a: 1 });
    });
});
