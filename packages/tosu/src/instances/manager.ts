import {
    ClientType,
    GlobalConfig,
    Platform,
    argumentsParser,
    checkGameOverlayConfig,
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
    gameFocused: boolean;

    osuInstances: {
        [key: number]: AbstractInstance;
    };

    isOverlayStarted: boolean = false;
    overlayProcess: ChildProcess | null = null;

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

            if (osuProcesses.length > 0 && process.platform === 'linux') {
                /* Fix for osu tournament, like osu! -spectateclient 2, wtf btw? */
                osuProcesses.push(...Process.findProcesses(['osu!']));
            }

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

                const processHandle = Process.openProcess(processId);
                const isProcessExist = Process.isProcessExist(processHandle);
                if (!isProcessExist) {
                    Process.closeHandle(processHandle);
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

                if (this.overlayProcess) {
                    this.overlayProcess.send({
                        cmd: 'add',
                        pid: processId
                    });
                }
            }
        } catch (exc) {
            wLogger.error('Process management failed:', (exc as any).message);
            wLogger.debug('Process management error details:', exc);
        }
    }

    async runWatcher() {
        while (true) {
            await this.handleProcesses();
            await setTimeout(1000);
        }
    }

    async runDetemination() {
        while (true) {
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
            this.gameFocused = instance !== undefined;

            if (this.focusedClient === undefined) {
                this.focusedClient =
                    this.getInstance()?.client || ClientType.stable;
            }

            await setTimeout(100);
        }
    }

    async startOverlay() {
        // ignore if it already started
        if (this.overlayProcess || this.isOverlayStarted) {
            return;
        }
        this.isOverlayStarted = true;

        try {
            await checkGameOverlayConfig();

            const child = await runOverlay();
            if (
                child instanceof Error &&
                (child as NodeJS.ErrnoException)?.code === 'EPERM'
            ) {
                wLogger.warn(
                    'Unable to update overlay: File locked. Please close running osu! clients.'
                );
                await this.checkInstances();

                this.isOverlayStarted = false;
                this.startOverlay();
                return;
            } else if (child instanceof Error) {
                wLogger.error(
                    'Failed to start overlay process:',
                    (child as any).message
                );
                wLogger.debug('Overlay process startup error details:', child);

                return;
            }

            child.on('error', (err) => {
                this.isOverlayStarted = false;
                this.overlayProcess = null;

                wLogger.warn('Overlay process runtime error:', err);
            });

            child.on('exit', (code, signal) => {
                this.isOverlayStarted = false;
                this.overlayProcess = null;

                if (code !== 0 && signal !== 'SIGTERM') {
                    wLogger.error(
                        `Overlay process exited abnormally with code %%${code}%% ${signal ? `(%%${signal}%%)` : ''}`
                    );
                    return;
                }

                wLogger.warn('Overlay process has exited');
            });

            this.overlayProcess = child;
            this.updateOverlayConfig();
            for (const pid in this.osuInstances) {
                child.send({
                    cmd: 'add',
                    pid: Number(pid)
                });
            }
        } catch (exc) {
            wLogger.error('Overlay startup failed:', (exc as any).message);
            wLogger.debug('Overlay startup error details:', exc);
        }
    }

    async handleConfigUpdate(oldConfig: GlobalConfig) {
        try {
            const oldEnableOverlay = oldConfig.enableIngameOverlay;
            const newEnableOverlay = config.enableIngameOverlay;

            if (!oldEnableOverlay && !newEnableOverlay) {
                return;
            }

            if (oldEnableOverlay && !newEnableOverlay) {
                if (this.isOverlayStarted) {
                    await this.stopOverlay();
                }
                return;
            }

            if (!oldEnableOverlay && newEnableOverlay) {
                this.updateOverlayConfig();
                await this.startOverlay();
                return;
            }

            const keybindChanged =
                oldConfig.ingameOverlayKeybind !== config.ingameOverlayKeybind;
            const maxFpsChanged =
                oldConfig.ingameOverlayMaxFps !== config.ingameOverlayMaxFps;

            if (oldEnableOverlay && newEnableOverlay) {
                if (keybindChanged || maxFpsChanged) this.updateOverlayConfig();

                if (maxFpsChanged && this.isOverlayStarted) {
                    await this.stopOverlay();
                    await this.startOverlay();
                }
            }
        } catch (exc) {
            wLogger.error(
                'Failed to update overlay configuration:',
                (exc as any).message
            );
            wLogger.debug('Overlay config update error details:', exc);
        }
    }

    async checkInstances() {
        return new Promise((resolve) => {
            const intervalId = setInterval(() => {
                if (Object.keys(this.osuInstances).length > 0) return;

                clearInterval(intervalId);
                resolve(true);
            }, 1000);
        });
    }

    updateOverlayConfig() {
        const proc = this.overlayProcess;
        if (!proc) return;

        proc.send({
            cmd: 'keybind',
            keybind: config.ingameOverlayKeybind
        });
        proc.send({
            cmd: 'maxFps',
            maxFps: config.ingameOverlayMaxFps
        });
    }

    async stopOverlay() {
        // ignore if it's not started
        if (!this.overlayProcess) {
            return;
        }

        wLogger.warn('Stopping in-game overlay process...');
        const overlayProcess = this.overlayProcess;
        overlayProcess.kill();

        await new Promise((resolve) => overlayProcess.once('close', resolve));
        this.isOverlayStarted = false;
        this.overlayProcess = null;
    }
}
