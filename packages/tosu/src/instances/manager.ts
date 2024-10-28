import { argumetsParser, wLogger } from '@tosu/common';
import { Process } from 'tsprocess/dist/process';

import { AbstractInstance } from '@/instances';

import { LazerInstance } from './lazerInstance';
import { OsuInstance } from './osuInstance';

export class InstanceManager {
    osuInstances: {
        [key: number]: AbstractInstance;
    };

    constructor() {
        this.osuInstances = {};

        this.runWatcher = this.runWatcher.bind(this);
    }

    /**
     * Gets a regular instance if osu running in normal mode, else gets tournament manager
     */
    public getInstance() {
        if (Object.keys(this.osuInstances).length === 0) return;

        for (const key in this.osuInstances) {
            if (this.osuInstances[key].isTourneyManager) {
                return this.osuInstances[key];
            }
        }
        return Object.values(this.osuInstances)[0];
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
            let osuProcesses = Process.findProcesses('osu!.exe');

            let lazerOnLinux = false;

            if (osuProcesses.length === 0 && process.platform === 'linux') {
                osuProcesses = Process.findProcesses('osu!');

                lazerOnLinux = true;
            }

            for (const processId of osuProcesses || []) {
                if (processId in this.osuInstances) {
                    // dont deploy not needed instances
                    continue;
                }

                const isLazer =
                    Process.isProcess64bit(processId) || lazerOnLinux;

                const osuInstance = isLazer
                    ? new LazerInstance(processId)
                    : new OsuInstance(processId);
                const cmdLine = osuInstance.process.getProcessCommandLine();

                const args = argumetsParser(cmdLine);
                if (args.tournament !== null && args.tournament !== undefined) {
                    // skip the lazer tournament client
                    continue;
                }

                if (!isNaN(parseFloat(args.spectateclient))) {
                    osuInstance.setTourneyIpcId(args.spectateclient);
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
        } catch (exc) {
            wLogger.error('InstanceManager', (exc as any).message);
            wLogger.debug(exc);
        }
    }

    runWatcher() {
        this.handleProcesses();

        setTimeout(this.runWatcher, 1000);
    }
}
