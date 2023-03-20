import * as path from 'path';
import winston, { format, transports } from 'winston';

import { config } from './config';

const { timestamp, label, printf } = format;

const customFormat = printf(({ level, message, label, timestamp }) => {
	return `${timestamp} [${label}] ${level}: ${message}`;
});

winston.configure({
	level: config.debugLogging ? 'debug' : 'info',
	transports: [
		//
		// - Write to all logs with specified level to console.
		new transports.Console({
			format: format.combine(
				format.colorize(),
				label({ label: 'tosumemory' }),
				timestamp(),
				customFormat
			)
		})
	]
});

// export const loggerMiddleware = (): any => {
//     return async (ctx: Context, next: () => Promise<any>): Promise<void> => {
//         const start = new Date().getTime();
//         try {
//             await next();
//         } catch (err) {
//             ctx.status = (err as any).status || 500;
//             ctx.body = (err as any).message;
//         }
//         const ms = new Date().getTime() - start;

//         let logLevel: string;
//         if (ctx.status >= 500) {
//             logLevel = 'error';
//         } else if (ctx.status >= 400) {
//             logLevel = 'warn';
//         } else {
//             logLevel = 'info';
//         }

//         const msg = `${ctx.method} ${ctx.originalUrl} ${ctx.status} ${ms}ms`;

//         winston.log(logLevel, msg);
//     };
// };

export const wLogger = winston;
