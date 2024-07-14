import { wLogger } from '@tosu/common';

import { AbstractEntity } from '@/entities/AbstractEntity';

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

        const { process, gamePlayData, patterns } =
            this.osuInstance.getServices([
                'process',
                'gamePlayData',
                'patterns'
            ]);

        const s1 = performance.now();
        const spectatingUserDrawable = process.readPointer(
            patterns.getPattern('spectatingUserPtr')
        );
        if (!spectatingUserDrawable) {
            wLogger.debug('TUPD(updateState) Slot is not equiped');

            this.resetState();
            gamePlayData.init(undefined, 'tourney');
            return;
        }

        const s2 = performance.now();
        this.resetReportCount('TUPD(updateState) Slot');

        try {
            // UserDrawable + 0x4
            const s3 = performance.now();
            this.Accuracy = process.readDouble(spectatingUserDrawable + 0x4);

            // UserDrawable + 0xc
            const s4 = performance.now();
            this.RankedScore = process.readLong(spectatingUserDrawable + 0xc);

            // UserDrawable + 0x7C
            const s5 = performance.now();
            this.PlayCount = process.readInt(spectatingUserDrawable + 0x7c);

            // UserDrawable + 0x84
            const s6 = performance.now();
            this.GlobalRank = process.readInt(spectatingUserDrawable + 0x84);

            // UserDrawable + 0x9C
            const s7 = performance.now();
            this.PP = process.readInt(spectatingUserDrawable + 0x9c);

            // [UserDrawable + 0x30]
            const s8 = performance.now();
            this.Name = process.readSharpString(
                process.readInt(spectatingUserDrawable + 0x30)
            );

            // [UserDrawable + 0x2C]
            const s9 = performance.now();
            this.Country = process.readSharpString(
                process.readInt(spectatingUserDrawable + 0x2c)
            );

            // UserDrawable + 0x70
            const s10 = performance.now();
            this.UserID = process.readInt(spectatingUserDrawable + 0x70);

            this.isDefaultState = false;

            const s11 = performance.now();
            wLogger.timings(
                'TourneyUserProfileData/updateState',
                {
                    total: s10 - s1,
                    drawable: s2 - s1,
                    accuracy: s4 - s3,
                    rankedscore: s5 - s4,
                    playcount: s6 - s5,
                    globalrank: s7 - s6,
                    pp: s8 - s7,
                    name: s9 - s8,
                    country: s10 - s9,
                    userid: s11 - s10
                },
                performance.now()
            );

            this.resetReportCount('TUPD(updateState)');
        } catch (exc) {
            this.reportError(
                'TUPD(updateState)',
                10,
                `TUPD(updateState) ${(exc as any).message}`
            );
            wLogger.debug(exc);
        }

        wLogger.debug('TUPD(updateState) updated');
    }
}
