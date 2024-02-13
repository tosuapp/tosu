import { sleep } from '@tosu/common';
import { process_by_name } from '@tosu/find-process';

import { OsuInstance } from './osuInstance';

export const OSU_REGEX = /.*osu!\.exe.*/g;

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

    private lookupProcess() {
        const osuProcess = process_by_name('osu!.exe');
        if (osuProcess == null || osuProcess?.pid == null) {
            return null;
        }

        if (osuProcess.pid in this.osuInstances) {
            return 'old';
        }

        const osuInstance = new OsuInstance(osuProcess.pid);
        if (osuProcess.cmd.includes('-spectateclient')) {
            osuInstance.setIsTourneySpectator(true);
        }

        osuInstance.emitter.on('onDestroy', this.onProcessDestroy.bind(this));
        osuInstance.emitter.on(
            'onResolveFailed',
            this.onProcessDestroy.bind(this)
        );

        this.osuInstances[osuProcess.pid] = osuInstance;
        osuInstance.start();

        return osuProcess.pid;
    }

    async runWatcher() {
        while (true) {
            this.lookupProcess();
            await sleep(5000);
        }
    }
}
