import { DataRepo } from '@/entities/DataRepoList';
import { wLogger } from '@/logger';

import { AbstractEntity } from '../AbstractEntity';

export class AllTimesData extends AbstractEntity {
    Status: number = 0;
    PlayTime: number = 0;
    MenuMods: number = 0;
    ChatStatus: number = 0;
    SkinFolder: string = '';
    SongsFolder: string = '';
    ShowInterface: boolean = false;
    IsWatchingReplay: number = 0;

    constructor(services: DataRepo) {
        super(services);
    }

    async updateState() {
        wLogger.debug(`[AllTimesData:updateState] starting`);

        const { process, bases, settings } = this.services.getServices([
            'process',
            'bases',
            'settings'
        ]);
        if (process === null) {
            throw new Error('Process not found');
        }
        if (bases === null) {
            throw new Error('Bases repo not found');
        }
        if (settings === null) {
            throw new Error('Settings repo not found');
        }

        const {
            statusAddr,
            playTimeAddr,
            menuModsAddr,
            chatCheckerAddr,
            skinDataAddr,
            settingsClassAddr,
            canRunSlowlyAddr
        } = bases.bases;

        // [Status - 0x4]
        this.Status = process.readPointer(statusAddr - 0x4);
        // [PlayTime + 0x5]
        this.PlayTime = process.readInt(process.readInt(playTimeAddr + 0x5));
        // [MenuMods + 0x9]
        this.MenuMods = process.readInt(process.readInt(menuModsAddr + 0x9));
        // ChatChecker - 0x20
        this.ChatStatus = process.readByte(chatCheckerAddr - 0x20);
        // [[[SkinData + 4] + 0] + 68]
        this.SkinFolder = process.readSharpString(
            process.readInt(process.readPointer(skinDataAddr + 4) + 68)
        );
        // [[SettingsClass + 0x8] + 0x4] + 0xC
        this.ShowInterface = Boolean(
            process.readByte(
                process.readInt(
                    process.readInt(settingsClassAddr + 0x8) + 0x4
                ) + 0xc
            )
        );
        this.SongsFolder = process.readSharpString(
            process.readInt(
                process.readInt(
                    process.readInt(settingsClassAddr + 0x8) + 0xb8
                ) + 0x4
            )
        );

        this.IsWatchingReplay = process.readByte(
            process.readInt(canRunSlowlyAddr + 0x46)
        );

        wLogger.debug(`[MenuData:updateState] updated`);
        settings.setSkinFolder(this.SkinFolder);
        settings.setShowInterface(this.ShowInterface);
    }
}
