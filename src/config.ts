import * as dotenv from 'dotenv';

dotenv.config();

export const config = {
    debugLogging: process.env.DEBUG_LOG === 'true'
};
