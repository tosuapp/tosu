import { wLogger } from '@tosu/common';

import { AbstractEntity } from '../AbstractEntity';

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

    private mp3ErrorAttempts: number = 0;

    updateState() {
        try {
            const { process, patterns } = this.services.getServices([
                'process',
                'patterns'
            ]);

            const baseAddr = patterns.getPattern('baseAddr');

            const beatmapAddr = process.readPointer(baseAddr - 0xc);
            if (beatmapAddr === 0) {
                wLogger.debug('MD(updateState) beatmapAddr is 0');
                return;
            }
            // [[Beatmap] + 0x6C]
            this.MD5 = process.readSharpString(
                process.readInt(beatmapAddr + 0x6c)
            );
            // [[Beatmap] + 0x90]
            this.Path = process.readSharpString(
                process.readInt(beatmapAddr + 0x90)
            );
            // [Base - 0x33]
            this.MenuGameMode = process.readPointer(baseAddr - 0x33);

            if (this.MD5 === this.previousMD5 || !this.Path.endsWith('.osu')) {
                return;
            }

            // [Base - 0x33] + 0xC
            this.Plays = process.readInt(
                process.readInt(baseAddr - 0x33) + 0xc
            );
            // [[Beatmap] + 0x18]
            this.Artist = process.readSharpString(
                process.readInt(beatmapAddr + 0x18)
            );
            // // [[Beatmap] + 0x1C]
            this.ArtistOriginal = process.readSharpString(
                process.readInt(beatmapAddr + 0x1c)
            );
            // // [[Beatmap] + 0x24]
            this.Title = process.readSharpString(
                process.readInt(beatmapAddr + 0x24)
            );
            // // [[Beatmap] + 0x28]
            this.TitleOriginal = process.readSharpString(
                process.readInt(beatmapAddr + 0x28)
            );

            //  [Beatmap] + 0x2C
            this.AR = process.readFloat(beatmapAddr + 0x2c);
            //  [Beatmap] + 0x30
            this.CS = process.readFloat(beatmapAddr + 0x30);
            //  [Beatmap] + 0x34
            this.HP = process.readFloat(beatmapAddr + 0x34);
            //  [Beatmap] + 0x38
            this.OD = process.readFloat(beatmapAddr + 0x38);
            //  [[Beatmap] + 0x64]
            this.AudioFilename = process.readSharpString(
                process.readInt(beatmapAddr + 0x64)
            );
            // //  [[Beatmap] + 0x68]
            this.BackgroundFilename = process.readSharpString(
                process.readInt(beatmapAddr + 0x68)
            );
            // this.BackgroundFilename = "";
            //  [[Beatmap] + 0x78]
            this.Folder = process.readSharpString(
                process.readInt(beatmapAddr + 0x78)
            );
            //  [[Beatmap] + 0x7C]
            this.Creator = process.readSharpString(
                process.readInt(beatmapAddr + 0x7c)
            );
            //  [[Beatmap] + 0x80]
            this.Name = process.readSharpString(
                process.readInt(beatmapAddr + 0x80)
            );
            //  [[Beatmap] + 0xAC]
            this.Difficulty = process.readSharpString(
                process.readInt(beatmapAddr + 0xac)
            );
            //  [Beatmap] + 0xC8
            this.MapID = process.readInt(beatmapAddr + 0xc8);
            //  [Beatmap] + 0xCC
            this.SetID = process.readInt(beatmapAddr + 0xcc);
            // unknown, unsubmitted, pending/wip/graveyard, unused, ranked, approved, qualified
            //  [Beatmap] + 0x12C
            this.RankedStatus = process.readInt(beatmapAddr + 0x12c);
            //  [Beatmap] + 0xF8
            this.ObjectCount = process.readInt(beatmapAddr + 0xf8);

            this.previousMD5 = this.MD5;
        } catch (exc) {
            wLogger.error(`MB(updateState) ${(exc as any).message}`);
            wLogger.debug(exc);
        }
    }

    updateMP3Length() {
        try {
            const { process, patterns } = this.services.getServices([
                'process',
                'patterns'
            ]);

            // [[GetAudioLength + 0x7] + 0x4]
            this.MP3Length = Math.round(
                process.readDouble(
                    process.readPointer(
                        patterns.getPattern('getAudioLengthPtr')
                    ) + 0x4
                )
            );

            this.mp3ErrorAttempts = 0;
        } catch (exc) {
            this.mp3ErrorAttempts += 1;

            if (this.mp3ErrorAttempts > 5) {
                wLogger.error(
                    'Unable to parse beatmap mp3 length (you can ignore it)'
                );
            }
            wLogger.debug(exc);
        }
    }
}
