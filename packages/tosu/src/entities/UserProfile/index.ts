import { AbstractEntity } from '../AbstractEntity';
import { DataRepo } from '../DataRepoList';

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
    isConnected: boolean;
    backgroundColour: number;

    constructor(services: DataRepo) {
        super(services);
    }

    async updateState() {
        const { bases, process } = this.services.getServices([
            'bases',
            'process'
        ]);

        const profileBase = process.readPointer(
            bases.getBase('userProfileAddr') + 0x1
        );

        this.isConnected = Boolean(process.readByte(profileBase + 0xa8));
        if (!this.isConnected) {
            return;
        }

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
    }
}
