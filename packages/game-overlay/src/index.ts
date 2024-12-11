import {
    Bitness,
    checkGameOverlayConfig,
    downloadFile,
    getProgramPath,
    unzip,
    wLogger
} from '@tosu/common';
import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { Process } from 'tsprocess/dist/process';

export const injectGameOverlay = async (p: Process, bitness: Bitness) => {
    try {
        if (process.platform !== 'win32') {
            wLogger.error(
                '[ingame-overlay] Ingame overlay can run only under windows, sorry linux/darwin user!'
            );
            return false;
        }

        checkGameOverlayConfig();

        const gameOverlayPath = path.join(getProgramPath(), 'game-overlay');
        if (!existsSync(gameOverlayPath)) {
            const archivePath = path.join(
                gameOverlayPath,
                'tosu-gameoverlay.zip'
            );

            await mkdir(gameOverlayPath, { recursive: true });
            await downloadFile(
                'https://dl-eu.kotworks.cyou/tosu/overlay.zip',
                archivePath
            );

            await unzip(archivePath, gameOverlayPath);
            await rm(archivePath);
        }

        if (
            !existsSync(
                path.join(gameOverlayPath, Bitness[bitness], 'tosu_overlay.dll')
            ) &&
            !existsSync(
                path.join(
                    gameOverlayPath,
                    Bitness[bitness],
                    'tosu_injector.exe'
                )
            )
        ) {
            wLogger.error(
                '[ingame-overlay] Please delete game-overlay folder, and restart program!'
            );
            return false;
        }

        return await new Promise((resolve) => {
            const child = execFile(
                path.join(
                    gameOverlayPath,
                    Bitness[bitness],
                    'tosu_injector.exe'
                ),
                [p.id.toString()],
                {
                    cwd: path.join(gameOverlayPath, Bitness[bitness]),
                    windowsHide: true
                }
            );
            child.on('error', (err) => {
                wLogger.warn('[ingame-overlay] inject error', err);
                resolve(false);
            });
            child.on('exit', () => {
                wLogger.warn(
                    '[ingame-overlay] initialized successfully\nPress ctrl+shift+space in the game to enable in-game overlay editor\n'
                );
                resolve(true);
            });
        });
    } catch (exc) {
        wLogger.error('[ingame-overlay]', (exc as any).message);
        wLogger.debug('[ingame-overlay]', exc);

        return false;
    }
};
