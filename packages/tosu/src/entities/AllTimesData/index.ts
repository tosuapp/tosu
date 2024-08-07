import { wLogger } from '@tosu/common';

import { AbstractEntity } from '@/entities/AbstractEntity';

export class AllTimesData extends AbstractEntity {
    IsWatchingReplay: number = 0;
    isReplayUiHidden: boolean = false;
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
                chatCheckerPtr,
                skinDataAddr,
                settingsClassAddr,
                canRunSlowlyAddr,
                rulesetsAddr,
                gameTimePtr
            } = patterns.getPatterns([
                'statusPtr',
                'menuModsPtr',
                'chatCheckerPtr',
                'skinDataAddr',
                'settingsClassAddr',
                'canRunSlowlyAddr',
                'rulesetsAddr',
                'gameTimePtr'
            ]);

            // [Status - 0x4]
            this.Status = process.readPointer(statusPtr);
            // [MenuMods + 0x9]
            this.MenuMods = process.readPointer(menuModsPtr);
            // ChatChecker - 0x20
            this.ChatStatus = process.readByte(process.readInt(chatCheckerPtr));
            this.IsWatchingReplay = process.readByte(
                process.readInt(canRunSlowlyAddr + 0x46)
            );
            this.GameTime = process.readPointer(gameTimePtr);
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

            if (this.IsWatchingReplay) {
                const rulesetAddr = process.readInt(
                    process.readInt(rulesetsAddr - 0xb) + 0x4
                );
                if (rulesetAddr !== 0) {
                    // rulesetAddr mean ReplayWatcher... Sooo....
                    // Ruleset + 0x1d8
                    this.isReplayUiHidden = Boolean(
                        process.readByte(rulesetAddr + 0x1d8)
                    );
                } else {
                    this.isReplayUiHidden = false;
                }
            } else {
                this.isReplayUiHidden = false;
            }

            const skinOsuAddr = process.readInt(skinDataAddr + 0x7);
            if (skinOsuAddr !== 0) {
                const skinOsuBase = process.readInt(skinOsuAddr);

                this.SkinFolder = process.readSharpString(
                    process.readInt(skinOsuBase + 0x44)
                );
                return;
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
