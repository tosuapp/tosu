import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';


const configPath = path.join(process.cwd(), 'tsosu.env');
if (!fs.existsSync(configPath)) {
    fs.writeFileSync(configPath,
        `DEBUG_LOG=false
CALCULATE_PP=true
ENABLE_KEY_OVERLAY=true
WS_SEND_INTERVAL=150
POLL_RATE=150
KEYOVERLAY_POLL_RATE=150

SERVER_IP=127.0.0.1
SERVER_PORT=24050
STATIC_FOLDER_PATH=./static`
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
    staticFolderPath: process.env.STATIC_FOLDER_PATH || './static'
};
