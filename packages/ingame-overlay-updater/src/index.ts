import {
    checkGameOverlayConfig,
    downloadFile,
    getProgramPath,
    platformResolver,
    unzip,
    wLogger
} from '@tosu/common';
import { ChildProcess, spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';

// NOTE: _version.js packs with pkg support in tosu build
const currentVersion = require(process.cwd() + '/_version.js');

const platform = platformResolver(process.platform);

export async function runOverlay(): Promise<ChildProcess> {
    if (process.platform !== 'win32') {
        throw new Error(
            'This feature is currently only available on the Windows platform'
        );
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
        const archivePath = path.join(gameOverlayPath, 'tosu-gameoverlay.zip');

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
            (r) => r.name.includes('tosu-overlay') && r.name.endsWith('.zip')
        );
        if (!findAsset) {
            throw new Error(
                `Could not find downloadable files for your operating system. (${platform.type})`
            );
        }

        await downloadFile(findAsset.browser_download_url, archivePath);

        await unzip(archivePath, gameOverlayPath);
        await rm(archivePath);

        wLogger.info('[ingame-overlay] Ingame overlay downloaded');
    }

    wLogger.warn(`[ingame-overlay] Starting...`);

    const child = spawn(
        path.join(gameOverlayPath, 'tosu-ingame-overlay.exe'),
        [],
        {
            detached: false,
            stdio: ['ignore', 'overlapped', 'overlapped'],
            windowsHide: true,
            shell: false,
            env: {
                // Force nvidia optimus to prefer dedicated gpu
                SHIM_MCCOMPAT: '0x800000001',
                ...process.env
            }
        }
    );

    child.stdout.setEncoding('utf-8').on('data', (data: string) => {
        // overlay logs are a bit verbose, so redirect them to debug log
        wLogger.debug('[ingame-overlay]', data.trim());
    });

    child.stderr.setEncoding('utf-8').on('data', (data: string) => {
        // redirect overlay error backtraces to debug error log
        wLogger.debugError('[ingame-overlay]', data.trim());
    });

    return child;
}
