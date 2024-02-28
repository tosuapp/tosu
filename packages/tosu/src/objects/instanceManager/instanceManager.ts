import { sleep, wLogger } from '@tosu/common';
import { process_by_name } from '@tosu/find-process';

import { OsuInstance } from './osuInstance';

export class InstanceManager {
    osuInstances: {
        [key: number]: OsuInstance;
    };

    constructor() {
        this.osuInstances = {};
    }

    private onProcessDestroy(pid: number) {
        // FOOL PROTECTION
        if (!(pid in this.osuInstances)) {
            return;
        }

        delete this.osuInstances[pid];
    }

    private handleProcesses() {
        try {
            const osuProcesses = process_by_name('osu!.exe');
            for (const process of osuProcesses || []) {
                if (process.pid in this.osuInstances) {
                    // dont deploy not needed instances
                    continue;
                }

                const osuInstance = new OsuInstance(process.pid);
                if (process.cmd.includes('-spectateclient')) {
                    const [_, ipcId] = process.cmd.split(' ');

                    osuInstance.setTourneyIpcId(Number(ipcId));
                    osuInstance.setIsTourneySpectator(true);
                }

                osuInstance.emitter.on(
                    'onDestroy',
                    this.onProcessDestroy.bind(this)
                );
                osuInstance.emitter.on(
                    'onResolveFailed',
                    this.onProcessDestroy.bind(this)
                );

                this.osuInstances[process.pid] = osuInstance;
                osuInstance.start();
            }
        } catch (error) {
            wLogger.error(error);
        }
    }

    async runWatcher() {
        while (true) {
            this.handleProcesses();

            await sleep(5000);
        }
    }
}
