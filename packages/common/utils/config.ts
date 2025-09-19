import * as dotenv from 'dotenv';
import syncFs from 'fs';
import fs from 'node:fs/promises';
import path from 'path';

import { getProgramPath } from './directories';
import { checkGameOverlayConfig } from './ingame';
import { wLogger } from './logger';

const oldConfigPath = path.join(getProgramPath(), 'tsosu.env');
const configPath = path.join(getProgramPath(), 'tosu.env');

if (syncFs.existsSync(oldConfigPath) && !syncFs.existsSync(configPath)) {
    syncFs.renameSync(oldConfigPath, configPath);
}

const createConfig = async () => {
    try {
        await fs.access(configPath, fs.constants.F_OK);
        return;
    } catch {}

    await fs.writeFile(
        configPath,
        `# The config implies a set of key-values to enable/disable tosu functionality
# Below you can see that there is EVERY_THE_FUNCTION=true/false,
# true = on
# false = off

# Turns PP counting on/off. Very useful for tournament client, when you only care about scoring and map stats for example
CALCULATE_PP=true
# Enables/disables reading K1/K2/M1/M2 keys on the keyboard
ENABLE_KEY_OVERLAY=true
ENABLE_AUTOUPDATE=true

ALLOWED_IPS=127.0.0.1,localhost,absolute

# Reference: 1 second = 1000 milliseconds
# Once in what value, the programme should read the game values (in milliseconds)
POLL_RATE=100
# Once per value, the programme should read the values of keys K1/K2/M1/M2 (in milliseconds)
PRECISE_DATA_POLL_RATE=10

# Shows !mp commands (messages starting with '!mp') in tournament manager chat (hidden by default)
SHOW_MP_COMMANDS=false

# Enables/disables the in-game overlay (!!!I AM NOT RESPONSIBLE FOR USING IT!!!).
ENABLE_INGAME_OVERLAY=false
INGAME_OVERLAY_KEYBIND=Control + Shift + Space
INGAME_OVERLAY_MAX_FPS=60

# WARNING: EVERYTHING BELOW IS NOT TO BE TOUCHED UNNECESSARILY.

# Enables logs for tosu developers, not very intuitive for you, the end user.
# best not to include without developer's request.
DEBUG_LOG=false
OPEN_DASHBOARD_ON_STARTUP=true

# IP address where the websocket api server will be registered
# 127.0.0.1 = localhost
# 0.0.0.0.0 = all addresses
SERVER_IP=127.0.0.1
# The port on which the websocket api server will run
SERVER_PORT=24050
# The folder from which the overlays will be taken.
STATIC_FOLDER_PATH=./static`,
        'utf8'
    );
};

dotenv.config({ path: configPath });

export const config = {
    enableAutoUpdate: (process.env.ENABLE_AUTOUPDATE || 'true') === 'true',
    openDashboardOnStartup:
        (process.env.OPEN_DASHBOARD_ON_STARTUP || 'true') === 'true',
    debugLogging: (process.env.DEBUG_LOG || '') === 'true',
    calculatePP: (process.env.CALCULATE_PP || '') === 'true',
    enableKeyOverlay: (process.env.ENABLE_KEY_OVERLAY || '') === 'true',
    pollRate: Number(process.env.POLL_RATE || '100'),
    preciseDataPollRate: Number(
        process.env.PRECISE_DATA_POLL_RATE ||
            process.env.KEYOVERLAY_POLL_RATE ||
            '10'
    ),
    showMpCommands: (process.env.SHOW_MP_COMMANDS || '') === 'true',
    serverIP: process.env.SERVER_IP || '127.0.0.1',
    serverPort: Number(process.env.SERVER_PORT || '24050'),
    staticFolderPath: process.env.STATIC_FOLDER_PATH || './static',
    enableGosuOverlay: (process.env.ENABLE_GOSU_OVERLAY || '') === 'true',
    enableIngameOverlay: (process.env.ENABLE_INGAME_OVERLAY || '') === 'true',
    ingameOverlayKeybind:
        process.env.INGAME_OVERLAY_KEYBIND || 'Control + Shift + Space',
    ingameOverlayMaxFps: Number(process.env.INGAME_OVERLAY_MAX_FPS || 60),
    allowedIPs: process.env.ALLOWED_IPS || '127.0.0.1,localhost,absolute',
    timestamp: 0,
    currentVersion: '',
    updateVersion: '',
    logFilePath: ''
};

export type ConfigFields = keyof typeof config | '';

export const updateConfigFile = async () => {
    let newOptions = '';

    if (!process.env.DEBUG_LOG) {
        newOptions += 'DEBUG_LOG, ';
        await fs.appendFile(configPath, '\nDEBUG_LOG=false', 'utf8');
    }

    if (!process.env.CALCULATE_PP) {
        newOptions += 'CALCULATE_PP, ';
        await fs.appendFile(configPath, '\nCALCULATE_PP=true', 'utf8');
    }

    if (!process.env.ENABLE_KEY_OVERLAY) {
        newOptions += 'ENABLE_KEY_OVERLAY, ';
        await fs.appendFile(configPath, '\nENABLE_KEY_OVERLAY=true', 'utf8');
    }

    if (!process.env.POLL_RATE) {
        newOptions += 'POLL_RATE, ';
        await fs.appendFile(configPath, '\nPOLL_RATE=100', 'utf8');
    }

    if (!process.env.PRECISE_DATA_POLL_RATE) {
        newOptions += 'PRECISE_DATA_POLL_RATE, ';
        await fs.appendFile(
            configPath,
            '\n\nPRECISE_DATA_POLL_RATE=10',
            'utf8'
        );
    }

    if (!process.env.SHOW_MP_COMMANDS) {
        newOptions += 'SHOW_MP_COMMANDS, ';
        await fs.appendFile(configPath, '\nSHOW_MP_COMMANDS=false', 'utf8');
    }

    if (!process.env.SERVER_IP) {
        newOptions += 'SERVER_IP, ';
        await fs.appendFile(configPath, '\nSERVER_IP=127.0.0.1', 'utf8');
    }

    if (!process.env.SERVER_PORT) {
        newOptions += 'SERVER_PORT, ';
        await fs.appendFile(configPath, '\nSERVER_PORT=24050', 'utf8');
    }

    if (!process.env.STATIC_FOLDER_PATH) {
        newOptions += 'STATIC_FOLDER_PATH, ';
        await fs.appendFile(
            configPath,
            '\nSTATIC_FOLDER_PATH=./static',
            'utf8'
        );
    }

    if (!process.env.ENABLE_INGAME_OVERLAY) {
        newOptions += 'ENABLE_INGAME_OVERLAY, ';
        await fs.appendFile(
            configPath,
            '\nENABLE_INGAME_OVERLAY=false',
            'utf8'
        );
    }

    if (!process.env.INGAME_OVERLAY_KEYBIND) {
        newOptions += 'INGAME_OVERLAY_KEYBIND, ';
        await fs.appendFile(
            configPath,
            '\nINGAME_OVERLAY_KEYBIND=Control + Shift + Space',
            'utf8'
        );
    }

    if (!process.env.INGAME_OVERLAY_MAX_FPS) {
        newOptions += 'INGAME_OVERLAY_MAX_FPS, ';
        await fs.appendFile(configPath, '\nINGAME_OVERLAY_MAX_FPS=60', 'utf8');
    }

    if (!process.env.ENABLE_AUTOUPDATE) {
        newOptions += 'ENABLE_AUTOUPDATE, ';
        await fs.appendFile(configPath, '\nENABLE_AUTOUPDATE=true', 'utf8');
    }

    if (!process.env.OPEN_DASHBOARD_ON_STARTUP) {
        newOptions += 'OPEN_DASHBOARD_ON_STARTUP, ';
        await fs.appendFile(
            configPath,
            '\nOPEN_DASHBOARD_ON_STARTUP=true',
            'utf8'
        );
    }

    if (!process.env.ALLOWED_IPS) {
        newOptions += 'ALLOWED_IPS, ';
        await fs.appendFile(
            configPath,
            '\nALLOWED_IPS=127.0.0.1,localhost,absolute',
            'utf8'
        );
    }

    if (newOptions !== '') {
        wLogger.warn(
            '[config]',
            `New options available in config: ${newOptions}\n`
        );
    }
};

export const initConfigFile = async (httpServer: any) => {
    await createConfig();
    await refreshConfig(httpServer, false);
    await updateConfigFile();
};

export const watchConfigFile = async (httpServer: any) => {
    // Initialize watcher.
    const iter = fs.watch(configPath)[Symbol.asyncIterator]();

    // Run initial check first, run on changes afterward.
    do {
        await createConfig();
        const stat = await fs.stat(configPath);
        await refreshConfig(httpServer, true);
        config.timestamp = stat.mtimeMs;
    } while (!(await iter.next()).done);
};

export const refreshConfig = async (httpServer: any, refresh: boolean) => {
    let updated = false;
    const status = refresh === true ? 'reload' : 'load';

    const { parsed, error } = dotenv.config({ path: configPath });
    if (error != null || parsed == null) {
        wLogger.error('[config]', `Config ${status} failed`);
        return;
    }

    const enableAutoUpdate = (parsed.ENABLE_AUTOUPDATE || '') === 'true';
    const openDashboardOnStartup =
        (parsed.OPEN_DASHBOARD_ON_STARTUP || '') === 'true';
    const debugLogging = (parsed.DEBUG_LOG || '') === 'true';
    const serverIP = parsed.SERVER_IP || '127.0.0.1';
    const serverPort = Number(parsed.SERVER_PORT || '24050');
    const calculatePP = (parsed.CALCULATE_PP || '') === 'true';
    const enableKeyOverlay = (parsed.ENABLE_KEY_OVERLAY || '') === 'true';
    const pollRate = Number(parsed.POLL_RATE || '100');
    const preciseDataPollRate = Number(
        parsed.PRECISE_DATA_POLL_RATE || parsed.KEYOVERLAY_POLL_RATE || '10'
    );
    const showMpCommands = (parsed.SHOW_MP_COMMANDS || '') === 'true';
    const staticFolderPath = parsed.STATIC_FOLDER_PATH || './static';
    const enableGosuOverlay = (parsed.ENABLE_GOSU_OVERLAY || '') === 'true';
    const enableIngameOverlay = (parsed.ENABLE_INGAME_OVERLAY || '') === 'true';
    const ingameOverlayKeybind =
        parsed.INGAME_OVERLAY_KEYBIND || 'Control + Shift + Space';
    const ingameOverlayMaxFps = Number(parsed.INGAME_OVERLAY_MAX_FPS || 60);
    const allowedIPs = parsed.ALLOWED_IPS || '127.0.0.1,localhost,absolute';

    const maxFpsUpdated = config.ingameOverlayMaxFps !== ingameOverlayMaxFps;
    // determine whether config actually was updated or not
    updated =
        config.enableAutoUpdate !== enableAutoUpdate ||
        config.openDashboardOnStartup !== openDashboardOnStartup ||
        config.debugLogging !== debugLogging ||
        config.calculatePP !== calculatePP ||
        config.enableKeyOverlay !== enableKeyOverlay ||
        config.pollRate !== pollRate ||
        config.preciseDataPollRate !== preciseDataPollRate ||
        config.showMpCommands !== showMpCommands ||
        config.staticFolderPath !== staticFolderPath ||
        config.enableIngameOverlay !== enableIngameOverlay ||
        config.ingameOverlayKeybind !== ingameOverlayKeybind ||
        maxFpsUpdated ||
        config.serverIP !== serverIP ||
        config.serverPort !== serverPort ||
        config.allowedIPs !== allowedIPs;

    if (config.serverIP !== serverIP || config.serverPort !== serverPort) {
        config.serverIP = serverIP;
        config.serverPort = serverPort;

        httpServer.restart();
    }

    config.enableIngameOverlay = enableIngameOverlay;
    config.ingameOverlayKeybind = ingameOverlayKeybind;
    config.ingameOverlayMaxFps = ingameOverlayMaxFps;
    await checkGameOverlayConfig();

    if (enableIngameOverlay && refresh) {
        if (httpServer.instanceManager.isOverlayStarted) {
            if (maxFpsUpdated) {
                // setFrameRate doesn't work after paint event.
                // overlay must be restarted in this case.
                await httpServer.instanceManager.stopOverlay();
                await httpServer.instanceManager.startOverlay();
            } else {
                httpServer.instanceManager.updateOverlayConfig();
            }
        } else {
            await httpServer.instanceManager.startOverlay();
        }
    } else if (refresh) {
        await httpServer.instanceManager.stopOverlay();
    }

    if (enableGosuOverlay === true && !enableIngameOverlay) {
        wLogger.warn(
            '\n\n\n',
            'Gosu Ingame-overlay removed, please use new one, you can https://osuck.link/tosu-ingame',
            '\n\n\n'
        );
    }

    config.enableAutoUpdate = enableAutoUpdate;
    config.openDashboardOnStartup = openDashboardOnStartup;

    config.debugLogging = debugLogging;
    config.calculatePP = calculatePP;
    config.enableKeyOverlay = enableKeyOverlay;
    config.showMpCommands = showMpCommands;
    config.staticFolderPath = staticFolderPath;
    config.allowedIPs = allowedIPs;

    const staticPath = path.join(getProgramPath(), 'static');
    if (config.staticFolderPath === './static') {
        await fs.mkdir(staticPath, { recursive: true });
    }

    if (updated) wLogger.info('[config]', `Config ${status}ed`);
};

export const writeConfig = async (httpServer: any, options: any) => {
    let text = '';

    text += `DEBUG_LOG=${options.DEBUG_LOG ?? config.debugLogging}\n\n`;
    text += `CALCULATE_PP=${options.CALCULATE_PP ?? config.calculatePP}\n\n`;
    text += `ENABLE_AUTOUPDATE=${options.ENABLE_AUTOUPDATE ?? config.enableAutoUpdate}\n`;
    text += `OPEN_DASHBOARD_ON_STARTUP=${options.OPEN_DASHBOARD_ON_STARTUP ?? config.openDashboardOnStartup}\n\n`;
    text += `ENABLE_INGAME_OVERLAY=${options.ENABLE_INGAME_OVERLAY ?? config.enableIngameOverlay}\n`;
    text += `INGAME_OVERLAY_KEYBIND=${options.INGAME_OVERLAY_KEYBIND ?? config.ingameOverlayKeybind}\n`;
    text += `INGAME_OVERLAY_MAX_FPS=${options.INGAME_OVERLAY_MAX_FPS ?? config.ingameOverlayMaxFps}\n`;
    text += `ENABLE_KEY_OVERLAY=${options.ENABLE_KEY_OVERLAY ?? config.enableKeyOverlay}\n\n`;
    text += `ALLOWED_IPS=${options.ALLOWED_IPS ?? config.allowedIPs}\n\n`;
    text += `POLL_RATE=${options.POLL_RATE ?? config.pollRate}\n`;
    text += `PRECISE_DATA_POLL_RATE=${options.PRECISE_DATA_POLL_RATE ?? config.preciseDataPollRate}\n\n`;
    text += `SHOW_MP_COMMANDS=${options.SHOW_MP_COMMANDS ?? config.showMpCommands}\n\n`;
    text += `SERVER_IP=${options.SERVER_IP ?? config.serverIP}\n`;
    text += `SERVER_PORT=${options.SERVER_PORT ?? config.serverPort}\n\n`;
    text += `STATIC_FOLDER_PATH=${options.STATIC_FOLDER_PATH ?? config.staticFolderPath}\n`;

    await fs.writeFile(configPath, text, 'utf8');
    await refreshConfig(httpServer, true);
};
