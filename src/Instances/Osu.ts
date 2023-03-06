import { wLogger } from "@/logger";
import { Process } from "@/Memory/process";
import { Bases } from "@/Services/Bases";
import { AllTimesData } from "@/Services/Entities/AllTimesData";
import { BeatmapData } from "@/Services/Entities/BeatmapData";
import { MenuData } from "@/Services/Entities/MenuData";
import { DataRepo } from "@/Services/repo";
import { sleep } from "@/Utils/sleep";
import findProcess from "find-process";

const SCAN_PATTERNS = {
    Base: "F8 01 74 04 83 65",                                        //-0xC
    InMenuMods: "C8 FF 00 00 00 00 00 81 0D 00 00 00 00 00 08 00 00", //+0x9
    PlayTime: "5E 5F 5D C3 A1 ?? ?? ?? ?? 89 ?? 04",                  //+0x5
    PlayContainer: "85 C9 74 1F 8D 55 F0 8B 01",
    LeaderBoard: "A1 ?? ?? ?? ?? 8B 50 04 8B 0D",                     //+0x1
    SongsFolder: "?? ?? 67 ?? 2F 00 28 00",
    ChatChecker: "0A D7 23 3C 00 00 ?? 01",                           //-0x20 (value)
    Status: "48 83 F8 04 73 1E",
    SkinData: "75 21 8B 1D",
    SettingsClass: "83 E0 20 85 C0 7E 2F"
}

export class OsuInstance {
    servicesRepo: DataRepo;
    
    pid: number;
    process: Process;

    isReady: boolean;
    isDestroyed: boolean = false;

    constructor(pid: number) {
        this.pid = pid;
        this.servicesRepo = new DataRepo();

        this.process = new Process(this.pid);

        this.servicesRepo.set("process", this.process);
        this.servicesRepo.set("bases", new Bases(this.servicesRepo))
        this.servicesRepo.set("allTimesData", new AllTimesData(this.servicesRepo));
        this.servicesRepo.set("beatmapData", new BeatmapData(this.servicesRepo));
        this.servicesRepo.set("menuData", new MenuData(this.servicesRepo));
    }

    onDestroy() {
        wLogger.info(`osu!.exe at ${this.pid} got destroyed`)
    }

    async start() {
        wLogger.info(`RESOLVING PATTERNS FOR ${this.pid}`)
        while (!this.isReady) {
            const processes = await findProcess("pid", this.pid)
            if (processes.length < 1) {
                wLogger.info("We have lost osu! process");
                this.onDestroy();
                break;
            }

            const basesRepo = this.servicesRepo.get("bases");
            if (!basesRepo) {
                throw new Error("Bases repo not initialized, missed somewhere?")
            }

            try {
                basesRepo.setBase("baseAddr", this.process.scanSync(SCAN_PATTERNS.Base))
                basesRepo.setBase("chatCheckerAddr", this.process.scanSync(SCAN_PATTERNS.ChatChecker))
                basesRepo.setBase("menuModsAddr", this.process.scanSync(SCAN_PATTERNS.InMenuMods))
                basesRepo.setBase("playTimeAddr", this.process.scanSync(SCAN_PATTERNS.PlayTime))
                basesRepo.setBase("settingsClassAddr", this.process.scanSync(SCAN_PATTERNS.SettingsClass))
                basesRepo.setBase("statusAddr", this.process.scanSync(SCAN_PATTERNS.Status))
                basesRepo.setBase("skinDataAddr", this.process.scanSync(SCAN_PATTERNS.SkinData))

                if (!basesRepo.checkIsBasesValid()) {
                    wLogger.info("PATTERN RESOLVING FAILED, TRYING AGAIN....")
                    continue;
                }

                wLogger.info("ALL PATTERNS ARE RESOLVED, STARTING WATCHING THE DATA")
                this.isReady = true;
                break;
            } catch (exc) {
                console.log(exc)
                wLogger.error("PATTERN SCANNING FAILED, TRYING ONE MORE TIME...")
            }
        }

        this.update();
    }

    async update() {
        const {
            allTimesData,
            menuData
        } = this.servicesRepo.getServices(["allTimesData", "menuData"])

        if (!allTimesData || !menuData) {
            throw new Error("repo: allTimesData/menuData not found")
        }

        while (true) {
            allTimesData.updateState()
            menuData.updateState()
            await sleep(150);
        }
    }
}