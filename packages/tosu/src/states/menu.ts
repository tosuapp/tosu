import { wLogger } from '@tosu/common';

import { AbstractState } from '@/states';

export class Menu extends AbstractState {
    gamemode: number;
    plays: number;
    artist: string;
    artistOriginal: string;
    title: string;
    titleOriginal: string;
    ar: number;
    cs: number;
    hp: number;
    od: number;
    audioFilename: string;
    backgroundFilename: string;
    folder: string;
    creator: string;
    filename: string;
    difficulty: string;
    mapID: number;
    setID: number;
    rankedStatus: number;
    checksum: string;
    objectCount: number;
    mp3Length: number;

    previousMD5: string = '';
    pendingChecksum: string = '';
    mapChangeTime: number = 0;

    tested = false;
    updateState() {
        try {
            const result = this.game.memory.menu(this.previousMD5);
            if (result instanceof Error) throw result;
            if (typeof result === 'string') {
                if (result === '') return;

                wLogger.debug(`MD(updateState) ${result}`);
                return 'not-ready';
            }

            // update gamemoe in menu, even if beatmap is the same
            this.gamemode = result.gamemode;

            if (
                this.pendingChecksum !== result.checksum &&
                (this.game.isTourneySpectator || this.game.isTourneyManager)
            ) {
                this.mapChangeTime = performance.now();
                this.pendingChecksum = result.checksum;

                return;
            }

            // delay in milliseconds. 500ms has been enough to eliminate spurious map ID changes in the tournament client
            // over two weeks of testing at 4WC
            if (
                performance.now() - this.mapChangeTime < 500 &&
                (this.game.isTourneySpectator || this.game.isTourneyManager)
            ) {
                return;
            }

            // MD5 hasn't changed in over NEW_MAP_COMMIT_DELAY, commit to new map
            this.checksum = result.checksum;
            this.filename = result.filename;

            this.plays = result.plays;
            this.artist = result.artist;
            this.artistOriginal = result.artistOriginal;
            this.title = result.title;
            this.titleOriginal = result.titleOriginal;

            this.ar = result.ar;
            this.cs = result.cs;
            this.hp = result.hp;
            this.od = result.od;
            this.audioFilename = result.audioFilename;
            this.backgroundFilename = result.backgroundFilename;
            this.folder = result.folder;
            this.creator = result.creator;
            this.difficulty = result.difficulty;
            this.mapID = result.mapID;
            this.setID = result.setID;
            this.rankedStatus = result.rankedStatus;
            this.objectCount = result.objectCount;

            this.previousMD5 = this.checksum;

            console.log(result);

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
            const result = this.game.memory.mp3Length();
            if (result instanceof Error) throw result;
            if (typeof result === 'string') {
                if (result === '') return;

                wLogger.debug(`MD(updateState) ${result}`);
                return 'not-ready';
            }

            this.mp3Length = result;
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
