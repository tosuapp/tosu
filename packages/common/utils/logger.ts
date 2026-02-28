import fs from 'fs';
import path from 'path';
import util from 'util';

import { LogColor, LogSymbol } from '../enums/logging';
import { ClientType } from '../enums/tosu';
import { config } from './config';
import { context } from './context';
import { ensureDirectoryExists, getDataPath } from './directories';
import { progressManager } from './progress';

const HighlightColor = '\x1b[1m\x1b[37m';

let logStream: fs.WriteStream | null = null;

export function runningTime() {
    const time = performance.now();

    const secs = Math.floor(time / 1000);
    const hours = `${Math.floor(secs / 3600)}`.padStart(2, '0');
    const minutes = `${Math.floor((secs % 3600) / 60)}`.padStart(2, '0');
    const seconds = `${Math.floor(secs % 60)}`.padStart(2, '0');
    const milliseconds = `${Math.floor(time % 1000)}`.padStart(3, '0');

    return `${hours}:${minutes}:${seconds}.${milliseconds}`;
}

export function colorText(text: string, color: keyof typeof LogColor) {
    const colorCode = LogColor[color] || LogColor.Reset;
    return `${colorCode}${text}${LogColor.Reset}`;
}

export function cleanupLogs() {
    const logsPath = path.dirname(context.logFilePath);
    if (!fs.existsSync(logsPath)) return;

    const logs = fs.readdirSync(logsPath);

    const logFiles: {
        file: string;
        filePath: string;
        size: number;
        mtime: number;
    }[] = [];
    let totalSize = 0;

    for (const file of logs) {
        const filePath = path.join(logsPath, file);
        const stats = fs.statSync(filePath);
        const size = stats.isFile() ? stats.size : 0;
        totalSize += size;

        if (file !== 'latest.log') {
            logFiles.push({
                file,
                filePath,
                size,
                mtime: stats.mtime.getTime()
            });
        }
    }

    const maxSizeBytes = 100 * 1024 * 1024; // 100 MB
    const safeLimitBytes = 90 * 1024 * 1024; // 90 MB

    if (totalSize < maxSizeBytes) return;

    logFiles.sort((a, b) => a.mtime - b.mtime);

    let deletedCount = 0;
    let clearedSpace = 0;

    for (const log of logFiles) {
        if (totalSize <= safeLimitBytes) break;

        try {
            fs.rmSync(log.filePath);
            totalSize -= log.size;
            clearedSpace += log.size;
            deletedCount++;
        } catch (e) {
            wLogger.error(`Failed to delete old log file: %${log.file}%`, e);
        }
    }

    if (deletedCount === 0) return;

    wLogger.debug(
        `Cleaned up %${deletedCount}% old log files. Freed %${(
            clearedSpace /
            1024 /
            1024
        ).toFixed(2)} MB%.`
    );
}

function logFile(type: string, ...args: any[]) {
    if (context.logFilePath === '') {
        const logsPath = path.join(getDataPath(), 'logs');
        ensureDirectoryExists(logsPath);

        const latestLog = path.join(logsPath, 'latest.log');

        if (fs.existsSync(latestLog)) {
            const date = fs.statSync(latestLog).mtime;

            const yyyy = date.getFullYear();
            const mm = String(date.getMonth() + 1).padStart(2, '0');
            const dd = String(date.getDate()).padStart(2, '0');
            const hh = String(date.getHours()).padStart(2, '0');
            const min = String(date.getMinutes()).padStart(2, '0');
            const ss = String(date.getSeconds()).padStart(2, '0');

            const baseName = `${yyyy}-${mm}-${dd} ${hh}-${min}-${ss}`;
            let newPath = path.join(logsPath, `${baseName}.log`);
            let counter = 1;

            while (fs.existsSync(newPath)) {
                newPath = path.join(logsPath, `${baseName}-${counter}.log`);
                counter++;
            }

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

    const time = runningTime();
    const message = args
        .map((arg) => {
            if (typeof arg === 'string') {
                return arg.replace(/%(\S+)%/g, '$1');
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

    progressManager.clear();

    const formattedArgs = args.map((arg) => {
        if (typeof arg === 'string') {
            return arg.replace(/%(\S+)%/g, `${HighlightColor}$1\x1b[0m`);
        }
        if (typeof arg === 'object' && arg !== null) {
            return (
                '\n' +
                util.inspect(arg, { depth: 2, colors: true, compact: false })
            );
        }
        return arg;
    });

    console.log(
        colorText(context.currentVersion, 'Grey'),
        ` ${colorText(LogSymbol.Separator, level)} `,
        `${LogColor.Grey}${runningTime()}${LogColor.Reset} `,
        formattedArgs.join(' ')
    );

    progressManager.render();
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
                ? `%${client}% ${(this as any).game.pid} ${target.constructor.name}.${propertyKey} executed in ${time.toFixed(2)}ms`
                : `%${target.constructor.name}.${propertyKey}% executed in ${time.toFixed(2)}ms`;

            wLogger.time(msg);
        }

        return result;
    };

    return descriptor;
}

const closeLogStream = () => {
    if (logStream) {
        logStream.end();
        logStream = null;
    }
};

process.on('exit', closeLogStream);
process.on('SIGINT', () => {
    closeLogStream();
    process.exit();
});
process.on('SIGTERM', () => {
    closeLogStream();
    process.exit();
});
