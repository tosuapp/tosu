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

export type ConfigKey = keyof Config;
export type ConfigBinding = {
    [K in keyof Config]: Config[K] extends { binding: infer binding }
        ? binding
        : never;
}[keyof Config];

interface ConfigItem<K extends ConfigKey> {
    binding: Config[K]['binding'];
    default: Config[K]['type'];
}

type ConfigSchema = {
    [K in ConfigKey]: {
        binding: Config[K]['binding'];
        default: Config[K]['type'];
    };
};

type GlobalConfig = {
    [K in ConfigKey]: Config[K]['type'];
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

export const config: GlobalConfig = new Proxy(
    Object.entries(configSchema).reduce((value, item) => {
        const key = item[0] as ConfigKey;
        value[key] = item[1].default as never;

        return value;
    }, {} as GlobalConfig),
    {
        set: (target, key: ConfigKey, value, receiver) =>
            ConfigManager.set(target, key, value, receiver)
    }
);

const oldConfigPath = path.join(getProgramPath(), 'tsosu.env');
const configPath = path.join(getProgramPath(), 'tosu.env');

export class ConfigManager {
    private static previousFileHash: string = '';

    private static saveTimeout: NodeJS.Timeout | null = null;
    private static httpServer: any;

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

            const newEnv =
                (await fs
                    .readFile(configPath, 'utf8')
                    .then(dotenv.parse)
                    .catch(() => null)) || {};

            const migratedEnv: Record<string, string> = {};
            for (const key in configSchema) {
                if (!Object.hasOwn(configSchema, key)) continue;

                const item = configSchema[key as ConfigKey];

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
    ): Promise<void> {
        await this.migrate(oldConfigPath);
        await this.writeEnv(filePath);

        const env = await fs
            .readFile(filePath, 'utf-8')
            .then(
                (content) =>
                    dotenv.parse(content) as Record<ConfigBinding, string>
            )
            .catch(() => ({}) as Record<ConfigBinding, string>);

        this.httpServer = httpServer;
        this.refreshConfig(env);
        this.startConfigWatcher();
    }

    /**
     * Set property to a config file
     */
    public static set<B extends ConfigKey>(
        target: GlobalConfig,
        key: B,
        value: GlobalConfig[B],
        receiver: any
    ): boolean {
        if (config[key] !== value) {
            this.save();
        }

        return Reflect.set(target, key, value, receiver);
    }

    /**
     * Schedules a debounced save to the .env file.
     */
    public static save() {
        if (this.saveTimeout) clearTimeout(this.saveTimeout);

        this.saveTimeout = setTimeout(async () => {
            await this.updateEnv();
        }, 500);
    }

    /**
     * Writes the default config to the specified path if it doesn't exist.
     * Is only called once, on initialization.
     */
    public static async writeEnv(filePath: string): Promise<void> {
        const file = await fs.open(filePath, 'wx').catch(() => null);
        if (!file) {
            return;
        }

        try {
            const defaults = Object.values(configSchema)
                .map((value) => `${value.binding}=${value.default}`)
                .join('\n');
            await file.writeFile(defaults, 'utf-8');
            wLogger.debug(`[config] Config file created at '${filePath}'.`);
        } catch (e) {
            if (!(e instanceof Error) || !('code' in e)) return;
            let cause: string = 'unknown';

            if (e.code === 'EPERM') cause = 'missing write permissions.';
            else if (e.code === 'ENOSPC') cause = 'disk full.';

            wLogger.error(`[config] Failed to write config file: ${cause}`);
            wLogger.debug(`[config] Failed to write config file: ${e}`);
        } finally {
            await file.close();
        }
    }

    /**
     * Writes the current config object to the .env file.
     */
    public static async updateEnv() {
        const oldHash = this.previousFileHash;

        try {
            const content = Object.entries(config)
                .map(
                    (value) =>
                        `${configSchema[value[0] as ConfigKey].binding}=${value[1]}`
                )
                .join('\n');
            const newHash = createHash('sha256').update(content).digest('hex');

            if (newHash === oldHash) return;
            this.previousFileHash = newHash;

            await fs.writeFile(configPath, content, 'utf-8');
            wLogger.debug('[config] Config file saved successfully.');

            dotenv.config({ path: configPath, override: true });
        } catch (e) {
            this.previousFileHash = oldHash;

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
    public static processItem<B extends ConfigKey>(
        key: B,
        item: ConfigItem<ConfigKey>,
        env: Record<ConfigBinding, string>
    ): void {
        const raw = env[item.binding];
        if (raw === undefined || raw === null) return;

        let value = item.default;
        switch (typeof item.default) {
            case 'boolean': {
                value = raw === 'true';
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

        config[key] = value as GlobalConfig[B];
    }

    /**
     * Refreshes the config object with the passed .env object.
     */
    public static async refreshConfig(
        env: Record<ConfigBinding, string>
    ): Promise<void> {
        const oldConfig = { ...config };
        for (const key in configSchema) {
            if (!Object.hasOwn(configSchema, key)) continue;

            const item = configSchema[key as ConfigKey];
            if (item === undefined || item === null) continue;

            this.processItem(key as ConfigKey, item, env);
        }

        await checkGameOverlayConfig();
        this.handleServerRestart(oldConfig);
        this.handleOverlayUpdate(oldConfig);
    }

    /**
     * Restarts the HTTP server if the server IP or port has changed.
     */
    private static handleServerRestart(oldConfig: GlobalConfig): void {
        const ipChanged = oldConfig.serverIP !== config.serverIP;
        const portChanged = oldConfig.serverPort !== config.serverPort;

        if (ipChanged || portChanged) {
            this.httpServer.restart();
        }
    }

    /**
     * Manages the game overlay's lifecycle based on config changes.
     */
    private static async handleOverlayUpdate(
        oldConfig: GlobalConfig
    ): Promise<void> {
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
     * Watches the .env file for external changes and reloads the config if any are detected.
     */
    private static async startConfigWatcher(): Promise<void> {
        const watcher = fs.watch(configPath);
        wLogger.debug('[config] Started config watcher..');

        // initial file hash calculation
        this.previousFileHash = await fs
            .readFile(configPath, 'utf8')
            .then((c) => createHash('sha256').update(c).digest('hex'))
            .catch(() => '');

        for await (const event of watcher) {
            /*
             * There's a Node.js flaw where sometimes eventType is 'rename' instead of 'change'.
             * If the watcher ever fails to reload the config without an error, it's because of this.
             *
             * See https://nodejs.org/docs/latest/api/fsp.html#caveats
             */

            switch (event.eventType) {
                case 'change': {
                    try {
                        const content = await fs.readFile(configPath, 'utf8');
                        const currentHash = createHash('sha256')
                            .update(content)
                            .digest('hex');

                        if (currentHash === this.previousFileHash) continue;
                        this.previousFileHash = currentHash;

                        wLogger.debug(
                            '[config] File changed. Refreshing config...'
                        );
                        const newEnv: Record<ConfigBinding, string> =
                            dotenv.parse(content);

                        await this.refreshConfig(newEnv);
                    } catch (exc) {
                        const msg =
                            exc instanceof Error ? exc.message : String(exc);
                        wLogger.error(
                            `[config] Failed to reload config: ${msg}`
                        );
                        wLogger.debug(
                            `[config] Failed to reload config: ${exc}`
                        );
                    }

                    break;
                }

                case 'rename': {
                    // no need to check if it exists because writeEnv already checks that
                    await ConfigManager.writeEnv(configPath);
                    break;
                }
            }
        }
    }
}

export async function configInitialization(httpServer: any) {
    await ConfigManager.initialize(configPath, httpServer);

    // Create user-specified static folder
    await fs.mkdir(config.staticFolderPath, { recursive: true }).catch(null);
}
