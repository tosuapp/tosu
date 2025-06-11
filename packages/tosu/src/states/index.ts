import { AbstractInstance } from '@/instances';

export abstract class AbstractState {
    game: AbstractInstance;

    constructor(game: AbstractInstance) {
        this.game = game;
    }

    updateState() {
        throw Error('Error: updateState not implemented');
    }
}
