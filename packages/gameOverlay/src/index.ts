import decompress from 'decompress';
import { execFile } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { Process } from 'tsprocess/dist/process';

import { downloadFile } from './features/downloader';

const checkGameOverlayConfig = () => {
    const configPath = path.join(process.cwd(), 'config.ini');
    if (!existsSync(configPath)) {
        writeFileSync(
            configPath,
            `[GameOverlay]; https://github.com/l3lackShark/gosumemory/wiki/GameOverlay
enabled = false
gameWidth = 1920
gameHeight = 1080
overlayURL = http://127.0.0.1:24050/InGame2/index.html
overlayWidth = 380
overlayHeight = 110
overlayOffsetX = 0
overlayOffsetY = 0
overlayScale = 10`
        );
    }
};

export const injectGameOverlay = async (p: Process) => {
    if (process.platform !== 'win32') {
        throw new Error(
            'Gameoverlay can run only under windows, sorry linux/darwin user!'
        );
    }

    // Check for DEPRECATED GOSU CONFIG, due its needed to read [GameOverlay] section from original configuration
    checkGameOverlayConfig();

    if (!existsSync(path.join(process.cwd(), 'gameOverlay'))) {
        const gameOverlayPath = path.join(process.cwd(), 'gameOverlay');
        const archivePath = path.join(gameOverlayPath, 'gosu-gameoverlay.zip');

        await mkdir(gameOverlayPath);
        await downloadFile(
            'https://dl.kotworks.cyou/gosu-gameoverlay.zip',
            archivePath
        );
        await decompress(archivePath, gameOverlayPath);
        await rm(archivePath);
    }

    if (
        !existsSync(
            path.join(process.cwd(), 'gameOverlay', 'gosumemoryoverlay.dll')
        )
    ) {
        console.log('Please delete gameOverlay folder, and restart program!');
        process.exit(1);
    }

    return await new Promise((resolve, reject) => {
        const child = execFile(
            path.join(process.cwd(), 'gameOverlay', 'a.exe'),
            [
                p.id.toString(),
                path.join(process.cwd(), 'gameOverlay', 'gosumemoryoverlay.dll')
            ],
            {
                windowsHide: true
            }
        );
        child.on('error', (err) => {
            reject(err);
        });
        child.on('exit', () => {
            console.log(
                '[gosu-overlay] initialized successfully, see https://github.com/l3lackShark/gosumemory/wiki/GameOverlay for tutorial'
            );
            resolve(true);
        });
    });
};
