import { wLogger } from '@tosu/common';

import { AbstractEntity } from '../AbstractEntity';

export class TourneyUserProfileData extends AbstractEntity {
    isDefaultState: boolean = true;

    Accuracy: number = 0.0;
    RankedScore: number = 0;
    PlayCount: number = 0;
    GlobalRank: number = 0;
    PP: number = 0;
    Name: string = '';
    Country: string = '';
    UserID: number = 0;

    resetState() {
        if (this.isDefaultState) {
            return;
        }

        this.isDefaultState = true;
        this.Accuracy = 0.0;
        this.RankedScore = 0;
        this.PlayCount = 0;
        this.GlobalRank = 0;
        this.PP = 0;
        this.Name = '';
        this.Country = '';
        this.UserID = 0;
    }

    updateState() {
        wLogger.debug('TUPD(updateState) Starting');

        const { process, gamePlayData, patterns } = this.services.getServices([
            'process',
            'gamePlayData',
            'patterns'
        ]);

        const spectatingUserDrawable = process.readPointer(
            patterns.getPattern('spectatingUserPtr')
        );
        if (!spectatingUserDrawable) {
            wLogger.debug('TUPD(updateState) Slot is not equiped');
            this.resetState();
            gamePlayData.init();
            return;
        }

        try {
            // UserDrawable + 0x4
            this.Accuracy = process.readDouble(spectatingUserDrawable + 0x4);
            // UserDrawable + 0xc
            this.RankedScore = process.readLong(spectatingUserDrawable + 0xc);
            // UserDrawable + 0x7C
            this.PlayCount = process.readInt(spectatingUserDrawable + 0x7c);
            // UserDrawable + 0x84
            this.GlobalRank = process.readInt(spectatingUserDrawable + 0x84);
            // UserDrawable + 0x9C
            this.PP = process.readInt(spectatingUserDrawable + 0x9c);
            // [UserDrawable + 0x30]
            this.Name = process.readSharpString(
                process.readInt(spectatingUserDrawable + 0x30)
            );
            // [UserDrawable + 0x2C]
            this.Country = process.readSharpString(
                process.readInt(spectatingUserDrawable + 0x2c)
            );
            // UserDrawable + 0x70
            this.UserID = process.readInt(spectatingUserDrawable + 0x70);

            this.isDefaultState = false;
        } catch (exc) {
            wLogger.error('TUPD(updateState) signature failed');
            wLogger.debug(exc);
        }

        wLogger.debug('TUPD(updateState) updated');
    }
}
