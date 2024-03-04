import { DataRepo } from '../DataRepoList';

export abstract class AbstractEntity {
    services: DataRepo;

    constructor(services: DataRepo) {
        this.services = services;
    }

    updateState() {
        throw Error('Error: updateState not implemented');
    }
}
