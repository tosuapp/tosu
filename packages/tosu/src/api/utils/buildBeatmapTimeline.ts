import type { Beatmap } from 'osu-classes';

import type { BeatmapTimeline } from '@/api/types/v2';

export function buildBeatmapTimeline(
    beatmap: Beatmap,
    checksum: string
): BeatmapTimeline {
    return {
        checksum,
        mode: beatmap.mode,
        fileFormat: beatmap.fileFormat,
        comboColours: beatmap.colors.comboColors.map((colour) => ({
            red: colour.red,
            green: colour.green,
            blue: colour.blue
        })),
        breaks: beatmap.events.breaks.map((point) => ({
            startTime: point.startTime,
            endTime: point.endTime
        })),
        hitObjects: beatmap.hitObjects.map((object) => ({
            startTime: object.startTime,
            type: object.hitType
        }))
    };
}
