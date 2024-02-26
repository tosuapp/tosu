import { wLogger } from '@tosu/common';

import { DataRepo } from '@/entities/DataRepoList';

import { AbstractEntity } from '../AbstractEntity';

// GameBase -> StreamingManager.CurrentlySpectating
const TOURNEY_PROFILE_BASE = '8B 0D ?? ?? ?? ?? 85 C0 74 05 8B 50 30'; // -0x4

export class TourneyUserProfileData extends AbstractEntity {
    UserInfoBase: number = 0;

    Accuracy: number = 0.0;
    RankedScore: number = 0;
    PlayCount: number = 0;
    GlobalRank: number = 0;
    PP: number = 0;
    Name: string = '';
    Country: string = '';
    UserID: number = 0;

    constructor(services: DataRepo) {
        super(services);
    }

    async updateState() {
        wLogger.debug(`[TourneyUserProfileData:updateState] starting`);

        const { process } = this.services.getServices(['process']);

        if (!this.UserInfoBase) {
            const tourneyProfileBase = process.scanSync(
                TOURNEY_PROFILE_BASE,
                true
            );
            this.UserInfoBase = process.readPointer(tourneyProfileBase - 0x4);
            wLogger.debug('[TUPD] Slot is not equiped');
            return;
        }

        try {
            // [[UserInfo - 0x5]] + 0x4
            this.Accuracy = process.readDouble(this.UserInfoBase + 0x4);
            // [[UserInfo - 0x5]] + UserInfoAddr
            this.RankedScore = process.readLong(this.UserInfoBase + 0xc);
            // [[UserInfo - 0x5]] + 0x7C
            this.PlayCount = process.readInt(this.UserInfoBase + 0x7c);
            // [[UserInfo - 0x5]] + 0x84
            this.GlobalRank = process.readInt(this.UserInfoBase + 0x84);
            // [[UserInfo - 0x5]] + 0x9C
            this.PP = process.readInt(this.UserInfoBase + 0x9c);
            // [[[UserInfo - 0x5]] + 0x30]
            this.Name = process.readSharpString(
                process.readInt(this.UserInfoBase + 0x30)
            );
            // [[[UserInfo - 0x5]] + 0x2C]
            this.Country = process.readSharpString(
                process.readInt(this.UserInfoBase + 0x2c)
            );
            // [[UserInfo - 0x5]] + 0x70
            this.UserID = process.readInt(this.UserInfoBase + 0x70);
        } catch (exc) {
            wLogger.error('[TourneyUserProfileData] signature failed');
            this.UserInfoBase = 0;
        }

        wLogger.debug(`[TourneyUserProfileData:updateState] updated`);
    }
}
