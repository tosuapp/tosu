import { DataRepo } from '../repo';

export abstract class AbstractEntity {
    services: DataRepo;

    constructor(services: DataRepo) {
        this.services = services;
    }

    async updateState() {
        throw Error('Error: updateState not implemented');
    }
}
