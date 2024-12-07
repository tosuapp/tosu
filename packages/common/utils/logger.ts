import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';

import { config } from './config';
import { getProgramPath } from './directories';

const colors = {
    info: '\x1b[1m\x1b[40m\x1b[42m',
    error: '\x1b[1m\x1b[37m\x1b[41m',
    debug: '\x1b[1m\x1b[37m\x1b[44m',
    debugError: '\x1b[1m\x1b[37m\x1b[45m',
    warn: '\x1b[1m\x1b[40m\x1b[43m',
    reset: '\x1b[0m',
    grey: '\x1b[90m'
};

export function colorText(status: string) {
    const colorCode = colors[status] || colors.reset;
    const timestamp = new Date().toISOString().split('T')[1].replace('Z', '');

    const time = `${colors.grey}${timestamp}${colors.reset}`;
    const version = `${colors.grey}v${config.currentVersion}${colors.reset}`;
    return `${time} ${version} ${colorCode} ${status.toUpperCase()} ${colors.reset}`;
}

export const wLogger = {
    info: (...args: any) => {
        const coloredText = colorText('info');
        console.log(coloredText, ...args);

        if (config.debugLogging === true) writeLog('info', args);
    },
    debug: (...args: any) => {
        if (config.debugLogging !== true) return;

        const coloredText = colorText('debug');
        console.log(coloredText, ...args);

        writeLog('debug', args);
    },
    debugError: (...args: any) => {
        if (config.debugLogging !== true) return;

        const coloredText = colorText('debugError');
        console.log(coloredText, ...args);

        if (config.debugLogging === true) writeLog('debugError', args);
    },
    error: (...args: any) => {
        const coloredText = colorText('error');
        console.log(coloredText, ...args);

        if (config.debugLogging === true) writeLog('error', args);
    },
    warn: (...args: any) => {
        const coloredText = colorText('warn');
        console.log(coloredText, ...args);

        if (config.debugLogging === true) writeLog('warn', args);
    }
};

function writeLog(type: string, ...args: any[]) {
    if (config.logsPath === '') {
        const logsPath = path.join(getProgramPath(), 'logs');
        if (!fs.existsSync(logsPath))
            fs.mkdirSync(logsPath, { recursive: true });

        config.logsPath = path.join(logsPath, `${Date.now()}.txt`);
    }

    fsp.appendFile(
        config.logsPath,
        `${new Date().toISOString()} ${type} ${args.join(' ')}\n`,
        'utf8'
    ).catch((reason) => console.log(`writeLog`, reason));
}
