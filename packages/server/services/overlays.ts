import type {
    Overlay,
    OverlayResolution,
    OverlayStatus,
    RawRepositoryOverlay
} from '@tosu/common';
import {
    downloadFile,
    getCachePath,
    getStaticPath,
    platformResolver,
    scanLocalOverlays,
    unzip,
    wLogger
} from '@tosu/common';
import { exec } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const OVERLAYS_API_URL = 'https://tosu.app/api.json';

export type OverlayStatusFilter = 'installed' | 'upgradable' | 'installable';

export interface OverlaysStatusInfo {
    totalCount: number;
    installedCount: number;
    updatesAvailable: number;
    hash: string;
}

function safeReadMetadata(filePath?: string): Map<string, string> {
    const metadata: Map<string, string> = new Map();

    if (!filePath || !fs.existsSync(filePath)) {
        return metadata;
    }

    try {
        const content = fs.readFileSync(filePath, 'utf8');

        for (const line of content.split(/\r?\n/)) {
            const trimmed = line.trim();
            const isCommentLine = trimmed.startsWith('##');

            if (trimmed.length === 0 || isCommentLine) {
                continue;
            }

            const cleanLine = trimmed.split('##')[0];
            const idx = cleanLine.indexOf(':');

            if (idx !== -1) {
                const key = cleanLine.slice(0, idx).trim().toLowerCase();
                const value = cleanLine.slice(idx + 1).trim();

                if (key && !metadata.has(key)) {
                    metadata.set(key, value);
                }
            }
        }

        return metadata;
    } catch (err) {
        wLogger.debug(
            `Failed to read overlay metadata file %${filePath}%:`,
            (err as Error).message
        );

        return new Map();
    }
}

function parseResolution(
    input?: string | (string | number)[]
): OverlayResolution {
    if (!input) return { width: null, height: null };

    const [w, h] = Array.isArray(input) ? input : String(input).split(/[x, ]+/);
    const width = parseInt(String(w), 10);
    const height = parseInt(String(h), 10);

    return {
        width: Number.isNaN(width) ? null : width,
        height: Number.isNaN(height) ? null : height
    };
}

function splitByComma(val?: string): string[] {
    if (!val) return [];
    return val
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
}

function generateHash(data: unknown): string {
    return crypto.createHash('md5').update(JSON.stringify(data)).digest('hex');
}

export class OverlaysService {
    private cache: Overlay[] = [];
    private hash = '';
    private updatesAvailable = 0;

    private watchDebounceTimer: NodeJS.Timeout | null = null;
    private syncPromise: Promise<void> | null = null;

    public async initialize(): Promise<void> {
        await this.syncAndRefresh(true);

        const staticPath = getStaticPath();
        try {
            fs.watch(staticPath, { recursive: false }, () => {
                if (this.watchDebounceTimer) {
                    clearTimeout(this.watchDebounceTimer);
                }

                this.watchDebounceTimer = setTimeout(() => {
                    this.syncAndRefresh(false).catch((err) => {
                        wLogger.error(
                            'Failed background overlay watch sync:',
                            (err as Error).message
                        );
                    });
                }, 500);
            });
        } catch (err) {
            wLogger.debug(
                'Failed to watch static folder:',
                (err as Error).message
            );
        }
    }

    private readDiskOverlays(): Overlay[] {
        const staticPath = getStaticPath();
        const folders = scanLocalOverlays(staticPath);

        return folders.map((folder) => {
            const parsed = safeReadMetadata(folder.metadataPath);
            const folderName = folder.folderName;

            return {
                id: folderName,
                name: parsed.get('name') || folderName,
                version: parsed.get('version') || '1.0.0',
                status: 'installed' as OverlayStatus,
                author: {
                    name: parsed.get('author') || '???',
                    links: splitByComma(parsed.get('authorlinks'))
                },
                url: `/${encodeURIComponent(folderName)}/`,
                resolution: parseResolution(parsed.get('resolution')),
                usecase: splitByComma(parsed.get('usecase')),
                compatible: splitByComma(parsed.get('compatiblewith')),
                hasSettings: Boolean(folder.settingsPath),
                notes: parsed.get('notes') || '',
                assets: []
            };
        });
    }

    private async fetchRepoOverlays(): Promise<Overlay[]> {
        try {
            const res = await fetch(OVERLAYS_API_URL);
            if (!res.ok) {
                wLogger.error(
                    `Failed to fetch repository overlays: HTTP ${res.status}`
                );
                return [];
            }

            const items = (await res.json()) as RawRepositoryOverlay[];
            return items.map((item) => ({
                id: item.id,
                name: item.name,
                version: item.version,
                status: 'installable' as OverlayStatus,
                author: {
                    name: item.author || '???',
                    links: item.authorlinks || []
                },
                url: item.downloadLink || '',
                downloadUrl: item.downloadLink,
                resolution: parseResolution(item.resolution),
                usecase: item.usecase || [],
                compatible: item.compatiblewith || [],
                hasSettings: item._settings || false,
                notes: item.notes || '',
                assets: item.assets || []
            }));
        } catch (err) {
            wLogger.error(
                'Failed to fetch repository overlays:',
                (err as Error).message
            );
            return [];
        }
    }

    public async syncAndRefresh(forceRepoRefresh = false): Promise<void> {
        if (this.syncPromise) {
            return this.syncPromise;
        }

        this.syncPromise = this.performSync(forceRepoRefresh).finally(() => {
            this.syncPromise = null;
        });

        return this.syncPromise;
    }

    private async performSync(forceRepoRefresh: boolean): Promise<void> {
        try {
            const local = this.readDiskOverlays();
            const currentRepoOnly = this.cache.filter(
                (o) => o.status === 'installable'
            );

            const repo =
                currentRepoOnly.length > 0 && !forceRepoRefresh
                    ? currentRepoOnly
                    : await this.fetchRepoOverlays();

            const localMap = new Map<string, Overlay>();
            for (const l of local) {
                const key = `${l.name.toLowerCase()} by ${l.author.name.toLowerCase()}`;
                localMap.set(key, l);
                localMap.set(l.id.toLowerCase(), l);
            }

            let updates = 0;
            const unifiedList: Overlay[] = [...local];

            for (const r of repo) {
                const key = `${r.name.toLowerCase()} by ${r.author.name.toLowerCase()}`;
                const matchedLocal =
                    localMap.get(key) || localMap.get(r.id.toLowerCase());

                if (matchedLocal) {
                    if (r.version !== matchedLocal.version) {
                        matchedLocal.status = 'upgradable';
                        matchedLocal.downloadUrl = r.downloadUrl;
                        updates++;
                    } else {
                        matchedLocal.status = 'installed';
                    }

                    if (matchedLocal.assets.length === 0) {
                        matchedLocal.assets = r.assets;
                    }
                } else {
                    r.status = 'installable';
                    unifiedList.push(r);
                }
            }

            this.cache = unifiedList;
            this.updatesAvailable = updates;

            const stableHashItems = unifiedList
                .map((o) => ({
                    id: o.id,
                    version: o.version,
                    status: o.status
                }))
                .sort((a, b) => a.id.localeCompare(b.id));

            this.hash = generateHash(stableHashItems);
        } catch (err) {
            wLogger.error(
                'Failed overlay syncAndRefresh:',
                (err as Error).message
            );
        }
    }

    public getOverlays(filter?: string): Overlay[] {
        if (!filter) {
            return this.cache;
        }

        return this.cache.filter((o) =>
            filter === 'installed'
                ? o.status === 'installed' || o.status === 'upgradable'
                : o.status === filter
        );
    }

    public getOverlayById(id: string): Overlay | undefined {
        const target = id.toLowerCase();
        return this.cache.find((o) => {
            const formattedName = `${o.name} by ${o.author.name}`.toLowerCase();
            return (
                o.id.toLowerCase() === target ||
                o.name.toLowerCase() === target ||
                formattedName === target
            );
        });
    }

    public getStatus(): OverlaysStatusInfo {
        const installedCount = this.cache.filter(
            (o) => o.status === 'installed' || o.status === 'upgradable'
        ).length;

        return {
            totalCount: this.cache.length,
            installedCount,
            updatesAvailable: this.updatesAvailable,
            hash: this.hash
        };
    }

    private resolveFolderPath(id: string): string | null {
        const overlay = this.getOverlayById(id);
        const folderName = overlay
            ? `${overlay.name} by ${overlay.author.name}`
            : path.basename(id);
        const staticPath = getStaticPath();
        const folderPath = path.resolve(staticPath, folderName);

        const relative = path.relative(staticPath, folderPath);
        if (
            !relative ||
            relative.startsWith('..') ||
            path.isAbsolute(relative)
        ) {
            return null;
        }

        return folderPath;
    }

    public async downloadOverlay(
        id: string,
        customDownloadUrl?: string
    ): Promise<{ path: string }> {
        const entry = this.getOverlayById(id);
        const downloadUrl = customDownloadUrl || entry?.downloadUrl;

        if (!downloadUrl) {
            throw new Error('No download URL provided or found for this ID');
        }

        const folderName = entry?.author.name
            ? `${entry.name} by ${entry.author.name}`
            : entry?.name || id;

        const sanitizedFolder = folderName.replace(/[/\\?%*:|"<>]/g, '_');
        const folderPath = path.join(getStaticPath(), sanitizedFolder);
        const cacheFolder = getCachePath();
        const tempZipPath = path.join(cacheFolder, `${id}.zip`);
        const tempExtractPath = path.join(cacheFolder, id);

        try {
            fs.mkdirSync(cacheFolder, { recursive: true });
            await downloadFile(downloadUrl, tempZipPath);
            await unzip(tempZipPath, tempExtractPath);

            if (fs.existsSync(folderPath)) {
                fs.rmSync(folderPath, { recursive: true, force: true });
            }

            try {
                fs.renameSync(tempExtractPath, folderPath);
            } catch {
                fs.cpSync(tempExtractPath, folderPath, { recursive: true });
            }

            wLogger.info(
                `Overlay %${sanitizedFolder}% downloaded and installed.`
            );
            await this.syncAndRefresh(false);
            return { path: folderPath };
        } catch (error) {
            wLogger.error(
                `Failed to download overlay %${sanitizedFolder}%:`,
                (error as Error).message
            );
            throw error;
        } finally {
            fs.rmSync(tempZipPath, { force: true });
            fs.rmSync(tempExtractPath, { recursive: true, force: true });
        }
    }

    public async openOverlay(id: string): Promise<void> {
        const folderPath = this.resolveFolderPath(id);
        if (!folderPath || !fs.existsSync(folderPath)) {
            throw new Error("Folder doesn't exist");
        }

        const platform = platformResolver(process.platform);
        return new Promise((resolve, reject) => {
            exec(`${platform.command} "${folderPath}"`, (err) => {
                if (err) {
                    wLogger.error(
                        `Failed to open folder %${folderPath}%:`,
                        err.message
                    );
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    public async deleteOverlay(id: string): Promise<void> {
        const folderPath = this.resolveFolderPath(id);
        if (!folderPath || !fs.existsSync(folderPath)) {
            throw new Error("Folder doesn't exist");
        }

        fs.rmSync(folderPath, { recursive: true, force: true });
        wLogger.info(`Overlay at %${folderPath}% deleted.`);
        await this.syncAndRefresh(false);
    }
}

export const overlaysService = new OverlaysService();
