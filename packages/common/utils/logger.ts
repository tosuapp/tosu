import { config } from './config';

const colors = {
    error: '\x1b[31m',
    info: '\x1b[32m',
    debug: '\x1b[34m',
    warn: '\x1b[33m',
    reset: '\x1b[0m'
};

function colorText(status: string, ...anything: any) {
    const colorCode = colors[status] || colors.reset;
    const timestamp = new Date().toISOString().replace('T', ' ');
    console.log(
        `${timestamp} [tosu] ${colorCode}${status}${colors.reset}:`,
        ...anything
    );
}

export const wLogger = {
    info: (...args: any) => colorText('info', ...args),
    debug: (...args: any) => {
        if (config.debugLogging != true) return;

        colorText('debug', ...args);
    },
    error: (...args: any) => colorText('error', ...args),
    warn: (...args: any) => colorText('warn', ...args)
};
