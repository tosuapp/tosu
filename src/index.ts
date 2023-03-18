import findProcess from "find-process";
import { OSU_REGEX } from "./constants";
import { OsuInstance } from "./Instances/Osu";
import { wLogger } from "./logger"
import Koa from 'koa';
import Router from "@koa/router";

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

    const app = new Koa();
    const router = new Router();

    router.get('/json', (ctx, next) => {
        ctx.body = osuInstance.getState();
    });
    
    app
      .use(router.routes())
      .use(router.allowedMethods());

    app.listen(25050, "127.0.0.1")
})()