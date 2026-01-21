import {
    argumentsParser,
    config,
    configEvents,
    configInitialization,
    context,
    getProgramPath,
    wLogger
} from '@tosu/common';
import { Server } from '@tosu/server';
import { autoUpdater, checkUpdates } from '@tosu/updater';
import { existsSync, readdirSync, rmSync, statSync } from 'fs';
import { dirname, join } from 'path';
import { Process } from 'tsprocess';

import { InstanceManager } from '@/instances/manager';

(async () => {
    context.currentVersion = import.meta.env.TOSU_VERSION;
    wLogger.info(`Starting tosu`);

    Process.disablePowerThrottling();

    const instanceManager = new InstanceManager();
    const httpServer = new Server({ instanceManager });

    await configInitialization();

    const { update, onedrive: onedriveBypass } = argumentsParser(process.argv);

    const isDev = process.env.NODE_ENV === 'development';
    const isConfigUpdate = config.enableAutoUpdate === true;
    if (update !== null && update !== undefined) {
        if (update === true) {
            await autoUpdater('startup');
        } else {
            await checkUpdates('startup');
        }
    } else {
        if (isDev === false && isConfigUpdate) {
            await autoUpdater('startup');
        } else {
            await checkUpdates('startup');
        }
    }

    if (process.platform === 'win32') {
        const currentPath = getProgramPath();
        if (process.env.TEMP && currentPath.startsWith(process.env.TEMP)) {
            wLogger.warn(
                'Incase if you running tosu from archive, please extract it to a folder'
            );
            return;
        }

        if (
            onedriveBypass !== true &&
            process.env.OneDrive &&
            currentPath.startsWith(process.env.OneDrive)
        ) {
            wLogger.warn(
                'tosu cannot run from a OneDrive folder due to potential sync conflicts and performance issues.'
            );
            wLogger.warn('Please move tosu to different folder');
            return;
        }
    }

    const logsPath = dirname(context.logFilePath);
    if (existsSync(logsPath)) {
        const logs = readdirSync(logsPath).filter(
            (file) => file !== context.logFilePath.split('\\').pop()
        );
        const size =
            logs.reduce((total, file) => {
                const filePath = join(logsPath, file);
                const fileSize = statSync(filePath).isFile()
                    ? statSync(filePath).size
                    : 0;
                return total + fileSize;
            }, 0) /
            1024 /
            1024;

        if (size >= 100) {
            logs.forEach((file) => rmSync(join(logsPath, file)));
            wLogger.debug(
                `The logs folder was cleared due to its size. (${size.toFixed(0)} MB)`
            );
        }
    }

    wLogger.info('Searching for osu!');

    httpServer.start();
    instanceManager.runWatcher();
    instanceManager.runDetemination();

    configEvents.addListener(
        'change',
        httpServer.handleConfigUpdate.bind(httpServer)
    );
    configEvents.addListener(
        'change',
        instanceManager.handleConfigUpdate.bind(instanceManager)
    );

    if (config.enableIngameOverlay) instanceManager.startOverlay();
})();
