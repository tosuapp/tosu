import findProcess from 'find-process';

import { sleep } from '@/Utils/sleep';
import { OSU_REGEX } from '@/constants';

import { OsuInstance } from './Osu';

export class InstancesManager {
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

	async runWatcher() {
		while (true) {
			const osuProcesses = await findProcess('name', OSU_REGEX);
			for (const process of osuProcesses) {
				if (process.pid in this.osuInstances) {
					// dont deploy not needed instances
					continue;
				}

				const osuInstance = new OsuInstance(process.pid);
				osuInstance.emitter.on('onDestroy', this.onProcessDestroy.bind(this));
				osuInstance.emitter.on(
					'onResolveFailed',
					this.onProcessDestroy.bind(this)
				);

				this.osuInstances[process.pid] = osuInstance;
				osuInstance.start();
			}

			await sleep(5000);
		}
	}
}
