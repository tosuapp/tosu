import fs from 'fs';
import path from 'path';
import util from 'util';

import { LogColor, LogSymbol } from '../enums/logging';
import { ClientType } from '../enums/tosu';
import { config } from './config';
import { context } from './context';
import { ensureDirectoryExists, getDataPath } from './directories';
import { progressManager } from './progress';

export function getLocalTime() {
    const now = new Date();
    return (
        now.toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        }) +
        '.' +
        String(now.getMilliseconds()).padStart(3, '0')
    );
}

export function colorText(status: string, color: keyof typeof LogColor) {
    const colorCode = LogColor[color] || LogColor.Reset;
    const time = `${LogColor.Grey}${getLocalTime()}${LogColor.Reset}`;

    let levelChar = status[0].toUpperCase();
    if (status === 'info') levelChar = LogSymbol.Info;
    else if (status === 'error' || status === 'debugerror')
        levelChar = LogSymbol.Error;
    else if (status === 'warn') levelChar = LogSymbol.Warn;
    else if (status === 'debug') levelChar = LogSymbol.Debug;
    else if (status === 'time') levelChar = LogSymbol.Time;

    return `${time} ${colorCode} ${levelChar} ${LogColor.Reset}`;
}

const HighlightColor = '\x1b[1m\x1b[37m';

function stripHighlights(text: string): string {
    return text.replace(/%([^%]+)%/g, '$1');
}

function applyHighlightStyles(text: string): string {
    return text.replace(/%([^%]+)%/g, `${HighlightColor}$1\x1b[0m`);
}

function formatConsoleArgs(args: any[]): any[] {
    return args.map((arg) => {
        if (typeof arg === 'string') {
            return applyHighlightStyles(arg);
        }
        if (typeof arg === 'object' && arg !== null) {
            return (
                '\n' +
                util.inspect(arg, { depth: 2, colors: true, compact: false })
            );
        }
        return arg;
    });
}

function formatFileArgs(args: any[]): string {
    return args
        .map((arg) => {
            if (typeof arg === 'string') {
                return stripHighlights(arg);
            }
            if (typeof arg === 'object') {
                return (
                    '\n' +
                    util.inspect(arg, {
                        depth: 2,
                        colors: false,
                        compact: false
                    })
                );
            }
            return String(arg);
        })
        .join(' ');
}

function logConsole(type: keyof typeof LogColor, ...args: any[]) {
    progressManager.clear();

    const coloredText = colorText(type.toLowerCase(), type);
    console.log(coloredText, ...formatConsoleArgs(args));

    if (progressManager.isActive && process.stdout.isTTY) {
        console.log('');
    }

    progressManager.render();
}

function getFilenameFriendlyTime(date: Date) {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    const ss = String(date.getSeconds()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}-${min}-${ss}`;
}

let logStream: fs.WriteStream | null = null;

function logFile(type: string, ...args: any[]) {
    if (context.logFilePath === '') {
        const logsPath = path.join(getDataPath(), 'logs');
        ensureDirectoryExists(logsPath);

        const latestLog = path.join(logsPath, 'latest.log');

        if (fs.existsSync(latestLog)) {
            const stat = fs.statSync(latestLog);
            const birthtime = stat.birthtime.getTime();
            const date =
                isNaN(birthtime) || birthtime === 0
                    ? new Date()
                    : new Date(birthtime);
            const newPath = path.join(
                logsPath,
                `${getFilenameFriendlyTime(date)}.log`
            );

            try {
                fs.renameSync(latestLog, newPath);
            } catch (e) {
                console.error(`Failed to rename latest.log:`, e);
            }
        }

        context.logFilePath = latestLog;
        wLogger.debug(`Logs path initialized at: %${logsPath}%`);
    }

    if (!logStream) {
        logStream = fs.createWriteStream(context.logFilePath, { flags: 'a' });
        logStream.on('error', (err) => {
            console.error('Log stream error:', err);
        });
    }

    let levelName = type.toLowerCase();
    if (levelName === 'debugerror') levelName = 'derror';
    const levelLabel = `[${levelName}]`.padEnd(8, ' ');

    const time = getLocalTime();
    const message = formatFileArgs(args);

    logStream.write(`${time} ${levelLabel} ${message}\n`);
}
function dispatchLog(level: keyof typeof LogColor, ...args: any[]) {
    logFile(level.toLowerCase(), ...args);

    if (
        (level === 'Debug' || level === 'Time' || level === 'DebugError') &&
        config.debugLog === false
    ) {
        return;
    }

    logConsole(level, ...args);
}

export const wLogger = {
    info: (...args: any) => dispatchLog('Info', ...args),
    debug: (...args: any) => dispatchLog('Debug', ...args),
    time: (...args: any) => dispatchLog('Time', ...args),
    debugError: (...args: any) => dispatchLog('DebugError', ...args),
    error: (...args: any) => dispatchLog('Error', ...args),
    warn: (...args: any) => dispatchLog('Warn', ...args)
};

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

        if (time >= 1) {
            const msg = client
                ? `${client} ${(this as any).game.pid} ${target.constructor.name}.${propertyKey} executed in ${time.toFixed(2)}ms`
                : `${target.constructor.name}.${propertyKey} executed in ${time.toFixed(2)}ms`;

            logConsole('Time', msg);
        }

        return result;
    };

    return descriptor;
}
