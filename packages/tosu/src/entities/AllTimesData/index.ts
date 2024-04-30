import { wLogger } from '@tosu/common';

import { AbstractEntity } from '../AbstractEntity';

export class AllTimesData extends AbstractEntity {
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
        this.GameFolder = value;
    }

    setSongsFolder(value: string) {
        this.SongsFolder = value;
    }

    updateState() {
        try {
            const { process, patterns } = this.services.getServices([
                'process',
                'patterns'
            ]);

            const {
                statusPtr,
                playTimeAddr,
                menuModsPtr,
                chatCheckerAddr,
                skinDataAddr,
                settingsClassAddr,
                canRunSlowlyAddr
                // gameTimePtr,
            } = patterns.getPatterns([
                'statusPtr',
                'playTimeAddr',
                'menuModsPtr',
                'chatCheckerAddr',
                'skinDataAddr',
                'settingsClassAddr',
                'canRunSlowlyAddr'
                // 'gameTimePtr',
            ]);

            const skinOsuAddr = process.readInt(skinDataAddr + 0x7);
            if (skinOsuAddr === 0) {
                return;
            }
            const skinOsuBase = process.readInt(skinOsuAddr);

            // [Status - 0x4]
            this.Status = process.readPointer(statusPtr);
            // [PlayTime + 0x5]
            this.PlayTime = process.readInt(
                process.readInt(playTimeAddr + 0x5)
            );
            // this.GameTime = process.readPointer(gameTimePtr);
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
        } catch (exc) {
            wLogger.error(`ATD(updateState) ${(exc as any).message}`);
            wLogger.debug(exc);
        }
    }
}
