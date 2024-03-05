import { config } from './config';

const colors = {
    info: '\x1b[1m\x1b[40m\x1b[42m',
    error: '\x1b[1m\x1b[37m\x1b[41m',
    debug: '\x1b[1m\x1b[37m\x1b[44m',
    warn: '\x1b[1m\x1b[40m\x1b[43m',
    reset: '\x1b[0m',
    grey: '\x1b[90m'
};

function colorText(status: string, ...anything: any) {
    const colorCode = colors[status] || colors.reset;
    const timestamp = new Date().toISOString().split('T')[1].replace('Z', '');

    const time = `${colors.grey}${timestamp}${colors.reset}`;
    console.log(
        time,
        `${colorCode} ${status.toUpperCase()} ${colors.reset}`,
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
