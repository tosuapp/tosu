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
            wLogger.error('[unzip]', (error as any).message);
            wLogger.debug('[unzip]', error);
            reject(error);
        }
    });
