import { DataRepo } from '@/entities/DataRepoList';

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
        const { process, patterns, settings } = this.services.getServices([
            'process',
            'patterns',
            'settings'
        ]);

        const {
            statusPtr,
            playTimeAddr,
            menuModsPtr,
            chatCheckerAddr,
            skinDataAddr,
            settingsClassAddr,
            canRunSlowlyAddr
        } = patterns.getPatterns([
            'statusPtr',
            'playTimeAddr',
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
        // [PlayTime + 0x5]
        this.PlayTime = process.readInt(process.readInt(playTimeAddr + 0x5));
        // [MenuMods + 0x9]
        this.MenuMods = process.readPointer(menuModsPtr);
        // ChatChecker - 0x20
        this.ChatStatus = process.readByte(chatCheckerAddr - 0x20);
        this.SkinFolder = process.readSharpString(
            process.readInt(skinOsuBase + 0x44)
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

        settings.setShowInterface(this.ShowInterface);
    }
}
