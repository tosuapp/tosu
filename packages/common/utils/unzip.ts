import AdmZip from 'adm-zip';
import fs from 'fs';

import { wLogger } from './logger';

export const unzip = (zipPath: string, extractPath: string): Promise<string> =>
    new Promise((resolve, reject) => {
        if (!fs.existsSync(extractPath)) {
            fs.mkdirSync(extractPath);
        }

        const zip = new AdmZip(zipPath);

        try {
            // Extract all contents of the zip file to the specified destination
            zip.extractAllTo(extractPath, /* overwrite */ true);
            resolve(extractPath);
        } catch (error) {
            wLogger.error('[unzip]', (error as any).message);
            wLogger.debug('[unzip]', error);
            reject(error);
        }
    });
