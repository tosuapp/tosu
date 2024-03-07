import { sleep, wLogger } from '@tosu/common';
import { Process } from 'tsprocess/dist/process';

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
            const osuProcesses = Process.findProcesses('osu!.exe');
            for (const processId of osuProcesses || []) {
                if (processId in this.osuInstances) {
                    // dont deploy not needed instances
                    continue;
                }

                const cmdLine = Process.getProcessCommandLine(processId);
                const osuInstance = new OsuInstance(processId);
                if (cmdLine.includes('-spectateclient')) {
                    const [_, ipcId] = cmdLine.split(' ');

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

                this.osuInstances[processId] = osuInstance;
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
