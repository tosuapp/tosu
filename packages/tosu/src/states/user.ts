import { wLogger } from '@tosu/common';

import { AbstractState } from '@/states';

export class User extends AbstractState {
    name: string;
    accuracy: number;
    rankedScore: number;
    id: number;
    level: number;
    playCount: number;
    playMode: number;
    rank: number;
    countryCode: number;
    performancePoints: number;
    rawBanchoStatus: number;
    backgroundColour: number;
    rawLoginStatus: number;

    updateState() {
        try {
            const profile = this.game.memory.user();
            if (profile instanceof Error) throw profile;

            this.name = profile.name;
            this.accuracy = profile.accuracy;
            this.rankedScore = profile.rankedScore;
            this.id = profile.id;
            this.level = profile.level;
            this.playCount = profile.playCount;
            this.playMode = profile.playMode;
            this.rank = profile.rank;
            this.countryCode = profile.countryCode;
            this.performancePoints = profile.performancePoints;
            this.rawBanchoStatus = profile.rawBanchoStatus;
            this.backgroundColour = profile.backgroundColour;
            this.rawLoginStatus = profile.rawLoginStatus;

            this.resetReportCount('User(updateState)');
        } catch (exc) {
            this.reportError(
                'User(updateState)',
                10,
                `User(updateState) ${(exc as any).message}`
            );
            wLogger.debug(exc);
        }
    }
}
