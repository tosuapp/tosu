import AdmZip from 'adm-zip';
import fs from 'fs';

import { wLogger } from './logger';

export const unzip = (zipPath: string, extractPath: string): Promise<string> =>
    new Promise((resolve, reject) => {
        const zip = new AdmZip(zipPath);

        try {
            if (!fs.existsSync(extractPath)) fs.mkdirSync(extractPath);

            zip.extractAllTo(extractPath, true);
            resolve(extractPath);
        } catch (error) {
            wLogger.error('Failed to unzip archive:', (error as any).message);
            wLogger.debug('Unzip error details:', error);
            reject(error);
        }
    });
