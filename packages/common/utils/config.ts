import { createHash } from 'crypto';
import * as dotenv from 'dotenv';
import fs from 'node:fs/promises';
import path from 'path';

import { getProgramPath } from './directories';
import { checkGameOverlayConfig } from './ingame';
import { wLogger } from './logger';
import { isRealNumber } from './manipulation';

interface Config {
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

export type ConfigKeys = keyof Config;
export type ConfigBindings = {
    [K in keyof Config]: Config[K] extends { binding: infer KeyType }
        ? KeyType
        : never;
}[keyof Config];

interface ConfigItem<K extends ConfigKeys> {
    binding: Config[K]['binding'];
    default: Config[K]['type'];
}

type ConfigSchema = {
    [K in ConfigKeys]: {
        binding: Config[K]['binding'];
        default: Config[K]['type'];
    };
};

type GlobalConfig = {
    [K in ConfigKeys]: Config[K]['type'];
};

const configSchema: ConfigSchema = {
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
        default: 100
    },
    preciseDataPollRate: {
        binding: 'PRECISE_DATA_POLL_RATE',
        default: 10
    },
    showMpCommands: {
        binding: 'SHOW_MP_COMMANDS',
        default: false
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

export const config: GlobalConfig = Object.entries(configSchema).reduce(
    (value, item) => {
        const key = item[0] as ConfigKeys;
        value[key] = item[1].default as never;

        return value;
    },
    {} as GlobalConfig
);

const oldConfigPath = path.join(getProgramPath(), 'tsosu.env');
const configPath = path.join(getProgramPath(), 'tosu.env');

export class ConfigManager {
    private readonly _path: string = undefined!;

    private lastFileHash: string = '';

    private saveTimeout: NodeJS.Timeout | null = null;
    private httpServer: any;

    private constructor(
        env: Record<string, string>,
        filePath: string,
        httpServer: any
    ) {
        this._path = filePath;
        this.httpServer = httpServer;

        this.refreshConfig(env);
    }

    /**
     * Migrates the old config to the new config. (`tsosu.env` -> `tosu.env`)
     * Prioritizes the existing config (if any) and removes deprecated properties.
     */
    public static async migrate(filePath: string): Promise<void> {
        try {
            const oldEnv = await fs
                .readFile(filePath, 'utf-8')
                .then(dotenv.parse)
                .catch(() => null);

            if (oldEnv === null) {
                wLogger.debug(
                    '[config] No old config found. Skipping migration..'
                );

                return;
            }

            const hasNewConfig = await fs
                .stat(configPath)
                .then(() => true)
                .catch(() => false);

            const newEnv = hasNewConfig
                ? await fs.readFile(configPath, 'utf-8').then(dotenv.parse)
                : {};

            const migratedEnv: Record<string, string> = {};
            for (const key in configSchema) {
                if (!Object.hasOwn(configSchema, key)) continue;

                const item = configSchema[key as ConfigKeys];

                migratedEnv[item.binding] = newEnv[item.binding];
                migratedEnv[item.binding] ??= oldEnv[item.binding];
                migratedEnv[item.binding] ??= `${item.default}`;
            }

            const output = Object.entries(migratedEnv)
                .map((value) => `${value[0]}=${value[1]}`)
                .join('\n');

            await fs.writeFile(configPath, output, 'utf-8');
            wLogger.warn(`[config] Your config file has been migrated.`);

            const deprecated = Object.keys(oldEnv).filter(
                (binding) => !Object.hasOwn(migratedEnv, binding)
            );
            if (deprecated.length > 0) {
                wLogger.warn(
                    `[config] Deprecated properties: ${deprecated.join(', ')}.`
                );
            }

            const newProps = Object.keys(migratedEnv).filter(
                (binding) => !Object.hasOwn(newEnv, binding)
            );
            if (newProps.length > 0) {
                wLogger.warn(
                    `[config] New properties: ${newProps.join(', ')}.`
                );
            }

            await fs.unlink(filePath).catch(null);
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            wLogger.error(`[config] Failed to migrate config: ${msg}`);
            wLogger.debug(`[config] Migration error: ${e}`);
        }
    }

    /**
     * Initializes the ConfigManager, migrates old settings, and starts the file watcher.
     */
    public static async initialize(
        filePath: string,
        httpServer: any
    ): Promise<ConfigManager> {
        await this.migrate(oldConfigPath);
        await this.writeEnv(filePath);

        const env: Record<string, string> = await fs
            .readFile(filePath, 'utf-8')
            .then(dotenv.parse)
            .catch(() => ({}));

        const manager = new ConfigManager(env, filePath, httpServer);
        manager.startConfigWatcher();
        return manager;
    }

    /**
     * Sets a config value and schedules a debounced save to the .env file.
     */
    public set<B extends ConfigKeys>(key: B, value: GlobalConfig[B]): boolean {
        if (config[key] === value) {
            return false;
        }

        config[key] = value;

        if (this.saveTimeout) clearTimeout(this.saveTimeout);
        this.saveTimeout = setTimeout(async () => {
            await this.updateEnv();
        }, 1_000);

        return true;
    }

    /**
     * Gets a config value from the config obj.
     */
    public get<B extends ConfigKeys>(key: B): GlobalConfig[B] {
        return config[key] as GlobalConfig[B];
    }

    /**
     * Getter that returns proxied access to the config object.
     */
    public get config(): GlobalConfig {
        return new Proxy(config, {
            get: (_, key: ConfigKeys) => this.get(key),
            set: (_, key: ConfigKeys, value) => this.set(key, value)
        });
    }

    /**
     * Serializes the current config object into a .env formatted string.
     */
    public serializeEnv(): string {
        return Object.entries(config)
            .map((value) => `${value[0]}=${value[1]}`)
            .join('\n');
    }

    /**
     * Writes the default config to the specified path if it doesn't exist.
     * Is only called once, on initialization.
     */
    public static async writeEnv(filePath: string): Promise<void> {
        const fileExists = await fs
            .stat(filePath)
            .then(() => true)
            .catch(() => false);

        if (fileExists) return;

        try {
            const defaults = Object.entries(configSchema)
                .map((value) => `${value[0]}=${value[1].default}`)
                .join('\n');

            await fs.writeFile(filePath, defaults, 'utf-8');
            wLogger.debug(`[config] Config file created at '${filePath}'.`);
        } catch (e) {
            if (!(e instanceof Error) || !('code' in e)) return;
            let cause: string = 'unknown';

            if (e.code === 'EPERM') cause = 'missing write permissions.';
            else if (e.code === 'ENOSPC') cause = 'disk full.';

            wLogger.error(`[config] Failed to write config file: ${cause}`);
            wLogger.debug(`[config] Failed to write config file: ${e}`);
        }
    }

    /**
     * Writes the current config object to the .env file.
     */
    public async updateEnv() {
        const oldHash = this.lastFileHash;

        try {
            const content = this.serializeEnv();
            const newHash = createHash('sha256').update(content).digest('hex');

            if (newHash === oldHash) return;
            this.lastFileHash = newHash;

            await fs.writeFile(this._path, content, 'utf-8');
            wLogger.debug('[config] Config file saved successfully.');

            dotenv.config({ path: this._path, override: true });
        } catch (e) {
            this.lastFileHash = oldHash;

            if (!(e instanceof Error) || !('code' in e)) return;
            let cause: string = 'unknown cause';

            if (e.code === 'EPERM') cause = 'missing write permissions.';
            else if (e.code === 'ENOSPC') cause = 'disk full.';

            wLogger.error(`[config] Failed to update config file: ${cause}`);
            wLogger.debug(`[config] Failed to update config file: ${e}`);
        }
    }

    /**
     * Update's the config object with a typed .env object value.
     */
    public processItem(
        key: ConfigKeys,
        item: ConfigItem<ConfigKeys>,
        env: Record<string, string>
    ): void {
        const raw = env[item.binding];
        if (raw === undefined || raw === null) return;

        let value = item.default;
        switch (typeof item.default) {
            case 'boolean': {
                value = value === true || raw === 'true';
                break;
            }

            case 'number': {
                if (isRealNumber(raw)) value = +raw;
                break;
            }

            case 'string': {
                value = raw;
                break;
            }

            default: {
                wLogger.warn(
                    `[config] Value of '${item.binding}' is not of type '${typeof item.default}'. Using default value.`
                );
                break;
            }
        }

        this.set(key as ConfigKeys, value);
    }

    /**
     * Refreshes the config object with the passed .env object.
     */
    public refreshConfig(env: Record<string, string>): void {
        for (const key in configSchema) {
            if (!Object.hasOwn(configSchema, key)) continue;

            const item = configSchema[key as ConfigKeys];
            if (item === undefined || item === null) continue;

            this.processItem(key as ConfigKeys, item, env);
        }
    }

    /**
     * Restarts the HTTP server if the server IP or port has changed.
     */
    private handleServerRestart(oldConfig: GlobalConfig): void {
        const ipChanged = oldConfig.serverIP !== config.serverIP;
        const portChanged = oldConfig.serverPort !== config.serverPort;

        if (ipChanged || portChanged) {
            this.httpServer.restart();
        }
    }

    /**
     * Manages the game overlay's lifecycle based on config changes.
     */
    private async handleOverlayUpdate(oldConfig: GlobalConfig): Promise<void> {
        const oldEnableOverlay = oldConfig.enableIngameOverlay;
        const newEnableOverlay = config.enableIngameOverlay;

        const instanceManager = this.httpServer.instanceManager;

        if (!oldEnableOverlay && !newEnableOverlay) {
            return;
        }

        if (oldEnableOverlay && !newEnableOverlay) {
            if (instanceManager.isOverlayStarted) {
                await instanceManager.stopOverlay();
            }
            return;
        }

        if (!oldEnableOverlay && newEnableOverlay) {
            await instanceManager.updateOverlayConfig();
            await instanceManager.startOverlay();
            return;
        }

        const keybindChanged =
            oldConfig.ingameOverlayKeybind !== config.ingameOverlayKeybind;
        const maxFpsChanged =
            oldConfig.ingameOverlayMaxFps !== config.ingameOverlayMaxFps;

        if (oldEnableOverlay && newEnableOverlay) {
            if (keybindChanged || maxFpsChanged)
                await instanceManager.updateOverlayConfig();

            if (maxFpsChanged && instanceManager.isOverlayStarted) {
                // setFrameRate doesn't work after paint event. Overlay must be restarted.
                await instanceManager.stopOverlay();
                await instanceManager.startOverlay();
            }
        }
    }

    /**
     * Runs all handlers that respond to config changes.
     */
    public async runChangeHandlers(oldConfig: GlobalConfig): Promise<void> {
        await checkGameOverlayConfig();
        this.handleServerRestart(oldConfig);
        await this.handleOverlayUpdate(oldConfig);
    }

    /**
     * Watches the .env file for external changes and reloads the config if any are detected.
     */
    private async startConfigWatcher(): Promise<void> {
        const watcher = fs.watch(this._path);
        wLogger.debug('[config] Started config watcher..');

        // initial file hash calculation
        this.lastFileHash = await fs
            .readFile(this._path, 'utf8')
            .then((c) => createHash('sha256').update(c).digest('hex'))
            .catch(() => '');

        for await (const event of watcher) {
            /*
             * There's a Node.js flaw where sometimes eventType is 'rename' instead of 'change'.
             * If the watcher ever fails to reload the config without an error, it's because of this.
             *
             * See https://nodejs.org/docs/latest/api/fs.html#caveats
             */
            if (event.eventType !== 'change') return;

            try {
                const content = await fs.readFile(this._path, 'utf8');
                const currentHash = createHash('sha256')
                    .update(content)
                    .digest('hex');

                if (currentHash === this.lastFileHash) return;
                this.lastFileHash = currentHash;

                wLogger.debug('[config] File changed. Refreshing config...');
                const oldConfig = { ...config };
                const newEnv = dotenv.parse(content);
                this.refreshConfig(newEnv);

                await this.runChangeHandlers(oldConfig);
            } catch (e) {
                const msg = e instanceof Error ? e.message : String(e);
                wLogger.error(`[config] Failed to reload config: ${msg}`);
                wLogger.debug(`[config] Failed to reload config: ${e}`);
            }
        }
    }
}

let managerInstance: ConfigManager | null = null;

export const _updateSettingsFromApi = async (
    settings: Record<string, string>
) => {
    if (!managerInstance) {
        throw new Error('Config Manager is not initialized.');
    }

    const oldConfig = { ...managerInstance.config };
    for (const key in settings) {
        if (!Object.hasOwn(configSchema, key)) continue;

        const item = configSchema[key as ConfigKeys];
        if (item === undefined || item === null) continue;

        managerInstance.processItem(key as ConfigKeys, item, settings);
    }

    await managerInstance.runChangeHandlers(oldConfig);
};

export const configInitialization = async (httpServer: any) => {
    managerInstance = await ConfigManager.initialize(configPath, httpServer);

    // Create user-specified static folder
    await fs.mkdir(config.staticFolderPath, { recursive: true }).catch(null);
};
