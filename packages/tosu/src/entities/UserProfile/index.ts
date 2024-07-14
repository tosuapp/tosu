import { wLogger } from '@tosu/common';

import { AbstractEntity } from '@/entities/AbstractEntity';

export class UserProfile extends AbstractEntity {
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
            const { patterns, process } = this.osuInstance.getServices([
                'patterns',
                'process'
            ]);

            const s1 = performance.now();
            const profileBase = process.readPointer(
                patterns.getPattern('userProfilePtr')
            );

            const s2 = performance.now();
            this.rawLoginStatus = process.readPointer(
                patterns.getPattern('rawLoginStatusPtr')
            );
            const s3 = performance.now();
            this.rawBanchoStatus = process.readByte(profileBase + 0x88);

            const s4 = performance.now();
            this.name = process.readSharpString(
                process.readInt(profileBase + 0x30)
            );

            const s5 = performance.now();
            this.accuracy = process.readDouble(profileBase + 0x4);

            const s6 = performance.now();
            this.rankedScore = process.readLong(profileBase + 0xc);

            const s7 = performance.now();
            this.id = process.readInt(profileBase + 0x70);

            const s8 = performance.now();
            this.level = process.readFloat(profileBase + 0x74);

            const s9 = performance.now();
            this.playCount = process.readInt(profileBase + 0x7c);

            const s10 = performance.now();
            this.playMode = process.readInt(profileBase + 0x80);

            const s11 = performance.now();
            this.rank = process.readInt(profileBase + 0x84);

            const s12 = performance.now();
            this.countryCode = process.readInt(profileBase + 0x98);

            const s13 = performance.now();
            this.performancePoints = process.readShort(profileBase + 0x9c);
            // ARGB, to convert use UserProfile.backgroundColour.toString(16)

            const s14 = performance.now();
            this.backgroundColour = process.readUInt(profileBase + 0xac);

            const s15 = performance.now();
            wLogger.timings(
                'UserProfile/updateState',
                {
                    total: s15 - s1,
                    base: s2 - s1,
                    loginstatus: s3 - s2,
                    banchostatus: s4 - s3,
                    name: s5 - s4,
                    accuracy: s6 - s5,
                    rankedscore: s7 - s6,
                    id: s8 - s7,
                    level: s9 - s8,
                    playcount: s10 - s9,
                    playmode: s11 - s10,
                    rank: s12 - s11,
                    countrycode: s13 - s12,
                    pp: s14 - s13,
                    colour: s15 - s14
                },
                performance.now()
            );

            this.resetReportCount('UP(updateState)');
        } catch (exc) {
            this.reportError(
                'UP(updateState)',
                10,
                `UP(updateState) ${(exc as any).message}`
            );
            wLogger.debug(exc);
        }
    }
}
