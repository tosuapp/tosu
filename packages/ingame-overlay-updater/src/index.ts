import {
    checkGameOverlayConfig,
    downloadFile,
    getProgramPath,
    platformResolver,
    sleep,
    unzip,
    wLogger
} from '@tosu/common';
import { execFile } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';

// NOTE: _version.js packs with pkg support in tosu build
const currentVersion = require(process.cwd() + '/_version.js');

const platform = platformResolver(process.platform);

export const runOverlay = async () => {
    try {
        if (process.platform !== 'win32') {
            wLogger.error(
                '[ingame-overlay] Ingame overlay can run only under windows, sorry linux/darwin user!'
            );
            return false;
        }

        checkGameOverlayConfig();

        const gameOverlayPath = path.join(getProgramPath(), 'game-overlay');
        if (existsSync(path.join(gameOverlayPath, '.version'))) {
            const overlayVersion = readFileSync(
                path.join(gameOverlayPath, '.version'),
                'utf8'
            );
            if (overlayVersion !== currentVersion) {
                await rm(gameOverlayPath, { recursive: true, force: true });

                wLogger.warn(
                    '[ingame-overlay] Ingame overlay version is not actual, removing game-ovlerlay folder for downloading new version'
                );
            }
        }

        if (!existsSync(gameOverlayPath)) {
            const archivePath = path.join(
                gameOverlayPath,
                'tosu-gameoverlay.zip'
            );

            await mkdir(gameOverlayPath, { recursive: true });

            const request = await fetch(
                `https://api.github.com/repos/tosuapp/tosu/releases/tags/v${currentVersion}`
            );
            const json = (await request.json()) as any;
            const {
                assets
            }: {
                assets: { name: string; browser_download_url: string }[];
            } = json;

            const findAsset = assets.find(
                (r) =>
                    r.name.includes('overlay') &&
                    r.name.includes(platform.type) &&
                    r.name.endsWith('.zip')
            );
            if (!findAsset) {
                wLogger.info(
                    '[ingame-overlay]',
                    `Files to update not found (${platform.type})`
                );
                return;
            }

            await downloadFile(findAsset.browser_download_url, archivePath);

            await unzip(archivePath, gameOverlayPath);
            await rm(archivePath);

            wLogger.info('[ingame-overlay] Ingame overlay updated');
        }

        // dum sleep to wait until all osu libraries are loaded?
        await sleep(1000 * 10);

        return new Promise((resolve) => {
            let error = false;
            const child = execFile(
                path.join(gameOverlayPath, 'tosu-ingame-overlay.exe'),
                [],
                {
                    cwd: gameOverlayPath,
                    windowsHide: true
                }
            );
            child.on('error', (err) => {
                error = true;

                wLogger.warn('[ingame-overlay] run error', err);
                resolve(false);
            });
            child.on('exit', (code) => {
                if (code !== 0) {
                    wLogger.error(
                        `[ingame-overlay] Unknown exit code: ${code}`
                    );
                    return;
                }
                if (error) return;

                wLogger.info(`[ingame-overlay] Starting in-game overlay...`);

                resolve(true);
            });
        });
    } catch (exc) {
        wLogger.error('[ingame-overlay]', (exc as any).message);
        wLogger.debug('[ingame-overlay]', exc);

        return false;
    }
};
