import { wLogger } from '@tosu/common';

import { AbstractEntity } from '@/entities/AbstractEntity';

// delay in milliseconds. 500ms has been enough to eliminate spurious map ID changes in the tournament client
// over two weeks of testing at 4WC
const NEW_MAP_COMMIT_DELAY = 500;

export class MenuData extends AbstractEntity {
    Status: number;
    MenuGameMode: number;
    Plays: number;
    Artist: string;
    ArtistOriginal: string;
    Title: string;
    TitleOriginal: string;
    AR: number;
    CS: number;
    HP: number;
    OD: number;
    AudioFilename: string;
    BackgroundFilename: string;
    Folder: string;
    Creator: string;
    Name: string;
    Path: string;
    Difficulty: string;
    MapID: number;
    SetID: number;
    RankedStatus: number;
    MD5: string;
    ObjectCount: number;
    MP3Length: number;

    previousMD5: string = '';
    pendingMD5: string = '';
    mapChangeTime: number = 0;

    updateState() {
        try {
            const { process, patterns } = this.osuInstance.getServices([
                'process',
                'patterns'
            ]);

            const s1 = performance.now();
            const baseAddr = patterns.getPattern('baseAddr');

            const s2 = performance.now();
            const beatmapAddr = process.readPointer(baseAddr - 0xc);
            if (beatmapAddr === 0) {
                wLogger.debug('MD(updateState) beatmapAddr is 0');
                return;
            }

            // [[Beatmap] + 0x6C]
            const s3 = performance.now();
            const newMD5 = process.readSharpString(
                process.readInt(beatmapAddr + 0x6c)
            );

            // [[Beatmap] + 0x90]
            const s4 = performance.now();
            const newPath = process.readSharpString(
                process.readInt(beatmapAddr + 0x90)
            );

            if (newMD5 === this.previousMD5 || !newPath.endsWith('.osu')) {
                return;
            }

            if (this.pendingMD5 !== newMD5) {
                this.mapChangeTime = performance.now();
                this.pendingMD5 = newMD5;

                return;
            }

            if (performance.now() - this.mapChangeTime < NEW_MAP_COMMIT_DELAY) {
                return;
            }

            // MD5 hasn't changed in over NEW_MAP_COMMIT_DELAY, commit to new map
            this.MD5 = newMD5;
            this.Path = newPath;

            // [Base - 0x33]
            const s5 = performance.now();
            this.MenuGameMode = process.readPointer(baseAddr - 0x33);

            // [Base - 0x33] + 0xC
            const s6 = performance.now();
            this.Plays = process.readInt(
                process.readInt(baseAddr - 0x33) + 0xc
            );

            // [[Beatmap] + 0x18]
            const s7 = performance.now();
            this.Artist = process.readSharpString(
                process.readInt(beatmapAddr + 0x18)
            );

            // [[Beatmap] + 0x1C]
            const s8 = performance.now();
            this.ArtistOriginal = process.readSharpString(
                process.readInt(beatmapAddr + 0x1c)
            );
            // [[Beatmap] + 0x24]
            const s9 = performance.now();
            this.Title = process.readSharpString(
                process.readInt(beatmapAddr + 0x24)
            );

            // [[Beatmap] + 0x28]
            const s10 = performance.now();
            this.TitleOriginal = process.readSharpString(
                process.readInt(beatmapAddr + 0x28)
            );

            //  [Beatmap] + 0x2C
            const s11 = performance.now();
            this.AR = process.readFloat(beatmapAddr + 0x2c);

            //  [Beatmap] + 0x30
            const s12 = performance.now();
            this.CS = process.readFloat(beatmapAddr + 0x30);

            //  [Beatmap] + 0x34
            const s13 = performance.now();
            this.HP = process.readFloat(beatmapAddr + 0x34);

            //  [Beatmap] + 0x38
            const s14 = performance.now();
            this.OD = process.readFloat(beatmapAddr + 0x38);

            //  [[Beatmap] + 0x64]
            const s15 = performance.now();
            this.AudioFilename = process.readSharpString(
                process.readInt(beatmapAddr + 0x64)
            );

            //  [[Beatmap] + 0x68]
            const s16 = performance.now();
            this.BackgroundFilename = process.readSharpString(
                process.readInt(beatmapAddr + 0x68)
            );

            //  [[Beatmap] + 0x78]
            const s17 = performance.now();
            this.Folder = process.readSharpString(
                process.readInt(beatmapAddr + 0x78)
            );
            //  [[Beatmap] + 0x7C]
            const s18 = performance.now();
            this.Creator = process.readSharpString(
                process.readInt(beatmapAddr + 0x7c)
            );

            //  [[Beatmap] + 0x80]
            const s19 = performance.now();
            this.Name = process.readSharpString(
                process.readInt(beatmapAddr + 0x80)
            );

            //  [[Beatmap] + 0xAC]
            const s20 = performance.now();
            this.Difficulty = process.readSharpString(
                process.readInt(beatmapAddr + 0xac)
            );

            //  [Beatmap] + 0xC8
            const s21 = performance.now();
            this.MapID = process.readInt(beatmapAddr + 0xc8);
            //  [Beatmap] + 0xCC
            const s22 = performance.now();
            this.SetID = process.readInt(beatmapAddr + 0xcc);

            //  [Beatmap] + 0x12C
            // unknown, unsubmitted, pending/wip/graveyard, unused, ranked, approved, qualified
            const s23 = performance.now();
            this.RankedStatus = process.readInt(beatmapAddr + 0x12c);

            //  [Beatmap] + 0xF8
            const s24 = performance.now();
            this.ObjectCount = process.readInt(beatmapAddr + 0xf8);

            this.previousMD5 = this.MD5;

            const s25 = performance.now();
            wLogger.timings(
                'MenuData/updateState',
                {
                    total: s25 - s1,
                    baseAddr: s2 - s1,
                    beatmapAddr: s3 - s2,
                    newMD5: s4 - s3,
                    newPath: s5 - s4,

                    MenuGameMode: s6 - s5,
                    Plays: s7 - s6,
                    Artist: s8 - s7,
                    ArtistOriginal: s9 - s8,
                    Title: s10 - s9,
                    TitleOriginal: s11 - s10,
                    AR: s12 - s11,
                    CS: s13 - s12,
                    HP: s14 - s13,
                    OD: s15 - s14,
                    AudioFilename: s16 - s15,
                    BackgroundFilename: s17 - s16,
                    Folder: s18 - s17,
                    Creator: s19 - s18,
                    Name: s20 - s19,
                    Difficulty: s21 - s20,
                    MapID: s22 - s21,
                    SetID: s23 - s22,
                    RankedStatus: s24 - s23,
                    ObjectCount: s25 - s24
                },
                performance.now()
            );

            this.resetReportCount('MB(updateState)');
        } catch (exc) {
            this.reportError(
                'MB(updateState)',
                10,
                `MB(updateState) ${(exc as any).message}`
            );
            wLogger.debug(exc);
        }
    }

    updateMP3Length() {
        try {
            const { process, patterns } = this.osuInstance.getServices([
                'process',
                'patterns'
            ]);

            // [[GetAudioLength + 0x7] + 0x4]
            const s1 = performance.now();
            this.MP3Length = Math.round(
                process.readDouble(
                    process.readPointer(
                        patterns.getPattern('getAudioLengthPtr')
                    ) + 0x4
                )
            );

            const s2 = performance.now();
            wLogger.timings(
                'MenuData/updateMP3Length',
                { total: s2 - s1 },
                performance.now()
            );

            this.resetReportCount('MB(updateMP3Length)');
        } catch (exc) {
            this.reportError(
                'MB(updateMP3Length)',
                10,
                `MB(updateMP3Length) ${(exc as any).message}`
            );
            wLogger.debug(exc);
        }
    }
}
