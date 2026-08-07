import type { ConfigBinding, ConfigSchema } from './config.types';

export const defaultSchema: ConfigSchema = {
    enableAutoUpdate: {
        binding: 'ENABLE_AUTOUPDATE',
        default: true
    },
    openDashboardOnStartup: {
        binding: 'OPEN_DASHBOARD_ON_STARTUP',
        default: true
    },
    debugLog: {
        binding: 'DEBUG_LOG',
        default: false
    },
    calculatePP: {
        binding: 'CALCULATE_PP',
        default: true
    },
    enableKeyOverlay: {
        binding: 'ENABLE_KEY_OVERLAY',
        default: true
    },
    pollRate: {
        binding: 'POLL_RATE',
        default: 150,
        min: 100
    },
    preciseDataPollRate: {
        binding: 'PRECISE_DATA_POLL_RATE',
        default: 10,
        min: 1
    },
    showMpCommands: {
        binding: 'SHOW_MP_COMMANDS',
        default: false
    },
    readManiaScrollSpeed: {
        binding: 'READ_MANIA_SCROLL_SPEED',
        default: true
    },
    serverIP: {
        binding: 'SERVER_IP',
        default: '127.0.0.1'
    },
    serverPort: {
        binding: 'SERVER_PORT',
        default: 24050
    },
    staticFolderPath: {
        binding: 'STATIC_FOLDER_PATH',
        default: './static'
    },
    enableIngameOverlay: {
        binding: 'ENABLE_INGAME_OVERLAY',
        default: false
    },
    ingameOverlayKeybind: {
        binding: 'INGAME_OVERLAY_KEYBIND',
        default: 'Control + Shift + Space'
    },
    ingameOverlayMaxFps: {
        binding: 'INGAME_OVERLAY_MAX_FPS',
        default: 60
    },
    allowedIPs: {
        binding: 'ALLOWED_IPS',
        default: '127.0.0.1,localhost,absolute'
    }
};

export const newlineInsertions: ConfigBinding[] = [
    'OPEN_DASHBOARD_ON_STARTUP',
    'READ_MANIA_SCROLL_SPEED',
    'ENABLE_INGAME_OVERLAY',
    'PRECISE_DATA_POLL_RATE',
    'INGAME_OVERLAY_MAX_FPS',
    'ALLOWED_IPS'
];

export const bindingOrder: ConfigBinding[] = [
    'DEBUG_LOG',
    'ENABLE_AUTOUPDATE',
    'OPEN_DASHBOARD_ON_STARTUP',

    'SHOW_MP_COMMANDS',
    'CALCULATE_PP',
    'READ_MANIA_SCROLL_SPEED',

    'ENABLE_KEY_OVERLAY',
    'ENABLE_INGAME_OVERLAY',

    'POLL_RATE',
    'PRECISE_DATA_POLL_RATE',

    'INGAME_OVERLAY_KEYBIND',
    'INGAME_OVERLAY_MAX_FPS',

    'SERVER_IP',
    'SERVER_PORT',
    'ALLOWED_IPS',

    'STATIC_FOLDER_PATH'
];
