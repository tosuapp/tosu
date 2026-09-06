import {
    Bitness,
    ClientType,
    GameState,
    JsonSafeParse,
    config,
    getCachePath,
    getProgramPath,
    sleep,
    wLogger
} from '@tosu/common';
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';

import localOffsets from '@/assets/offsets.json';
import { LazerMemory } from '@/memory/lazer';

import { AbstractInstance } from '.';

/**
 * osu!lazer-family client flavor.
 * - `osu`: official osu!lazer (osu!.exe / osulazer.exe, osu!.deps.json)
 * - `torii`: torii / torii nova community fork (torii.exe, torii.deps.json,
 *   recompiled assemblies and its own version scheme, e.g. 2026.901.3-nova)
 */
export type LazerFlavor = 'osu' | 'torii';

export class LazerInstance extends AbstractInstance {
    memory: LazerMemory;
    previousCombo: number = 0;

    flavor: LazerFlavor = 'osu';

    constructor(pid: number) {
        super(pid, Bitness.x64);
        this.memory = new LazerMemory(this.process, this);
    }

    override async initiate() {
        try {
            const startTime = this.process.getStartTime();
            const age = startTime > 0 ? Date.now() - startTime : 0;
            const waitMs = Math.max(0, 15 * 1000 - age);

            if (waitMs > 0) {
                wLogger.info(
                    `%${ClientType[this.client]}%`,
                    `Waiting %${(waitMs / 1000).toFixed(1)}s% for lazer startup before reading memory...`
                );
                await sleep(waitMs);
            }

            const cacheFolder = getCachePath();
            if (!fs.existsSync(cacheFolder))
                await fsp.mkdir(cacheFolder, { recursive: true });

            this.version = (await this.getOsuVersion()) as typeof this.version;

            if (!this.version) {
                wLogger.error(
                    `Unable to find osu! version for ${ClientType[this.client]} %${this.pid}%. Please report this issue: https://discord.gg/WX7BTs8kwh`
                );

                this.regularDataLoop();
                this.preciseDataLoop();

                return;
            }

            const controller = new AbortController();

            const offsetsResolved =
                this.flavor === 'torii'
                    ? await this.resolveToriiOffsets(controller)
                    : await this.resolveOsuOffsets(cacheFolder, controller);

            if (!offsetsResolved) {
                return;
            }

            this.regularDataLoop();
            this.preciseDataLoop();
        } catch (exc) {
            wLogger.error(
                `Failed to initiate client instance for ${ClientType[this.client]} %${this.pid}%:`,
                (exc as Error).message
            );
            wLogger.debug(`Client initiation error details:`, exc);
        }
    }

    async regularDataLoop(): Promise<void> {
        wLogger.debug(`Starting regular data loop for client %${this.pid}%`);

        const {
            global,
            menu,
            bassDensity,
            beatmapPP,
            gameplay,
            resultScreen,
            settings,
            user,
            lazerMultiSpectating,
            rankedPlay
        } = this.getServices([
            'global',
            'menu',
            'bassDensity',
            'beatmapPP',
            'gameplay',
            'resultScreen',
            'settings',
            'tourneyManager',
            'user',
            'lazerMultiSpectating',
            'rankedPlay'
        ]);

        while (!this.isDestroyed) {
            try {
                const globalUpdate = global.updateState();
                if (globalUpdate === 'not-ready') {
                    await sleep(config.pollRate);
                    continue;
                }

                const menuUpdate = menu.updateState();
                if (menuUpdate === 'not-ready') {
                    await sleep(config.pollRate);
                    continue;
                }

                menu.updateMP3Length();

                if (!global.gameFolder) {
                    global.setGameFolder(this.path);
                    global.setSongsFolder(global.memorySongsFolder);
                }

                // update important data before doing rest
                if (global.status === GameState.resultScreen) {
                    const resultUpdate = resultScreen.updateState();
                    if (resultUpdate === 'not-ready') {
                        await sleep(config.pollRate);
                        continue;
                    }
                }

                rankedPlay.updateState();

                settings.updateState();

                const currentMods =
                    global.status === GameState.play
                        ? gameplay.mods
                        : global.status === GameState.resultScreen
                          ? resultScreen.mods
                          : global.menuMods;

                const currentMode =
                    global.status === GameState.play
                        ? gameplay.mode
                        : global.status === GameState.resultScreen
                          ? resultScreen.mode
                          : menu.gamemode;

                const currentState = `${menu.checksum}:${currentMode}:${currentMods.checksum}`;
                const updateGraph =
                    this.previousState !== currentState ||
                    this.previousMP3Length !== menu.mp3Length;
                if (global.gameFolder && this.previousState !== currentState) {
                    const metadataUpdate = beatmapPP.updateMapMetadata(
                        currentMods,
                        currentMode,
                        true
                    );
                    if (metadataUpdate === 'not-ready') {
                        await sleep(config.pollRate);
                        continue;
                    }

                    beatmapPP.updateGraph();
                    this.previousState = currentState;
                }

                if (global.gameFolder && updateGraph) {
                    beatmapPP.updateGraph();
                    this.previousMP3Length = menu.mp3Length;
                }

                beatmapPP.updateEventsStatus(global.playTime, currentMods.rate);

                switch (global.status) {
                    case GameState.menu:
                        bassDensity.updateState();
                        break;

                    case GameState.edit:
                        if (this.previousTime === global.playTime) break;

                        this.previousTime = global.playTime;
                        beatmapPP.updateEditorPP();
                        break;

                    case GameState.selectPlay:
                        // Reset Gameplay/ResultScreen data on joining to songSelect
                        if (!gameplay.isDefaultState) {
                            gameplay.init(undefined, '4,5');
                            resultScreen.init();
                            beatmapPP.resetAttributes();
                        }

                        // Reset ResultScreen if we in song select
                        if (resultScreen.playerName) {
                            resultScreen.init();
                        }
                        break;

                    case GameState.play:
                        // Reset gameplay data on retry
                        if (this.previousTime > global.playTime) {
                            gameplay.init(true);
                            beatmapPP.resetAttributes();
                        }

                        // reset before first object
                        if (global.playTime <= beatmapPP.timings.firstObj) {
                            gameplay.resetQuick();
                            gameplay.resetHitErrors();
                        }

                        gameplay.updateState();

                        // support replay rewind
                        if (this.previousCombo > gameplay.combo) {
                            gameplay.resetQuick();
                        }

                        this.previousTime = global.playTime;
                        this.previousCombo = gameplay.combo;
                        break;

                    case GameState.resultScreen:
                        resultScreen.updatePerformance();
                        break;

                    case GameState.lobby:
                        lazerMultiSpectating.updateState();

                        break;

                    default:
                        gameplay.init(undefined, `default-${global.status}`);
                        resultScreen.init();
                        break;
                }

                user.updateState();

                await sleep(config.pollRate);
            } catch (exc) {
                wLogger.error(
                    `%${ClientType[this.client]}%`,
                    `Error in regular data loop:`,
                    (exc as Error).message
                );
                wLogger.debug(`Regular loop error details:`, exc);
            }
        }
    }

    async preciseDataLoop(): Promise<void> {
        const { global, gameplay } = this.getServices(['global', 'gameplay']);

        while (!this.isDestroyed) {
            try {
                global.updatePreciseState();

                switch (global.status) {
                    case GameState.play:
                        if (global.playTime < 150) {
                            break;
                        }

                        if (config.enableKeyOverlay) {
                            gameplay.updateKeyOverlay();
                        }
                        gameplay.updateHitErrors();
                        break;
                    default:
                        gameplay.resetKeyOverlay();
                        break;
                }

                await sleep(config.preciseDataPollRate);
            } catch (exc) {
                wLogger.error(
                    `%${ClientType[this.client]}%`,
                    `Error in precise data loop:`,
                    (exc as Error).message
                );
                wLogger.debug(`Precise loop error details:`, exc);
            }
        }
    }

    /**
     * Official osu!lazer offsets resolution: local cache first (per exact
     * version), then remote hosts. Unchanged from upstream tosu behavior.
     */
    private async resolveOsuOffsets(
        cacheFolder: string,
        controller: AbortController
    ): Promise<boolean> {
        const jsonCache = path.join(cacheFolder, `${this.version}.json`);
        if (
            localOffsets.OsuVersion !== this.version &&
            fs.existsSync(jsonCache)
        ) {
            this.memory.offsets = JsonSafeParse({
                isFile: true,
                payload: jsonCache,
                defaultValue: null
            });

            wLogger.info(
                `Loaded offsets from cache for version %${this.version}%`
            );
        }

        if (
            this.memory.offsets === null ||
            this.memory.offsets.OsuVersion !== this.version
        ) {
            const fetched = await this.fetchRemoteOffsets(
                this.version,
                jsonCache,
                controller
            );

            if (
                !fetched ||
                this.memory.offsets === null ||
                this.memory.offsets.OsuVersion !== this.version
            ) {
                wLogger.error(
                    `Failed to fetch offsets for %${this.version}%, report to devs: https://discord.gg/WX7BTs8kwh`
                );
                return false;
            }
        }

        if (this.memory.offsets === null) {
            wLogger.error(
                `Offsets not found for osu! version %${this.version}%`
            );
            return false;
        }

        return true;
    }

    /**
     * Torii offsets resolution.
     *
     * tosu.app only hosts offsets for official osu!lazer builds, and torii is
     * a recompiled fork that adds its own fields to OsuGame/OsuGameBase (and
     * torii nova runs .NET 10), so official offsets generally do NOT apply.
     * The reliable source is a locally generated offsets file produced by the
     * `tools/torii-offsets` generator against the actual torii install.
     *
     * Search order:
     *  1. TOSU_TORII_OFFSETS env (file, or folder containing <version>.json)
     *  2. <cache>/torii/<version>.json
     *  3. <program folder>/torii-offsets/<version>.json
     *  4. (gamble) official upstream offsets for the numeric base version —
     *     will only work if that torii build didn't shift any read fields;
     *     the structural game-base validation protects against garbage.
     */
    private async resolveToriiOffsets(
        controller: AbortController
    ): Promise<boolean> {
        const searchPaths = this.getToriiOffsetsPaths();

        for (const offsetsPath of searchPaths) {
            if (!fs.existsSync(offsetsPath)) continue;

            const json = JsonSafeParse({
                isFile: true,
                payload: offsetsPath,
                defaultValue: null
            });

            if (json === null || typeof json !== 'object') {
                wLogger.warn(
                    `Broken torii offsets file %${offsetsPath}%, skipping`
                );
                continue;
            }

            if (json.OsuVersion !== this.version) {
                wLogger.warn(
                    `Torii offsets file %${offsetsPath}% says version %${json.OsuVersion}% but the client is %${this.version}% — using it anyway; if reads fail, regenerate offsets for this exact build`
                );
            }

            json.OsuVersion = this.version;
            this.memory.offsets = json;

            wLogger.info(
                `Loaded torii offsets from %${offsetsPath}% for version %${this.version}%`
            );
            return true;
        }

        const numericVersion = this.version.split('-')[0];
        wLogger.warn(
            `No torii offsets found for %${this.version}%; falling back to official lazer offsets for %${numericVersion}%. This usually FAILS for torii builds — generate offsets with tools/torii-offsets (see TORII.md)`
        );

        const jsonCache = path.join(
            getCachePath(),
            'torii',
            `upstream-${numericVersion}.json`
        );

        // reuse a previously fetched upstream fallback before hitting network
        if (fs.existsSync(jsonCache)) {
            const cached = JsonSafeParse({
                isFile: true,
                payload: jsonCache,
                defaultValue: null
            });
            if (cached !== null && typeof cached === 'object') {
                cached.OsuVersion = this.version;
                this.memory.offsets = cached;

                wLogger.info(
                    `Loaded cached upstream offsets from %${jsonCache}%`
                );
                return true;
            }
        }

        if (
            await this.fetchRemoteOffsets(numericVersion, jsonCache, controller)
        ) {
            if (this.memory.offsets !== null) {
                this.memory.offsets.OsuVersion = this.version;
            }
            return true;
        }

        wLogger.error(
            `Failed to find offsets for torii %${this.version}%. Generate them with the torii-offsets tool (see TORII.md) and place "${this.version}.json" into one of: ${searchPaths.join(' | ')}`
        );
        return false;
    }

    private getToriiOffsetsPaths(): string[] {
        const paths: string[] = [];

        const envPath = process.env.TOSU_TORII_OFFSETS || '';
        if (envPath !== '') {
            const stats = fs.statSync(envPath, { throwIfNoEntry: false });
            paths.push(
                stats?.isDirectory()
                    ? path.join(envPath, `${this.version}.json`)
                    : envPath
            );
        }

        paths.push(path.join(getCachePath(), 'torii', `${this.version}.json`));
        paths.push(
            path.join(getProgramPath(), 'torii-offsets', `${this.version}.json`)
        );

        return paths;
    }

    private async fetchRemoteOffsets(
        version: string,
        jsonCache: string,
        controller: AbortController
    ): Promise<boolean> {
        const links = [
            `https://tosu.app/offsets/${version}.json`,
            `https://osuck.net/offsets/${version}.json`
        ];

        for (let i = 0; i < links.length; i++) {
            const link = links[i];
            const host = new URL(link).host;

            const timeout = setTimeout(() => controller.abort(), 10_000);
            try {
                const request = await fetch(link, {
                    method: 'GET',
                    signal: controller.signal,
                    headers: {
                        'User-Agent': `tosu/${version} (https://tosu.app; i@kotrik.ru)`
                    }
                });

                clearTimeout(timeout);
                if (!request.ok) {
                    wLogger.debug(
                        `Failed to fetch offsets from %${host}%:`,
                        request.status,
                        request.statusText
                    );
                    continue;
                }

                const text = await request.text();
                const json = JsonSafeParse({
                    isFile: false,
                    payload: text,
                    defaultValue: null
                });
                if (json === null) {
                    wLogger.debug(
                        `Broken response from %${host}%:`,
                        request.status,
                        request.statusText
                    );
                    continue;
                }

                wLogger.info(
                    `Successfully retrieved offsets for version %${version}%`
                );

                this.memory.offsets = json;

                await fsp.mkdir(path.dirname(jsonCache), { recursive: true });
                await fsp.writeFile(jsonCache, text, 'utf8');

                return true;
            } catch (exc) {
                clearTimeout(timeout);
                wLogger.error(
                    `Error fetching offsets from %${host}%:`,
                    (exc as any).message
                );
                wLogger.debug(`Offset fetch error details:`, exc);
            }
        }

        return false;
    }

    async getOsuVersion() {
        const rootPath = await this.process.getRootPath();

        const isAppImage =
            process.platform === 'linux' && rootPath.includes('/tmp/.mount_');
        const isRoot = process.platform === 'linux' && process.getuid?.() === 0;

        // Official lazer ships "osu!.deps.json" with a library key like
        // "osu!/2026.525.0-lazer". Torii ships "torii.deps.json" (its entry
        // assembly is torii.dll) with keys like "torii/2026.901.3-torii" or
        // "torii/2026.901.3-nova".
        const candidates: {
            flavor: LazerFlavor;
            file: string;
            libPrefix: string;
        }[] = [
            { flavor: 'osu', file: 'osu!.deps.json', libPrefix: 'osu!/' },
            { flavor: 'torii', file: 'torii.deps.json', libPrefix: 'torii/' }
        ];

        for (const candidate of candidates) {
            let osuDepsJson: { libraries: Record<string, unknown> } = {
                libraries: {}
            };

            try {
                const filePath = path.join(rootPath, candidate.file);

                const osuDepsRaw =
                    isRoot && isAppImage
                        ? await this.process.readFileAsOwner(filePath)
                        : await fsp.readFile(filePath, 'utf-8');

                osuDepsJson = JSON.parse(osuDepsRaw);
            } catch {
                continue;
            }

            const osuLib =
                Object.keys(osuDepsJson.libraries).find((key) =>
                    key.startsWith(candidate.libPrefix)
                ) || '';
            if (osuLib === '') continue;

            // key example: osu!/2026.525.0-lazer | torii/2026.901.3-nova
            const rawVersion = osuLib.slice(osuLib.indexOf('/') + 1);
            const dashIndex = rawVersion.indexOf('-');

            // Official lazer: strip the "-lazer" suffix (existing behavior).
            // Torii: KEEP the "-torii"/"-nova" suffix — the two streams are
            // compiled against different runtimes (.NET 8 vs .NET 10) and
            // need separate offsets files.
            const osuVersion =
                candidate.flavor === 'torii' || dashIndex === -1
                    ? rawVersion
                    : rawVersion.slice(0, dashIndex);

            this.flavor = candidate.flavor;

            wLogger.info(
                `Detected %${candidate.flavor === 'torii' ? 'torii' : 'osu!'}% version: %${osuVersion}%`
            );
            return osuVersion;
        }

        wLogger.error("Can't read osu dependencies");
        return '';
    }
}
