import { OsuInstance } from '@/objects/instanceManager/osuInstance';

export abstract class AbstractEntity {
    osuInstance: OsuInstance;

    constructor(osuInstance: OsuInstance) {
        this.osuInstance = osuInstance;
    }

    updateState() {
        throw Error('Error: updateState not implemented');
    }
}
