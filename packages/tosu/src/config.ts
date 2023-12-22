import { wLogger } from '@tosu/common';
import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

const configPath = path.join(process.cwd(), 'tsosu.env');
if (!fs.existsSync(configPath)) {
    fs.writeFileSync(
        configPath,
        `DEBUG_LOG=false
CALCULATE_PP=true
ENABLE_KEY_OVERLAY=true
WS_SEND_INTERVAL=150
POLL_RATE=150
KEYOVERLAY_POLL_RATE=150
SERVER_IP=127.0.0.1
SERVER_PORT=24050
STATIC_FOLDER_PATH=./static
ENABLE_GOSU_OVERLAY=false`
    );
}

dotenv.config({ path: configPath });

export const config = {
    debugLogging: (process.env.DEBUG_LOG || '') === 'true',
    calculatePP: (process.env.CALCULATE_PP || '') === 'true',
    enableKeyOverlay: (process.env.ENABLE_KEY_OVERLAY || '') === 'true',
    wsSendInterval: Number(process.env.WS_SEND_INTERVAL || '500'),
    pollRate: Number(process.env.POLL_RATE || '500'),
    keyOverlayPollRate: Number(process.env.KEYOVERLAY_POLL_RATE || '100'),
    serverIP: process.env.SERVER_IP || '127.0.0.1',
    serverPort: Number(process.env.SERVER_PORT || '24050'),
    staticFolderPath: process.env.STATIC_FOLDER_PATH || './static',
    enableGosuOverlay: (process.env.ENABLE_GOSU_OVERLAY || '') === 'true'
};

export const updateConfig = () => {
    let newOptions = '';

    if (!process.env.DEBUG_LOG) {
        newOptions += 'DEBUG_LOG, ';
        fs.appendFileSync(configPath, '\nDEBUG_LOG=false', 'utf8');
    }

    if (!process.env.CALCULATE_PP) {
        newOptions += 'CALCULATE_PP, ';
        fs.appendFileSync(configPath, '\nCALCULATE_PP=true', 'utf8');
    }

    if (!process.env.ENABLE_KEY_OVERLAY) {
        newOptions += 'ENABLE_KEY_OVERLAY, ';
        fs.appendFileSync(configPath, '\nENABLE_KEY_OVERLAY=true', 'utf8');
    }

    if (!process.env.WS_SEND_INTERVAL) {
        newOptions += 'WS_SEND_INTERVAL, ';
        fs.appendFileSync(configPath, '\nWS_SEND_INTERVAL=150', 'utf8');
    }

    if (!process.env.POLL_RATE) {
        newOptions += 'POLL_RATE, ';
        fs.appendFileSync(configPath, '\nPOLL_RATE=150', 'utf8');
    }

    if (!process.env.KEYOVERLAY_POLL_RATE) {
        newOptions += 'KEYOVERLAY_POLL_RATE, ';
        fs.appendFileSync(configPath, '\nKEYOVERLAY_POLL_RATE=150', 'utf8');
    }

    if (!process.env.SERVER_IP) {
        newOptions += 'SERVER_IP, ';
        fs.appendFileSync(configPath, '\nSERVER_IP=127.0.0.1', 'utf8');
    }

    if (!process.env.SERVER_PORT) {
        newOptions += 'SERVER_PORT, ';
        fs.appendFileSync(configPath, '\nSERVER_PORT=24050', 'utf8');
    }

    if (!process.env.STATIC_FOLDER_PATH) {
        newOptions += 'STATIC_FOLDER_PATH, ';
        fs.appendFileSync(configPath, '\nSTATIC_FOLDER_PATH=./static', 'utf8');
    }

    if (!process.env.ENABLE_GOSU_OVERLAY) {
        newOptions += 'nENABLE_GOSU_OVERLAY, ';
        fs.appendFileSync(configPath, '\nENABLE_GOSU_OVERLAY=false', 'utf8');
    }

    if (newOptions !== '')
        wLogger.warn(`New options available in config: ${newOptions}\n`);
};
