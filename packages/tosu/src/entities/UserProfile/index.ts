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

            const profileBase = process.readPointer(
                patterns.getPattern('userProfilePtr')
            );

            this.rawLoginStatus = process.readPointer(
                patterns.getPattern('rawLoginStatusPtr')
            );
            this.rawBanchoStatus = process.readByte(profileBase + 0x88);

            this.name = process.readSharpString(
                process.readInt(profileBase + 0x30)
            );
            this.accuracy = process.readDouble(profileBase + 0x4);
            this.rankedScore = process.readLong(profileBase + 0xc);
            this.id = process.readInt(profileBase + 0x70);
            this.level = process.readFloat(profileBase + 0x74);
            this.playCount = process.readInt(profileBase + 0x7c);
            this.playMode = process.readInt(profileBase + 0x80);
            this.rank = process.readInt(profileBase + 0x84);
            this.countryCode = process.readInt(profileBase + 0x98);
            this.performancePoints = process.readShort(profileBase + 0x9c);
            // ARGB, to convert use UserProfile.backgroundColour.toString(16)
            this.backgroundColour = process.readUInt(profileBase + 0xac);
        } catch (exc) {
            wLogger.error(`UP(updateState) ${(exc as any).message}`);
            wLogger.debug(exc);
        }
    }
}
