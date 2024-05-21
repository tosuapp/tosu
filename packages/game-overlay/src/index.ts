import {
    checkGameOverlayConfig,
    downloadFile,
    unzip,
    wLogger
} from '@tosu/common';
import { execFile } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { Process } from 'tsprocess/dist/process';

const configPath = path.join(process.cwd(), 'config.ini');
const checkGosuConfig = (p: Process, checking?: boolean) => {
    if (!existsSync(configPath)) return null;

    const read = readFileSync(configPath, 'utf8');
    const parseURL = /^overlayURL[ ]*=[ ]*(.*)$/m.exec(read);
    if (!parseURL || !parseURL?.[1]) {
        setTimeout(() => {
            checkGosuConfig(p, true);
        }, 1000);
        return false;
    }

    if (checking) injectGameOverlay(p);
    return true;
};

export const injectGameOverlay = async (p: Process) => {
    try {
        if (process.platform !== 'win32') {
            wLogger.error(
                '[gosu-overlay] Ingame overlay can run only under windows, sorry linux/darwin user!'
            );
            return;
        }

        // Check for DEPRECATED GOSU CONFIG, due its needed to read [GameOverlay] section from original configuration
        checkGameOverlayConfig();

        if (!existsSync(path.join(process.cwd(), 'gameOverlay'))) {
            const gameOverlayPath = path.join(process.cwd(), 'gameOverlay');
            const archivePath = path.join(
                gameOverlayPath,
                'gosu-gameoverlay.zip'
            );

            await mkdir(gameOverlayPath);
            await downloadFile(
                'https://dl.kotworks.cyou/gosu-gameoverlay.zip',
                archivePath
            );

            await unzip(archivePath, gameOverlayPath);
            await rm(archivePath);
        }

        if (
            !existsSync(
                path.join(process.cwd(), 'gameOverlay', 'gosumemoryoverlay.dll')
            )
        ) {
            wLogger.info(
                '[gosu-overlay] Please delete gameOverlay folder, and restart program!'
            );
            return;
        }

        const overlayURLstatus = checkGosuConfig(p);
        if (!overlayURLstatus) {
            wLogger.warn(
                '[gosu-overlay] Specify overlayURL for gameOverlay in config.ini'
            );
            return;
        }

        return await new Promise((resolve, reject) => {
            const child = execFile(
                path.join(process.cwd(), 'gameOverlay', 'a.exe'),
                [
                    p.id.toString(),
                    path.join(
                        process.cwd(),
                        'gameOverlay',
                        'gosumemoryoverlay.dll'
                    )
                ],
                {
                    windowsHide: true
                }
            );
            child.on('error', (err) => {
                reject(err);
            });
            child.on('exit', () => {
                wLogger.info(
                    '[gosu-overlay] initialized successfully, see https://github.com/l3lackShark/gosumemory/wiki/GameOverlay for tutorial'
                );
                resolve(true);
            });
        });
    } catch (exc) {
        wLogger.error('injectOverlay', (exc as any).message);
        wLogger.debug('injectOverlay', exc);
    }
};
