import {
    argumentsParser,
    config,
    getProgramPath,
    wLogger,
    watchConfigFile
} from '@tosu/common';
import { Server } from '@tosu/server';
import { autoUpdater, checkUpdates } from '@tosu/updater';
import { existsSync, readdirSync, rmSync, statSync } from 'fs';
import { dirname, join } from 'path';
import { Process } from 'tsprocess';

import { InstanceManager } from '@/instances/manager';

// NOTE: _version.js packs with pkg support in tosu build
const currentVersion = require(process.cwd() + '/_version.js');

(async () => {
    config.currentVersion = currentVersion;
    wLogger.info(`Starting tosu`);

    Process.disablePowerThrottling();

    const instanceManager = new InstanceManager();
    const httpServer = new Server({ instanceManager });

    await watchConfigFile({ httpServer, initial: true });

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

    const logsPath = dirname(config.logFilePath);
    if (existsSync(logsPath)) {
        const logs = readdirSync(logsPath).filter(
            (file) => file !== config.logFilePath.split('\\').pop()
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
    if (config.enableIngameOverlay) instanceManager.startOverlay();
})();
