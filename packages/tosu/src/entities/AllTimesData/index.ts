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

            const skinOsuAddr = process.readInt(skinDataAddr + 0x7);
            if (skinOsuAddr === 0) {
                return;
            }
            const skinOsuBase = process.readInt(skinOsuAddr);

            // [Status - 0x4]
            this.Status = process.readPointer(statusPtr);
            // [MenuMods + 0x9]
            this.MenuMods = process.readPointer(menuModsPtr);
            // ChatChecker - 0x20
            this.ChatStatus = process.readByte(chatCheckerAddr - 0x20);
            this.SkinFolder = process.readSharpString(
                process.readInt(skinOsuBase + 0x44)
            );
            this.IsWatchingReplay = process.readByte(
                process.readInt(canRunSlowlyAddr + 0x46)
            );
            this.MemorySongsFolder = process.readSharpString(
                process.readInt(
                    process.readInt(
                        process.readInt(settingsClassAddr + 0x8) + 0xb8
                    ) + 0x4
                )
            );

            // [[SettingsClass + 0x8] + 0x4] + 0xC
            this.ShowInterface = Boolean(
                process.readByte(
                    process.readInt(
                        process.readInt(settingsClassAddr + 0x8) + 0x4
                    ) + 0xc
                )
            );

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
            const { process, patterns } = this.osuInstance.getServices([
                'process',
                'patterns'
            ]);

            const { playTimeAddr } = patterns.getPatterns(['playTimeAddr']);

            // [PlayTime + 0x5]
            this.PlayTime = process.readInt(
                process.readInt(playTimeAddr + 0x5)
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
