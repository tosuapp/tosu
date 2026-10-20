import assert from 'node:assert/strict';
import { test } from 'node:test';
import { HitType } from 'osu-classes';
import { BeatmapDecoder } from 'osu-parsers';

import { buildBeatmapTimeline } from '../src/api/utils/buildBeatmapTimeline';

function decode(
    objects: string,
    { colours = '', events = '', mode = 0, version = 14 } = {}
) {
    return new BeatmapDecoder().decodeFromString(
        `osu file format v${version}
[General]
Mode: ${mode}
[Colours]
${colours}
[Events]
${events}
[TimingPoints]
0,500,4,2,0,100,1,0
[HitObjects]
${objects}`,
        {
            parseColours: true,
            parseEvents: true,
            parseHitObjects: true,
            parseTimingPoints: true,
            parseGeneral: true,
            parseEditor: false,
            parseStoryboard: false,
            parseMetadata: true
        }
    );
}

test('preserves source times and raw combo/skip flags for circles and sliders', () => {
    const beatmap = decode(
        '64,64,1000,5,0\n64,64,1500,1,0\n64,64,2000,38,0,L|100:100,2,100',
        { colours: 'Combo1:255,0,0\nCombo2:0,255,128' }
    );
    const timeline = buildBeatmapTimeline(beatmap, 'test-checksum');

    assert.equal(timeline.checksum, 'test-checksum');
    assert.equal(timeline.mode, 0);
    assert.deepEqual(timeline.comboColours, [
        { red: 255, green: 0, blue: 0 },
        { red: 0, green: 255, blue: 128 }
    ]);
    assert.deepEqual(timeline.hitObjects, [
        { startTime: 1000, type: 5 },
        { startTime: 1500, type: 1 },
        { startTime: 2000, type: 38 }
    ]);
    assert.equal(timeline.hitObjects[2].type & HitType.Slider, HitType.Slider);
    assert.equal((timeline.hitObjects[2].type & HitType.ComboOffset) >> 4, 2);
});

test('keeps spinner entries and break boundaries for client-side colour progression', () => {
    const beatmap = decode('256,192,2000,12,0,3000\n64,64,4500,1,0', {
        events: '2,3200,4000'
    });
    const timeline = buildBeatmapTimeline(beatmap, 'spinner');

    assert.deepEqual(timeline.hitObjects, [
        { startTime: 2000, type: 12 },
        { startTime: 4500, type: 1 }
    ]);
    assert.deepEqual(timeline.breaks, [{ startTime: 3200, endTime: 4000 }]);
});

test('does not invent a skin palette when the map has no combo colours', () => {
    const timeline = buildBeatmapTimeline(decode('64,64,1000,1,0'), 'plain');
    assert.deepEqual(timeline.comboColours, []);
});

test('returns top-level mania holds without pretending to convert rulesets', () => {
    const beatmap = decode('64,192,1000,128,0,2000:0:0:0:0:', { mode: 3 });
    const timeline = buildBeatmapTimeline(beatmap, 'mania');
    assert.equal(timeline.mode, 3);
    assert.deepEqual(timeline.hitObjects, [{ startTime: 1000, type: 128 }]);
});

test('preserves decoded times and identifies old formats for the consumer', () => {
    const timeline = buildBeatmapTimeline(
        decode('64,64,1000,1,0', { version: 4 }),
        'legacy'
    );
    assert.equal(timeline.fileFormat, 4);
    assert.equal(timeline.hitObjects[0].startTime, 1000);
});

test('returns an independent JSON payload without modifying the parsed beatmap', () => {
    const beatmap = decode('64,64,1000,5,0', {
        colours: 'Combo1:10,20,30',
        events: '2,2000,3000'
    });
    const timeline = buildBeatmapTimeline(beatmap, 'immutable');
    assert.deepEqual(JSON.parse(JSON.stringify(timeline)), timeline);

    timeline.comboColours[0].red = 255;
    timeline.hitObjects[0].startTime = 0;
    timeline.breaks[0].startTime = 0;
    assert.equal(beatmap.colors.comboColors[0].red, 10);
    assert.equal(beatmap.hitObjects[0].startTime, 1000);
    assert.equal(beatmap.events.breaks[0].startTime, 2000);
});

test('serialises an empty decoded map without null array fields', () => {
    const timeline = buildBeatmapTimeline(decode(''), 'empty');
    assert.deepEqual(timeline, {
        checksum: 'empty',
        mode: 0,
        fileFormat: 14,
        comboColours: [],
        breaks: [],
        hitObjects: []
    });
});
