import { wLogger } from '@tosu/common';

import { AbstractEntity } from '@/entities/AbstractEntity';

// NOTE: NOT AVAILABLE IN TOURNAMENT MODE!!!!
const GAME_TIME_PTR = {
    pattern: '8B 35 ?? ?? ?? ?? 8B C6 B9',
    offset: 0x2
};

export class AllTimesData extends AbstractEntity {
    gameTimePtr: number = 0;

    IsWatchingReplay: number = 0;
    ShowInterface: boolean = false;

    ChatStatus: number = 0;
    Status: number = 0;

    GameTime: number = 0;
    PlayTime: number = 0;
    MenuMods: number = 0;

    GameFolder: string = '';
    SkinFolder: string = '';
    SongsFolder: string = '';
    MemorySongsFolder: string = '';

    setGameFolder(value: string) {
        if (typeof value !== 'string') return;

        this.GameFolder = value;
    }

    setSongsFolder(value: string) {
        if (typeof value !== 'string') return;

        this.SongsFolder = value;
    }

    async updateState() {
        try {
            const { process, patterns } = this.osuInstance.getServices([
                'process',
                'patterns'
            ]);

            const {
                statusPtr,
                menuModsPtr,
                chatCheckerAddr,
                skinDataAddr,
                settingsClassAddr,
                canRunSlowlyAddr
            } = patterns.getPatterns([
                'statusPtr',
                'menuModsPtr',
                'chatCheckerAddr',
                'skinDataAddr',
                'settingsClassAddr',
                'canRunSlowlyAddr'
            ]);

            const s1 = performance.now();
            const skinOsuAddr = process.readInt(skinDataAddr + 0x7);
            if (skinOsuAddr === 0) {
                return;
            }

            const s2 = performance.now();
            const skinOsuBase = process.readInt(skinOsuAddr);

            // [Status - 0x4]
            const s3 = performance.now();
            this.Status = process.readPointer(statusPtr);

            // [MenuMods + 0x9]
            const s4 = performance.now();
            this.MenuMods = process.readPointer(menuModsPtr);
            // ChatChecker - 0x20

            const s5 = performance.now();
            this.ChatStatus = process.readByte(chatCheckerAddr - 0x20);

            const s6 = performance.now();
            this.SkinFolder = process.readSharpString(
                process.readInt(skinOsuBase + 0x44)
            );

            const s7 = performance.now();
            this.IsWatchingReplay = process.readByte(
                process.readInt(canRunSlowlyAddr + 0x46)
            );

            const s8 = performance.now();
            this.MemorySongsFolder = process.readSharpString(
                process.readInt(
                    process.readInt(
                        process.readInt(settingsClassAddr + 0x8) + 0xb8
                    ) + 0x4
                )
            );

            // [[SettingsClass + 0x8] + 0x4] + 0xC
            const s9 = performance.now();
            this.ShowInterface = Boolean(
                process.readByte(
                    process.readInt(
                        process.readInt(settingsClassAddr + 0x8) + 0x4
                    ) + 0xc
                )
            );

            const s10 = performance.now();
            if (
                !this.osuInstance.isTourneyManager &&
                !this.osuInstance.isTourneySpectator
            ) {
                if (this.gameTimePtr === 0) {
                    this.gameTimePtr = await process.scanAsync(
                        GAME_TIME_PTR.pattern,
                        true
                    );
                    wLogger.debug('ATD(updateState) gameTimePtr area found');
                    return;
                } else {
                    this.GameTime = process.readPointer(
                        this.gameTimePtr + GAME_TIME_PTR.offset
                    );
                }
            }

            const s11 = performance.now();
            wLogger.timings(
                'AllTimesData/updateState',
                {
                    total: s11 - s1,
                    gameTimePtr: s11 - s10,
                    showInterface: s10 - s9,
                    songsFolder: s9 - s8,
                    isWatchingReplay: s8 - s7,
                    skinFolder: s7 - s6,
                    chatStatus: s6 - s5,
                    menuMods: s5 - s4,
                    status: s4 - s3,
                    skinBase: s3 - s2,
                    skinAddr: s2 - s1
                },
                performance.now()
            );

            this.resetReportCount('ATD(updateState)');
        } catch (exc) {
            this.reportError(
                'ATD(updateState)',
                10,
                `ATD(updateState) ${(exc as any).message}`
            );
            wLogger.debug(exc);
        }
    }

    updatePreciseState() {
        try {
            const s1 = performance.now();
            const { process, patterns } = this.osuInstance.getServices([
                'process',
                'patterns'
            ]);

            const { playTimeAddr } = patterns.getPatterns(['playTimeAddr']);

            // [PlayTime + 0x5]
            const s2 = performance.now();
            this.PlayTime = process.readInt(
                process.readInt(playTimeAddr + 0x5)
            );

            const s3 = performance.now();
            wLogger.timings(
                'AllTimesData/updatePreciseState',
                {
                    total: s3 - s1,
                    time: s3 - s2,
                    s: s2 - s1
                },
                performance.now()
            );
            this.resetReportCount('ATD(updatePreciseState)');
        } catch (exc) {
            this.reportError(
                'ATD(updatePreciseState)',
                10,
                `ATD(updatePreciseState) ${(exc as any).message}`
            );
            wLogger.debug(exc);
        }
    }
}
