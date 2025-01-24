import { ClientType, wLogger } from '@tosu/common';

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

    updateState() {
        try {
            const result = this.game.memory.menu(this.previousMD5);
            if (result instanceof Error) throw result;
            if (typeof result === 'string') {
                if (result === '') return;

                wLogger.debug(
                    ClientType[this.game.client],
                    this.game.pid,
                    `menu updateState`,
                    result
                );
                return 'not-ready';
            }
            if (result.type === 'checksum') {
                // update gamemoe in menu, even if beatmap is the same
                this.gamemode = result.gamemode;
                this.rankedStatus = result.rankedStatus;
                return;
            }

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

            this.gamemode = result.gamemode;

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

            this.resetReportCount('menu updateState');
        } catch (exc) {
            this.reportError(
                'menu updateState',
                10,
                ClientType[this.game.client],
                this.game.pid,
                `menu updateState`,
                (exc as any).message
            );
            wLogger.debug(
                ClientType[this.game.client],
                this.game.pid,
                `menu updateState`,
                exc
            );
        }
    }

    updateMP3Length() {
        try {
            const result = this.game.memory.mp3Length();
            if (result instanceof Error) throw result;
            if (typeof result === 'string') {
                if (result === '') return;

                wLogger.debug(
                    ClientType[this.game.client],
                    this.game.pid,
                    `menu updateMP3Length`,
                    result
                );

                return 'not-ready';
            }

            this.mp3Length = result;
            this.resetReportCount('menu updateMP3Length');
        } catch (exc) {
            this.reportError(
                'menu updateMP3Length',
                10,
                ClientType[this.game.client],
                this.game.pid,
                `menu updateMP3Length`,
                (exc as any).message
            );
            wLogger.debug(
                ClientType[this.game.client],
                this.game.pid,
                `menu updateMP3Length`,
                exc
            );
        }
    }
}
