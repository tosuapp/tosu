import { OsuInstance } from '@/Instances/Osu';

export interface ContextMap {
	osuInstances: OsuInstance[];
}

export class Context {
	list: Partial<ContextMap> = {};

	/**
	 * Sets service instance
	 */
	set<TName extends keyof ContextMap>(
		serviceName: TName,
		instance: ContextMap[TName]
	): void {
		this.list[serviceName] = instance;
	}

	/**
	 * Returns requested service, otherwise returns null
	 */
	get<TName extends keyof ContextMap>(serviceName: TName): ContextMap[TName] | null {
		let instance = this.list[serviceName];
		if (!instance) {
			return null;
		}

		return instance;
	}
}
