import fs from 'fs';
import path from 'path';

import { config } from './config';

const colors = {
    info: '\x1b[1m\x1b[40m\x1b[42m',
    error: '\x1b[1m\x1b[37m\x1b[41m',
    debug: '\x1b[1m\x1b[37m\x1b[44m',
    debugError: '\x1b[1m\x1b[37m\x1b[45m',
    warn: '\x1b[1m\x1b[40m\x1b[43m',
    timings: '\x1b[1m\x1b[40m\x1b[46m',
    reset: '\x1b[0m',
    grey: '\x1b[90m'
};

const timingsPath = path.join(
    'pkg' in process ? path.dirname(process.execPath) : process.cwd(),
    'timings.txt'
);

export function colorText(status: string) {
    const colorCode = colors[status] || colors.reset;
    const timestamp = new Date().toISOString().split('T')[1].replace('Z', '');

    const time = `${colors.grey}${timestamp}${colors.reset}`;
    return `${time} ${colorCode} ${status.toUpperCase()} ${colors.reset}`;
}

export const wLogger = {
    info: (...args: any) => {
        const coloredText = colorText('info');
        console.log(coloredText, ...args);
    },
    debug: (...args: any) => {
        if (config.debugLogging !== true) return;

        const coloredText = colorText('debug');
        console.log(coloredText, ...args);
    },
    debugError: (...args: any) => {
        if (config.debugLogging !== true) return;

        const coloredText = colorText('debugError');
        console.log(coloredText, ...args);
    },
    error: (...args: any) => {
        const coloredText = colorText('error');
        console.log(coloredText, ...args);
    },
    warn: (...args: any) => {
        const coloredText = colorText('warn');
        console.log(coloredText, ...args);
    },
    timings: (
        name: string,
        timings: { [key: string | number]: number },
        sendedAt: number
    ) => {
        if (config.enableTimingsLog === true) {
            const coloredText = colorText('timings');
            console.log(coloredText, name, timings);
        }

        if (config.saveTimingsToFile === true) {
            const entries = Object.entries(timings)
                .map((r) => `${r[0]}:${r[1].toFixed(3)}`)
                .join('|');
            fs.appendFileSync(
                timingsPath,
                `${Date.now()},${name},${(performance.now() - sendedAt).toFixed(3)},${entries}\n`,
                'utf8'
            );
        }
    }
};
