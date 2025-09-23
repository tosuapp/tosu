import { createHash } from 'crypto';
import * as dotenv from 'dotenv';
import fs from 'node:fs/promises';
import path from 'path';

import { getProgramPath } from './directories';
import { checkGameOverlayConfig } from './ingame';
import { wLogger } from './logger';

const envSchema = [
    {
        key: 'ENABLE_AUTOUPDATE',
        binding: 'enableAutoUpdate',
        default: true
    },
    {
        key: 'OPEN_DASHBOARD_ON_STARTUP',
        binding: 'openDashboardOnStartup',
        default: true
    },
    {
        key: 'DEBUG_LOG',
        binding: 'debugLog',
        default: false
    },
    {
        key: 'CALCULATE_PP',
        binding: 'calculatePP',
        default: true
    },
    {
        key: 'ENABLE_KEY_OVERLAY',
        binding: 'enableKeyOverlay',
        default: true
    },
    {
        key: 'POLL_RATE',
        binding: 'pollRate',
        default: 100
    },
    {
        key: 'PRECISE_DATA_POLL_RATE',
        binding: 'preciseDataPollRate',
        default: 10
    },
    {
        key: 'SHOW_MP_COMMANDS',
        binding: 'showMpCommands',
        default: false
    },
    {
        key: 'SERVER_IP',
        binding: 'serverIP',
        default: '127.0.0.1'
    },
    {
        key: 'SERVER_PORT',
        binding: 'serverPort',
        default: 24050
    },
    {
        key: 'STATIC_FOLDER_PATH',
        binding: 'staticFolderPath',
        default: './static'
    },
    {
        key: 'ENABLE_INGAME_OVERLAY',
        binding: 'enableIngameOverlay',
        default: false
    },
    {
        key: 'INGAME_OVERLAY_KEYBIND',
        binding: 'ingameOverlayKeybind',
        default: 'Control + Shift + Space'
    },
    {
        key: 'INGAME_OVERLAY_MAX_FPS',
        binding: 'ingameOverlayMaxFps',
        default: 60
    },
    {
        key: 'ALLOWED_IPS',
        binding: 'allowedIPs',
        default: '127.0.0.1,localhost,absolute'
    }
] as const;

type Widen<T> = T extends string
    ? string
    : T extends number
      ? number
      : T extends boolean
        ? boolean
        : unknown;

type EnvSchemaItem = (typeof envSchema)[number];
type ConfigDefault = {
    [K in ConfigKey]: Widen<Extract<EnvSchemaItem, { key: K }>['default']>;
};

export type ConfigKey = EnvSchemaItem['key'];
export type ConfigBinding = EnvSchemaItem['binding'];

interface Config {
    // Whether tosu should automatically check for and install updates.
    enableAutoUpdate: boolean;

    // Whether tosu should open the web dashboard on startup.
    openDashboardOnStartup: boolean;

    // Whether to show verbose logging for debugging purposes.
    debugLog: boolean;

    // Whether tosu should calculate performance points from game data.
    calculatePP: boolean;

    // Whether tosu should read osu!'s built-in key overlay data.
    enableKeyOverlay: boolean;

    // General data polling rate in milliseconds.
    pollRate: number;

    // More precise polling rate for critical data, in milliseconds. (e.g. key overlay data)
    preciseDataPollRate: number;

    // Whether to show bancho !mp commands in the tournament manager chat.
    showMpCommands: boolean;

    // The IP address tosu should serve on.
    serverIP: string;

    // The port tosu should serve on.
    serverPort: number;

    // Path to the folder containing pp counters.
    staticFolderPath: string;

    // Whether tosu should launch the in-game overlay.
    enableIngameOverlay: boolean;

    // The keybind to open the in-game overlay.
    ingameOverlayKeybind: string;

    // The maximum frames per second for the in-game overlay.
    ingameOverlayMaxFps: number;

    // Comma-separated list of allowed IPs for remote access.
    allowedIPs: string;
}

const oldConfigPath = path.join(getProgramPath(), 'tsosu.env');
const configPath = path.join(getProgramPath(), 'tosu.env');

export class ConfigManager {
    private readonly _path: string = undefined!;
    private readonly _config: Config;

    private lastFileHash: string = '';

    private saveTimeout: NodeJS.Timeout | null = null;
    private httpServer: any;

    private constructor(
        env: Record<string, string>,
        filePath: string,
        httpServer: any
    ) {
        this._path = filePath;
        this._config = {} as Config;
        this.httpServer = httpServer;

        for (const schemaItem of envSchema) {
            let value: any = schemaItem.default;
            const type = typeof value;

            const raw = env[schemaItem.key];
            if (raw !== undefined) {
                switch (type) {
                    case 'boolean': {
                        value = raw === 'true';
                        break;
                    }
                    case 'number': {
                        const num = Number(raw);
                        if (!isNaN(num)) value = num;
                        break;
                    }
                    case 'string': {
                        value = raw;
                        break;
                    }
                    default: {
                        wLogger.warn(
                            `[config] Value of '${schemaItem.key}' is not of type '${type}'. Using default value.`
                        );
                        break;
                    }
                }
            }

            this.set(schemaItem.binding, value);
        }
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

            const keys = envSchema.map((e) => e.key);
            const defaults = new Map<ConfigKey, unknown>(
                envSchema.map((e) => [e.key, e.default])
            );

            const migratedEnv: Record<string, string> = {};
            keys.forEach((key) => {
                migratedEnv[key] = newEnv[key];
                migratedEnv[key] ??= oldEnv[key];
                migratedEnv[key] ??= String(defaults.get(key));
            });

            const output = keys
                .map((key) => `${key}=${migratedEnv[key]}`)
                .join('\n');

            await fs.writeFile(configPath, output, 'utf-8');
            wLogger.warn(`[config] Your config file has been migrated.`);

            const deprecated = Object.keys(oldEnv).filter(
                (key) => !(keys as string[]).includes(key)
            );
            if (deprecated.length > 0) {
                wLogger.warn(
                    `[config] Deprecated properties: ${deprecated.join(', ')}.`
                );
            }

            const newProps = Object.keys(migratedEnv).filter(
                (key) => !Object.keys(newEnv).includes(key)
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
     * Gets the .env key from a config binding name.
     */
    private getKey(binding: ConfigBinding): ConfigKey | undefined {
        return envSchema.find((e) => e.binding === binding)?.key;
    }

    /**
     * Gets a config binding name from an .env key.
     */
    private getBinding(key: ConfigKey): ConfigBinding | undefined {
        return envSchema.find((e) => e.key === key)?.binding;
    }

    /**
     * Gets the default value for a given .env key.
     */
    private getDefault<K extends ConfigKey>(key: K): ConfigDefault[K] {
        return envSchema.find((e) => e.key === key)
            ?.default as ConfigDefault[K];
    }

    /**
     * Sets a config value and schedules a debounced save to the .env file.
     */
    public set<B extends ConfigBinding>(binding: B, value: Config[B]): boolean {
        if (this._config[binding] === value) {
            return false;
        }

        this._config[binding] = config[binding] = value;

        if (this.saveTimeout) clearTimeout(this.saveTimeout);
        this.saveTimeout = setTimeout(async () => {
            await this.updateEnv();
        }, 1_000);

        return true;
    }

    /**
     * Gets a config value from the config obj.
     */
    public get<B extends ConfigBinding>(binding: B): Config[B] {
        return this._config[binding];
    }

    /**
     * Getter that returns proxied access to the config object.
     */
    public get config(): Config {
        return new Proxy(this._config, {
            get: (_, key: ConfigBinding) => this.get(key),
            set: (_, key: ConfigBinding, value) => this.set(key, value)
        });
    }

    /**
     * Serializes the current config object into a .env formatted string.
     */
    public serializeEnv(): string {
        return envSchema
            .map((e) => {
                const value = this._config[e.binding];
                return `${e.key}=${String(value)}`;
            })
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
            const defaults = envSchema
                .map((e) => `${e.key}=${String(e.default)}`)
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
    private processSchemaItem<T extends (typeof envSchema)[number]>(
        schemaItem: T,
        env: Record<string, string>
    ): void {
        if (!(schemaItem.key in env)) return;

        const raw = env[schemaItem.key];
        const type = typeof schemaItem.default;

        if (type === 'boolean') {
            this.set(schemaItem.binding, raw === 'true');
        } else if (type === 'number') {
            const num = Number(raw);
            this.set(schemaItem.binding, isNaN(num) ? schemaItem.default : num);
        } else {
            this.set(schemaItem.binding, raw);
        }
    }

    /**
     * Refreshes the config object with the passed .env object.
     */
    public refreshConfig(env: Record<string, string>): void {
        envSchema.forEach((item) => this.processSchemaItem(item, env));
    }

    /**
     * Restarts the HTTP server if the server IP or port has changed.
     */
    private handleServerRestart(oldConfig: Config): void {
        const ipChanged = oldConfig.serverIP !== this._config.serverIP;
        const portChanged = oldConfig.serverPort !== this._config.serverPort;

        if (ipChanged || portChanged) {
            this.httpServer.restart();
        }
    }

    /**
     * Manages the game overlay's lifecycle based on config changes.
     */
    private async handleOverlayUpdate(oldConfig: Config): Promise<void> {
        const oldEnableOverlay = oldConfig.enableIngameOverlay;
        const newEnableOverlay = this._config.enableIngameOverlay;

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
            oldConfig.ingameOverlayKeybind !==
            this._config.ingameOverlayKeybind;
        const maxFpsChanged =
            oldConfig.ingameOverlayMaxFps !== this._config.ingameOverlayMaxFps;

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
    public async runChangeHandlers(oldConfig: Config): Promise<void> {
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
                const oldConfig = { ...this._config };
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

export const config: Config = envSchema.reduce(
    (acc, { binding, default: val }) => ({ ...acc, [binding]: val }),
    {} as Config
);

let managerInstance: ConfigManager | null = null;

export const _updateSettingsFromApi = async (settings: {
    [key: string]: any;
}) => {
    if (!managerInstance) {
        throw new Error('Config Manager is not initialized.');
    }

    const oldConfig = { ...managerInstance.config };

    const keyToBinding = envSchema.reduce(
        (acc, { key, binding }) => {
            acc[key] = binding;
            return acc;
        },
        {} as Record<string, string>
    );

    const bindingToSchema = envSchema.reduce(
        (acc, item) => {
            acc[item.binding] = item;
            return acc;
        },
        {} as Record<ConfigBinding, (typeof envSchema)[number]>
    );

    for (const key in settings) {
        const binding = keyToBinding[key] as ConfigBinding;
        if (binding) {
            const schemaItem = bindingToSchema[binding];
            let value = settings[key];

            if (typeof schemaItem.default === 'number') {
                value = Number(value);
            } else if (typeof schemaItem.default === 'boolean') {
                value = value === true || value === 'true';
            }

            managerInstance.set(binding, value);
        }
    }

    await managerInstance.runChangeHandlers(oldConfig);
};

export const configInitialization = async (httpServer: any) => {
    managerInstance = await ConfigManager.initialize(configPath, httpServer);

    // Create user-specified static folder
    await fs.mkdir(config.staticFolderPath, { recursive: true }).catch(null);
};
