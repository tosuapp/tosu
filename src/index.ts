import findProcess from "find-process";
import { OSU_REGEX } from "./constants";
import { OsuInstance } from "./Instances/Osu";
import { wLogger } from "./logger"

(async () => {
    wLogger.info("Starting tsosumemory");

    wLogger.info("Searching for osu!");
    let osuPid = 0;
    while (osuPid === 0) {
        const osuProcesses = await findProcess("name", OSU_REGEX)
        if (osuProcesses.length < 1) {
            wLogger.info("osu! not found, please start it... ")
            continue;
        }

        osuPid = osuProcesses[0].pid
        wLogger.info("osu! found!")
    }

    wLogger.info("Running memory chimera...")
    const osuInstance = new OsuInstance(osuPid);
    osuInstance.start()
})()