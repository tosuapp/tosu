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
                '[ingame-overlay] This feature is currently only available on the Windows platform'
            );
            return false;
        }

        checkGameOverlayConfig();

        const gameOverlayPath = path.join(getProgramPath(), 'game-overlay');
        if (
            existsSync(path.join(gameOverlayPath)) &&
            !existsSync(path.join(gameOverlayPath, 'version'))
        ) {
            // old overlay detected, removing it
            wLogger.warn(
                '[ingame-overlay] Old version of the ingame overlay detected. Removing...'
            );
            await rm(gameOverlayPath, { recursive: true, force: true });
        }

        if (existsSync(path.join(gameOverlayPath, 'version'))) {
            const overlayVersion = readFileSync(
                path.join(gameOverlayPath, 'version'),
                'utf8'
            );
            if (overlayVersion.trimEnd() !== currentVersion) {
                await rm(gameOverlayPath, { recursive: true, force: true });

                wLogger.warn(
                    '[ingame-overlay] A newer version of the ingame overlay is available. Updating...'
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
                    r.name.includes('tosu-overlay') && r.name.endsWith('.zip')
            );
            if (!findAsset) {
                wLogger.info(
                    '[ingame-overlay]',
                    `Could not find downloadable files for your operating system. (${platform.type})`
                );
                return;
            }

            await downloadFile(findAsset.browser_download_url, archivePath);

            await unzip(archivePath, gameOverlayPath);
            await rm(archivePath);

            wLogger.info('[ingame-overlay] Ingame overlay downloaded');
        }

        // dum sleep to wait until all osu libraries are loaded?
        await sleep(1000 * 3);

        wLogger.warn(`[ingame-overlay] Starting...`);
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

                wLogger.warn(`[ingame-overlay] Exited...`);

                resolve(true);
            });
        });
    } catch (exc) {
        wLogger.error('[ingame-overlay]', (exc as any).message);
        wLogger.debug('[ingame-overlay]', exc);

        return false;
    }
};
