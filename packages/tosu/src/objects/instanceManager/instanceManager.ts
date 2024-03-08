import { sleep, wLogger } from '@tosu/common';
import { Process } from 'tsprocess/dist/process';

import { OsuInstance } from './osuInstance';

export class InstanceManager {
    osuInstances: {
        [key: number]: OsuInstance;
    };

    constructor() {
        this.osuInstances = {};

        this.runWatcher = this.runWatcher.bind(this);
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

                const osuInstance = new OsuInstance(processId);
                const cmdLine = osuInstance.process.getProcessCommandLine();
                if (cmdLine.includes('-spectateclient')) {
                    const [_, __, ipcId] = cmdLine.split(' ');

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
            wLogger.error('InstanceManager', (error as any).message);
            wLogger.debug(error);
        }
    }

    runWatcher() {
        this.handleProcesses();

        setTimeout(this.runWatcher, 5000);
    }
}
