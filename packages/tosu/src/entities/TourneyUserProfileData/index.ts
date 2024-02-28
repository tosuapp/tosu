import { wLogger } from '@tosu/common';

import { DataRepo } from '@/entities/DataRepoList';

import { AbstractEntity } from '../AbstractEntity';

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

        const { process, patterns } = this.services.getServices([
            'process',
            'patterns'
        ]);

        if (!this.UserInfoBase) {
            this.UserInfoBase = process.readPointer(
                patterns.getPattern('spectatingUserPtr')
            );
            wLogger.debug('[TUPD] Slot is not equiped');
            return;
        }

        try {
            // UserDrawable + 0x4
            this.Accuracy = process.readDouble(this.UserInfoBase + 0x4);
            // UserDrawable + 0xc
            this.RankedScore = process.readLong(this.UserInfoBase + 0xc);
            // UserDrawable + 0x7C
            this.PlayCount = process.readInt(this.UserInfoBase + 0x7c);
            // UserDrawable + 0x84
            this.GlobalRank = process.readInt(this.UserInfoBase + 0x84);
            // UserDrawable + 0x9C
            this.PP = process.readInt(this.UserInfoBase + 0x9c);
            // [UserDrawable + 0x30]
            this.Name = process.readSharpString(
                process.readInt(this.UserInfoBase + 0x30)
            );
            // [UserDrawable + 0x2C]
            this.Country = process.readSharpString(
                process.readInt(this.UserInfoBase + 0x2c)
            );
            // UserDrawable + 0x70
            this.UserID = process.readInt(this.UserInfoBase + 0x70);
        } catch (exc) {
            wLogger.error('[TourneyUserProfileData] signature failed');
            this.UserInfoBase = 0;
        }

        wLogger.debug(`[TourneyUserProfileData:updateState] updated`);
    }
}
