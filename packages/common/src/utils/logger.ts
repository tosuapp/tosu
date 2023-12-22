import { config } from 'tosu/src/config';
import winston, { format, transports } from 'winston';

const { timestamp, label, printf } = format;

const customFormat = printf(({ level, message, label, timestamp }) => {
    return `${timestamp} [${label}] ${level}: ${message}`;
});

export const configureLogger = () =>
    winston.configure({
        level: config.debugLogging ? 'debug' : 'info',
        transports: [
            //
            // - Write to all logs with specified level to console.
            new transports.Console({
                format: format.combine(
                    format.colorize(),
                    label({ label: 'tosu' }),
                    timestamp(),
                    customFormat
                )
            })
        ]
    });

export const wLogger = winston;
