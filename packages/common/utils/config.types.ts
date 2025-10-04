export interface Config {
    // Whether tosu should automatically check for and install updates.
    enableAutoUpdate: {
        type: boolean;
        binding: 'ENABLE_AUTOUPDATE';
    };

    // Whether tosu should open the web dashboard on startup.
    openDashboardOnStartup: {
        type: boolean;
        binding: 'OPEN_DASHBOARD_ON_STARTUP';
    };

    // Whether to show verbose logging for debugging purposes.
    debugLog: {
        type: boolean;
        binding: 'DEBUG_LOG';
    };

    // Whether tosu should calculate performance points from game data.
    calculatePP: {
        type: boolean;
        binding: 'CALCULATE_PP';
    };

    // Whether tosu should read osu!'s built-in key overlay data.
    enableKeyOverlay: {
        type: boolean;
        binding: 'ENABLE_KEY_OVERLAY';
    };

    // General data polling rate in milliseconds.
    pollRate: {
        type: number;
        binding: 'POLL_RATE';
    };

    // More precise polling rate for critical data, in milliseconds. (e.g. key overlay data)
    preciseDataPollRate: {
        type: number;
        binding: 'PRECISE_DATA_POLL_RATE';
    };

    // Whether to show bancho !mp commands in the tournament manager chat.
    showMpCommands: {
        type: boolean;
        binding: 'SHOW_MP_COMMANDS';
    };

    // The IP address tosu should serve on.
    serverIP: {
        type: string;
        binding: 'SERVER_IP';
    };

    // The port tosu should serve on.
    serverPort: {
        type: number;
        binding: 'SERVER_PORT';
    };

    // Path to the folder containing pp counters.
    staticFolderPath: {
        type: string;
        binding: 'STATIC_FOLDER_PATH';
    };

    // Whether tosu should launch the in-game overlay.
    enableIngameOverlay: {
        type: boolean;
        binding: 'ENABLE_INGAME_OVERLAY';
    };

    // The keybind to open the in-game overlay.
    ingameOverlayKeybind: {
        type: string;
        binding: 'INGAME_OVERLAY_KEYBIND';
    };

    // The maximum frames per second for the in-game overlay.
    ingameOverlayMaxFps: {
        type: number;
        binding: 'INGAME_OVERLAY_MAX_FPS';
    };

    // Comma-separated list of allowed IPs for remote access.
    allowedIPs: {
        type: string;
        binding: 'ALLOWED_IPS';
    };
}

export type ConfigKey = keyof Config;
export type ConfigBinding = {
    [K in keyof Config]: Config[K] extends { binding: infer binding }
        ? binding
        : never;
}[keyof Config];

export interface ConfigItem<K extends ConfigKey> {
    binding: Config[K]['binding'];
    default: Config[K]['type'];
}

export type ConfigSchema = {
    [K in ConfigKey]: {
        binding: Config[K]['binding'];
        default: Config[K]['type'];
        order: number;
    };
};

export type GlobalConfig = {
    [K in ConfigKey]: Config[K]['type'];
};

export type ConfigEvents = {
    change: [GlobalConfig];
};
