import { wLogger } from "@/logger";
import { DataRepo } from "@/Services/repo";

export class AllTimesData {
    services: DataRepo

    Status: number = 0;
    PlayTime: number = 0;
    MenuMods: number = 0;
    ChatStatus: number = 0;
    SkinFolder: string = "";
    ShowInterface: boolean = false;

    constructor(services: DataRepo) {
        this.services = services;
    }

    updateState() {
        const { process, bases } = this.services.getServices(["process", "bases"]);
        if (process === null) {
            throw new Error("Process not found")
        }
        if (bases === null) {
            throw new Error("Bases repo not found")
        }

        const {
            statusAddr,
            playTimeAddr,
            menuModsAddr,
            chatCheckerAddr,
            skinDataAddr,
            settingsClassAddr
        } = bases.bases

        // [Status - 0x4]
        this.Status = process.readPointer(statusAddr - 0x4)
        // [PlayTime + 0x5]
        this.PlayTime = process.readInt(process.readInt(playTimeAddr + 0x5))
        // [MenuMods + 0x9]
        this.MenuMods = process.readInt(process.readInt(menuModsAddr + 0x9)),
        // ChatChecker - 0x20
        this.ChatStatus = process.readByte(chatCheckerAddr - 0x20),
        // [[[SkinData + 4] + 0] + 68]
        this.SkinFolder = process.readSharpString(
             process.readInt(
                 process.readPointer(
                    skinDataAddr + 4
                 ) + 68
             )
         ),
         // [[SettingsClass + 0x8] + 0x4] + 0xC
        this.ShowInterface = Boolean(process.readByte(process.readInt(process.readInt(settingsClassAddr + 0x8) + 0x4) + 0xC))

        wLogger.debug("State: AllTimesData updated")
    }
}