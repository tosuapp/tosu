import fsp from 'fs/promises';
import path from 'path';

import { ClientType } from '../enums/tosu';
import { config } from './config';
import { context } from './context';
import { ensureDirectoryExists, getDataPath } from './directories';

const colors = {
    info: '\x1b[1m\x1b[40m\x1b[42m',
    error: '\x1b[1m\x1b[37m\x1b[41m',
    debug: '\x1b[1m\x1b[37m\x1b[44m',
    time: '\x1b[1m\x1b[37m\x1b[48;5;239m',
    debugError: '\x1b[1m\x1b[37m\x1b[45m',
    warn: '\x1b[1m\x1b[40m\x1b[43m',
    reset: '\x1b[0m',
    grey: '\x1b[90m'
};

export function colorText(status: string, color: keyof typeof colors) {
    const colorCode = colors[color] || colors.reset;
    const timestamp = new Date().toISOString().split('T')[1].replace('Z', '');

    const time = `${colors.grey}${timestamp}${colors.reset}`;
    const version = `${colors.grey}v${context.currentVersion}${colors.reset}`;
    return `${time} ${version} ${colorCode} ${status.toUpperCase()} ${colors.reset}`;
}

export const wLogger = {
    info: (...args: any) => {
        const coloredText = colorText('info', 'info');
        console.log(coloredText, ...args);

        writeLog('info', args);
    },
    debug: (...args: any) => {
        writeLog('debug', args);

        if (config.debugLog !== true) return;

        const coloredText = colorText('debug', 'debug');
        console.log(coloredText, ...args);
    },
    time: (...args: any) => {
        writeLog('time', args);

        if (config.debugLog !== true) return;

        const coloredText = colorText('time', 'time');
        console.log(coloredText, ...args);
    },
    debugError: (...args: any) => {
        if (config.debugLog !== true) return;

        const coloredText = colorText('debugError', 'debugError');
        console.log(coloredText, ...args);

        writeLog('debugError', args);
    },
    error: (...args: any) => {
        const coloredText = colorText('error', 'error');
        console.log(coloredText, ...args);

        writeLog('error', args);
    },
    warn: (...args: any) => {
        const coloredText = colorText('warn', 'warn');
        console.log(coloredText, ...args);

        writeLog('warn', args);
    }
};

function writeLog(type: string, ...args: any[]) {
    if (context.logFilePath === '') {
        const logsPath = path.join(getDataPath(), 'logs');
        ensureDirectoryExists(logsPath);

        context.logFilePath = path.join(logsPath, `${Date.now()}.txt`);
        wLogger.debug(`logs path: ${logsPath}`);
    }

    fsp.appendFile(
        context.logFilePath,
        `${new Date().toISOString()} ${type} ${args.join(' ')}\n`,
        'utf8'
    ).catch((reason) => console.log(`writeLog`, reason));
}

export function measureTime(
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
        if (config.debugLog !== true) {
            return originalMethod.apply(this, args);
        }

        const client =
            (this as any)?.game?.client !== undefined
                ? ClientType[(this as any)?.game?.client]
                : '';

        const t1 = performance.now();
        const result = originalMethod.apply(this, args);
        const time = performance.now() - t1;

        if (time >= 1 && client) {
            const coloredText = colorText('time', 'time');
            console.log(
                coloredText,
                client,
                (this as any).game.pid,
                `${target.constructor.name}.${propertyKey} executed in ${time.toFixed(2)}ms`
            );
        } else if (time >= 1) {
            const coloredText = colorText('time', 'time');
            console.log(
                coloredText,
                `${target.constructor.name}.${propertyKey} executed in ${time.toFixed(2)}ms`
            );
        }

        return result;
    };

    return descriptor;
}
