import MemoryReader from '@/memoryReaders';
import { MemoryPatterns } from '@/objects/memoryPatterns';

import { AllTimesData } from './AllTimesData';
import { BassDensityData } from './BassDensityData';
import { BeatmapPPData } from './BeatmapPpData';
import { GamePlayData } from './GamePlayData';
import { MenuData } from './MenuData';
import { ResultsScreenData } from './ResultsScreenData';
import { Settings } from './Settings';
import { TourneyManagerData } from './TourneyManagerData';
import { TourneyUserProfileData } from './TourneyUserProfileData';
import { UserProfile } from './UserProfile';

export interface DataRepoList {
    process: MemoryReader;
    patterns: MemoryPatterns;

    settings: Settings;

    allTimesData: AllTimesData;
    beatmapPpData: BeatmapPPData;
    menuData: MenuData;
    bassDensityData: BassDensityData;
    gamePlayData: GamePlayData;
    resultsScreenData: ResultsScreenData;
    tourneyUserProfileData: TourneyUserProfileData;
    tourneyManagerData: TourneyManagerData;
    userProfile: UserProfile;
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
        const instance = this.list[serviceName];
        if (!instance) {
            return null;
        }

        return instance;
    }
}
