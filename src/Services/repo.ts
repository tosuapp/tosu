import { Process } from '@/Memory/process';

import { Bases } from './Bases';
import { AllTimesData } from './Entities/AllTimesData';
import { BassDensityData } from './Entities/BassDensityData';
import { BeatmapPPData } from './Entities/BeatmapPpData';
import { GamePlayData } from './Entities/GamePlayData';
import { MenuData } from './Entities/MenuData';
import { ResultsScreenData } from './Entities/ResultsScreenData';
import { Settings } from './Settings';

export interface DataRepoList {
    process: Process;
    bases: Bases;
    settings: Settings;
    allTimesData: AllTimesData;
    beatmapPpData: BeatmapPPData;
    menuData: MenuData;
    bassDensityData: BassDensityData;
    gamePlayData: GamePlayData;
    resultsScreenData: ResultsScreenData;
}

export class DataRepo {
    list: Partial<DataRepoList> = {};

    /**
     * Sets service instance
     */
    set<TName extends keyof DataRepoList>(
        serviceName: TName,
        instance: DataRepoList[TName]
    ): void {
        this.list[serviceName] = instance;
    }

    /**
     * Returns requested service, otherwise returns null
     */
    get<TName extends keyof DataRepoList>(
        serviceName: TName
    ): DataRepoList[TName] | null {
        let instance = this.list[serviceName];
        if (!instance) {
            return null;
        }

        return instance;
    }

    /**
     * Returns map of requested services\
     * Throws if any of requested services is not currently present
     */
    getServices<T extends (keyof DataRepoList)[]>(
        services: T
    ): Pick<DataRepoList, T[number]> | never {
        return services.reduce(
            (acc, item: keyof Pick<DataRepoList, T[number]>) => {
                const instance = this.get(item);
                if (!instance) {
                    throw new Error(
                        `Service "${item}" was not set in DataRepo list`
                    );
                }
                acc[item] = instance as never;
                return acc;
            },
            {} as Pick<DataRepoList, T[number]>
        );
    }
}
