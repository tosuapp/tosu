import { createHash } from 'crypto';
import * as dotenv from 'dotenv';
import EventEmitter from 'node:events';
import fs from 'node:fs/promises';
import path from 'path';

import {
    ConfigBinding,
    ConfigEvents,
    ConfigItem,
    ConfigKey,
    ConfigSchema,
    GlobalConfig
} from './config.types';
import { getProgramPath } from './directories';
import { wLogger } from './logger';
import { isRealNumber } from './manipulation';

const defaultSchema: ConfigSchema = {
    enableAutoUpdate: {
        binding: 'ENABLE_AUTOUPDATE',
        default: true,
        order: 1
    },
    openDashboardOnStartup: {
        binding: 'OPEN_DASHBOARD_ON_STARTUP',
        default: true,
        order: 2
    },
    debugLog: {
        binding: 'DEBUG_LOG',
        default: false,
        order: 0
    },
    calculatePP: {
        binding: 'CALCULATE_PP',
        default: true,
        order: 4
    },
    enableKeyOverlay: {
        binding: 'ENABLE_KEY_OVERLAY',
        default: true,
        order: 5
    },
    pollRate: {
        binding: 'POLL_RATE',
        default: 100,
        order: 6
    },
    preciseDataPollRate: {
        binding: 'PRECISE_DATA_POLL_RATE',
        default: 10,
        order: 7
    },
    showMpCommands: {
        binding: 'SHOW_MP_COMMANDS',
        default: false,
        order: 3
    },
    serverIP: {
        binding: 'SERVER_IP',
        default: '127.0.0.1',
        order: 11
    },
    serverPort: {
        binding: 'SERVER_PORT',
        default: 24050,
        order: 12
    },
    staticFolderPath: {
        binding: 'STATIC_FOLDER_PATH',
        default: './static',
        order: 14
    },
    enableIngameOverlay: {
        binding: 'ENABLE_INGAME_OVERLAY',
        default: false,
        order: 5
    },
    ingameOverlayKeybind: {
        binding: 'INGAME_OVERLAY_KEYBIND',
        default: 'Control + Shift + Space',
        order: 9
    },
    ingameOverlayMaxFps: {
        binding: 'INGAME_OVERLAY_MAX_FPS',
        default: 60,
        order: 10
    },
    allowedIPs: {
        binding: 'ALLOWED_IPS',
        default: '127.0.0.1,localhost,absolute',
        order: 13
    }
};

const newlineInsertions: ConfigBinding[] = [
    'OPEN_DASHBOARD_ON_STARTUP',
    'CALCULATE_PP',
    'ENABLE_INGAME_OVERLAY',
    'PRECISE_DATA_POLL_RATE',
    'INGAME_OVERLAY_MAX_FPS',
    'ALLOWED_IPS'
];

export const configEvents = new EventEmitter<ConfigEvents>();

export const config: GlobalConfig = new Proxy(
    Object.entries(defaultSchema).reduce((value, item) => {
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
    private static initialized: boolean = false;

    private static previousFileHash: string = '';
    private static saveTimeout: NodeJS.Timeout | null = null;

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
            for (const key in defaultSchema) {
                if (!Object.hasOwn(defaultSchema, key)) continue;

                const item = defaultSchema[key as ConfigKey];

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
    public static async initialize(filePath: string): Promise<void> {
        await this.migrate(oldConfigPath);
        await this.writeEnv(filePath);

        const env = await fs
            .readFile(filePath, 'utf-8')
            .then(
                (content) =>
                    dotenv.parse(content) as Record<ConfigBinding, string>
            )
            .catch(() => ({}) as Record<ConfigBinding, string>);

        this.refreshConfig(env, false);
        this.startConfigWatcher();

        this.initialized = true;
    }

    /**
     * Set property to a config file
     */
    public static set<T extends ConfigKey>(
        target: GlobalConfig,
        key: T,
        value: GlobalConfig[T],
        receiver: any
    ): boolean {
        if (this.initialized === true && config[key] !== value) {
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
        }, 100);
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
            const defaults = Object.values(defaultSchema)
                .toSorted((a, b) => a.order - b.order)
                .map((value) => {
                    if (newlineInsertions.includes(value.binding))
                        return `${value.binding}=${value.default}\n`;
                    return `${value.binding}=${value.default}`;
                })
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
            const content = Object.entries(defaultSchema)
                .toSorted((a, b) => a[1].order - b[1].order)
                .map((item) => {
                    if (newlineInsertions.includes(item[1].binding))
                        return `${item[1].binding}=${config[item[0] as ConfigKey]}\n`;
                    return `${item[1].binding}=${config[item[0] as ConfigKey]}`;
                })
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
        const raw: any = env[item.binding];
        if (raw === undefined || raw === null) return;

        let value = item.default;
        switch (typeof item.default) {
            case 'boolean': {
                value = raw === 'true' || raw === true;
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
    public static refreshConfig(
        env: Record<ConfigBinding, string>,
        emit: boolean
    ): void {
        const oldConfig = { ...config };
        for (const key in defaultSchema) {
            if (!Object.hasOwn(defaultSchema, key)) continue;

            const item = defaultSchema[key as ConfigKey];
            if (item === undefined || item === null) continue;

            this.processItem(key as ConfigKey, item, env);
        }

        if (emit === true) configEvents.emit('change', oldConfig);
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

                        this.refreshConfig(newEnv, true);
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

export async function configInitialization() {
    await ConfigManager.initialize(configPath);

    // Create user-specified static folder
    await fs.mkdir(config.staticFolderPath, { recursive: true }).catch(null);
}
