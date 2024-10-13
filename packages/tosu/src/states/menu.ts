import { wLogger } from '@tosu/common';

import { AbstractState } from '@/states';

// delay in milliseconds. 500ms has been enough to eliminate spurious map ID changes in the tournament client
// over two weeks of testing at 4WC
const NEW_MAP_COMMIT_DELAY = 500;

export class Menu extends AbstractState {
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
            const { process, memory } = this.game.getServices([
                'process',
                'memory'
            ]);

            const baseAddr = memory.getPattern('baseAddr');

            const beatmapAddr = process.readPointer(baseAddr - 0xc);
            if (beatmapAddr === 0) {
                wLogger.debug('MD(updateState) beatmapAddr is 0');
                return 'not-ready';
            }

            // [Base - 0x33]
            this.MenuGameMode = process.readPointer(baseAddr - 0x33);

            // [[Beatmap] + 0x6C]
            const newMD5 = process.readSharpString(
                process.readInt(beatmapAddr + 0x6c)
            );

            // [[Beatmap] + 0x90]
            const newPath = process.readSharpString(
                process.readInt(beatmapAddr + 0x90)
            );

            if (newMD5 === this.previousMD5 || !newPath.endsWith('.osu')) {
                return;
            }

            if (
                this.pendingMD5 !== newMD5 &&
                (this.game.isTourneySpectator || this.game.isTourneyManager)
            ) {
                this.mapChangeTime = performance.now();
                this.pendingMD5 = newMD5;

                return;
            }

            if (
                performance.now() - this.mapChangeTime < NEW_MAP_COMMIT_DELAY &&
                (this.game.isTourneySpectator || this.game.isTourneyManager)
            ) {
                return;
            }

            // MD5 hasn't changed in over NEW_MAP_COMMIT_DELAY, commit to new map
            this.MD5 = newMD5;
            this.Path = newPath;

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
            const { process, memory } = this.game.getServices([
                'process',
                'memory'
            ]);

            // [[GetAudioLength + 0x7] + 0x4]
            this.MP3Length = Math.round(
                process.readDouble(
                    process.readPointer(
                        memory.getPattern('getAudioLengthPtr')
                    ) + 0x4
                )
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
