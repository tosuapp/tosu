import {
    ClientType,
    Platform,
    argumentsParser,
    config,
    platformResolver,
    wLogger
} from '@tosu/common';
import { runOverlay } from '@tosu/ingame-overlay-updater';
import { ChildProcess } from 'node:child_process';
import { setTimeout } from 'node:timers/promises';
import { Process } from 'tsprocess';

import { AbstractInstance } from '@/instances';

import { LazerInstance } from './lazerInstance';
import { OsuInstance } from './osuInstance';

export class InstanceManager {
    platformType: Platform;
    focusedClient: ClientType;

    osuInstances: {
        [key: number]: AbstractInstance;
    };

    private overlayProcess: ChildProcess | null = null;

    constructor() {
        this.osuInstances = {};
    }

    /**
     * Gets a regular instance if osu running in normal mode, else gets tournament manager
     */
    public getInstance(clientType?: ClientType) {
        if (Object.keys(this.osuInstances).length === 0) return;

        for (const key in this.osuInstances) {
            const instance = this.osuInstances[key];
            const ClientFilter =
                typeof ClientType[clientType as any] !== 'undefined'
                    ? instance.client === clientType
                    : true;

            if (instance.isTourneyManager && ClientFilter) {
                return instance;
            }
        }

        if (typeof clientType === 'number') {
            const search = Object.values(this.osuInstances).find(
                (r) => r.client === clientType
            );
            return search;
        }
        return Object.values(this.osuInstances)[0];
    }

    private onProcessDestroy(pid: number) {
        // FOOL PROTECTION
        if (!(pid in this.osuInstances)) {
            return;
        }

        delete this.osuInstances[pid];
    }

    private async handleProcesses() {
        try {
            let osuProcesses = Process.findProcesses([
                'osu!.exe',
                'osulazer.exe'
            ]);

            let lazerOnLinux = false;

            if (osuProcesses.length === 0 && process.platform === 'linux') {
                osuProcesses = Process.findProcesses(['osu!']);

                lazerOnLinux = true;
            }

            for (const processId of osuProcesses || []) {
                if (processId in this.osuInstances) {
                    // dont deploy not needed instances
                    continue;
                }

                const isLazer =
                    (Process.isProcess64bit(processId) &&
                        process.platform !== 'linux') ||
                    lazerOnLinux;

                const cmdLine = Process.getProcessCommandLine(processId);

                const args = argumentsParser(cmdLine);
                if (args.tournament !== null && args.tournament !== undefined) {
                    // skip the lazer tournament client
                    continue;
                }

                if (args['debug-client-id']) {
                    // skip lazer debug clients
                    continue;
                }

                const osuInstance = isLazer
                    ? new LazerInstance(processId)
                    : new OsuInstance(processId);

                if (!isNaN(parseFloat(args.spectateclient))) {
                    osuInstance.setTourneyIpcId(args.spectateclient);
                    osuInstance.setIsTourneySpectator(true);
                }

                if (args.devserver && args.devserver.length > 0) {
                    osuInstance.setCustomServerEndpoint(args.devserver);
                }

                osuInstance.emitter.on(
                    'onDestroy',
                    this.onProcessDestroy.bind(this)
                );
                osuInstance.emitter.on(
                    'onResolveFailed',
                    this.onProcessDestroy.bind(this)
                );

                this.osuInstances[processId] = osuInstance;
                osuInstance.start();
            }

            if (
                config.enableIngameOverlay &&
                !this.overlayProcess &&
                Object.keys(this.osuInstances).length > 0
            ) {
                await this.startOverlay();
            }
        } catch (exc) {
            wLogger.error('[manager]', 'handleProcesses', (exc as any).message);
            wLogger.debug('[manager]', 'handleProcesses', exc);
        }
    }

    async runWatcher() {
        for (;;) {
            await this.handleProcesses();
            await setTimeout(1000);
        }
    }

    async runDetemination() {
        for (;;) {
            if (!this.platformType) {
                const platform = platformResolver(process.platform);
                this.platformType = platform.type;
            }

            if (this.platformType !== 'windows') return;

            const focusedPID = Process.getFocusedProcess();
            const instance = Object.values(this.osuInstances).find(
                (r) => r.pid === focusedPID
            );
            if (instance) this.focusedClient = instance.client;

            if (this.focusedClient === undefined) {
                this.focusedClient =
                    this.getInstance()?.client || ClientType.stable;
            }

            await setTimeout(100);
        }
    }

    async startOverlay() {
        try {
            const child = await runOverlay();
            child.on('error', (err) => {
                this.overlayProcess = null;
                wLogger.warn('[ingame-overlay]', 'run error', err);
            });

            child.on('exit', (code, signal) => {
                this.overlayProcess = null;
                if (code !== 0) {
                    wLogger.error(
                        '[ingame-overlay]',
                        `Unknown exit code: ${code} ${signal ? `(${signal})` : ''}`
                    );
                    return;
                }

                wLogger.warn('[ingame-overlay]', 'Exited...');
            });

            this.overlayProcess = child;
        } catch (exc) {
            wLogger.error('[ingame-overlay]', (exc as any).message);
            wLogger.debug('[ingame-overlay]', exc);
        }
    }
}
