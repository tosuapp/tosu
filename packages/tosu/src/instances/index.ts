import { Bitness, ClientType, config, sleep, wLogger } from '@tosu/common';
import EventEmitter from 'events';
import { Process } from 'tsprocess';

import { buildResult } from '@/api/utils/buildResult';
import { buildResult as buildResultSC } from '@/api/utils/buildResultSC';
import { buildResult as buildResultV2 } from '@/api/utils/buildResultV2';
import { buildResult as buildResultV2Precise } from '@/api/utils/buildResultV2Precise';
import { InstanceManager } from '@/instances/manager';
import { AbstractMemory } from '@/memory';
import { BassDensity } from '@/states/bassDensity';
import { BeatmapPP } from '@/states/beatmap';
import { Gameplay } from '@/states/gameplay';
import { Global } from '@/states/global';
import { LazerMultiSpectating } from '@/states/lazerMultiSpectating';
import { Menu } from '@/states/menu';
import { ResultScreen } from '@/states/resultScreen';
import { Settings } from '@/states/settings';
import { TourneyManager } from '@/states/tourney';
import { User } from '@/states/user';
import { cleanPath } from '@/utils/converters';

export interface DataRepoList {
    settings: Settings;

    global: Global;
    beatmapPP: BeatmapPP;
    menu: Menu;
    bassDensity: BassDensity;
    gameplay: Gameplay;
    resultScreen: ResultScreen;
    tourneyManager: TourneyManager;
    user: User;
    lazerMultiSpectating: LazerMultiSpectating;
}

export abstract class AbstractInstance {
    errorsCount: { [key: string | number]: number } = {};

    abstract memory: AbstractMemory<Record<string, number>>;
    client: ClientType;
    customServerEndpoint: string;

    pid: number;
    process: Process;
    path: string = '';
    bitness: Bitness;

    isReady: boolean;
    isDestroyed: boolean = false;
    isTourneyManager: boolean = false;
    isTourneySpectator: boolean = false;

    ipcId: number = 0;

    previousState: string = '';
    previousMP3Length: number = 0;
    previousTime: number = 0;

    emitter: EventEmitter = new EventEmitter();

    states: Partial<DataRepoList> = {};

    constructor(pid: number, bitness: Bitness) {
        this.pid = pid;

        this.process = new Process(this.pid, bitness);
        this.path = cleanPath(this.process.path);
        this.bitness = bitness;

        this.client =
            bitness === Bitness.x64 ? ClientType.lazer : ClientType.stable;

        this.set('settings', new Settings(this));
        this.set('global', new Global(this));
        this.set('beatmapPP', new BeatmapPP(this));
        this.set('menu', new Menu(this));
        this.set('bassDensity', new BassDensity(this));
        this.set('gameplay', new Gameplay(this));
        this.set('resultScreen', new ResultScreen(this));
        this.set('tourneyManager', new TourneyManager(this));
        this.set('user', new User(this));
        this.set('lazerMultiSpectating', new LazerMultiSpectating(this));

        this.watchProcessHealth = this.watchProcessHealth.bind(this);
        this.preciseDataLoop = this.preciseDataLoop.bind(this);
    }

    /**
     * Sets service instance
     */
    set<TName extends keyof DataRepoList>(
        serviceName: TName,
        instance: DataRepoList[TName]
    ): void {
        this.states[serviceName] = instance;
    }

    /**
     * Returns requested service, otherwise returns null
     */
    get<TName extends keyof DataRepoList>(
        serviceName: TName
    ): DataRepoList[TName] | null {
        const instance = this.states[serviceName];
        if (!instance) {
            return null;
        }

        return instance;
    }

    private resolvePatterns(): boolean {
        try {
            const scanPatterns = this.memory.getScanPatterns();

            const results = this.process.scanBatch(
                Object.values(scanPatterns).map((x) => x.pattern)
            );

            const patternsEntries = Object.entries(scanPatterns);
            for (let i = 0; i < results.length; i++) {
                const item = results[i];
                const pattern = patternsEntries[item.index];

                this.memory.setPattern(
                    pattern[0],
                    item.address + (pattern[1].offset || 0)
                );
            }

            if (!this.memory.checkIsBasesValid()) {
                return false;
            }

            return true;
        } catch (exc) {
            wLogger.error(
                ClientType[this.client],
                this.pid,
                'resolvePatterns',
                (exc as Error).message
            );
            wLogger.debug(
                ClientType[this.client],
                this.pid,
                'resolvePatterns',
                exc
            );

            return false;
        }
    }

    start(): void {
        wLogger.info(`[${this.pid} ${this.client}] Running memory chimera...`);

        while (!this.isReady) {
            try {
                const s1 = performance.now();
                const result = this.resolvePatterns();
                if (!result) {
                    throw new Error('Memory resolve failed');
                }

                const elapsedTime = `${(performance.now() - s1).toFixed(2)}ms`;
                wLogger.info(
                    ClientType[this.client],
                    this.pid,
                    `All patterns resolved within ${elapsedTime}`
                );

                this.isReady = true;
            } catch (exc) {
                wLogger.error(
                    ClientType[this.client],
                    this.pid,
                    'Pattern scanning failed, Trying one more time...',
                    (exc as Error).message
                );
                wLogger.debug(
                    ClientType[this.client],
                    this.pid,
                    'Pattern scanning failed, Trying one more time...',
                    exc
                );

                this.emitter.emit('onResolveFailed', this.pid);
                return;
            }
        }

        this.initiateDataLoops();
        this.watchProcessHealth();
    }

    initiateDataLoops() {
        this.regularDataLoop();
        this.preciseDataLoop();
    }

    abstract regularDataLoop(): void;
    abstract preciseDataLoop(): void;

    async watchProcessHealth() {
        while (!this.isDestroyed) {
            if (!Process.isProcessExist(this.process.handle)) {
                wLogger.warn(
                    ClientType[this.client],
                    this.pid,
                    'osu!.exe got destroyed'
                );

                this.emitter.emit('onDestroy', this.pid);
                this.isDestroyed = true;
            }

            await sleep(config.pollRate);
        }
    }

    setTourneyIpcId(ipcId: number) {
        this.ipcId = ipcId;
    }

    setIsTourneySpectator(newVal: boolean) {
        this.isTourneySpectator = newVal;
    }

    setCustomServerEndpoint(server: string) {
        this.customServerEndpoint = server;
    }

    getState(instanceManager: InstanceManager) {
        return buildResult(instanceManager);
    }

    getStateV2(instanceManager: InstanceManager) {
        return buildResultV2(instanceManager);
    }

    getStateSC(instanceManager: InstanceManager) {
        return buildResultSC(instanceManager);
    }

    getPreciseData(instanceManager: InstanceManager) {
        return buildResultV2Precise(instanceManager);
    }

    /**
     * Returns map of requested services
     * Throws if any of requested services is not currently present
     */
    getServices<T extends (keyof DataRepoList)[]>(
        services: T
    ): Pick<DataRepoList, T[number]> | never {
        return services.reduce(
            (acc, item: keyof Pick<DataRepoList, T[number]>) => {
                const instance = this.get(item);
                if (!instance || instance === null) {
                    throw new Error(
                        `Service "${item}" was not set in DataRepo list`
                    );
                }
                acc[item] = instance as never;
                return acc;
            },
            {} as Pick<DataRepoList, T[number]>
        );
    }

    reportError(id: string | number, maxAmount: number, ...args: any[]) {
        this.errorsCount[id] = (this.errorsCount[id] || 0) + 1;

        if (this.errorsCount[id] <= maxAmount) {
            wLogger.debugError(...args);
            return;
        }

        wLogger.error(...args);
    }

    resetReportCount(id: string | number) {
        this.errorsCount[id] = 0;
    }

    preventThrow(callback) {
        try {
            const result = callback();
            return result;
        } catch (error) {
            return error as Error;
        }
    }
}
