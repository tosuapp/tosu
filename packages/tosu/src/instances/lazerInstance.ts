import { LazerMemory } from '@/memory/lazer';
import { Gameplay } from '@/states/gameplay';
import { Global } from '@/states/global';

import { AbstractInstance } from '.';

export class LazerInstance extends AbstractInstance {
    memory: LazerMemory;

    constructor(pid: number) {
        super(pid, 64);

        this.memory = new LazerMemory(this.process, this);
    }

    start(): void | Promise<void> {
        super.start();

        this.initiateDataLoops();
        this.watchProcessHealth();
    }

    injectGameOverlay(): void {
        throw new Error('Method not implemented.');
    }

    regularDataLoop(): void {}
    preciseDataLoop(global: Global, gameplay: Gameplay): void {
        throw new Error('Method not implemented.' + global + gameplay);
    }
}
