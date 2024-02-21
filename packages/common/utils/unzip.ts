import AdmZip from 'adm-zip';
import fs from 'fs';
import path from 'path';

import { wLogger } from './logger';

export const unzipTosu = (
    zipPath: string,
    extractPath: string
): Promise<string> =>
    new Promise((resolve, reject) => {
        const zip = new AdmZip(zipPath);

        zip.getEntries().some((entry) => {
            if (entry.entryName === 'tosu' || entry.entryName === 'tosu.exe') {
                const fileName = path.basename(entry.entryName);
                const { name, ext } = path.parse(fileName);
                const modifyName = path.join(extractPath, `${name}_new${ext}`);

                return fs.writeFile(
                    modifyName,
                    entry.getData(),
                    { flag: 'w' },
                    (err) => {
                        if (err) {
                            return reject(err);
                        }

                        return resolve(modifyName);
                    }
                );
            }
        });

        reject('No matching entry found in the zip file.');
    });

export const unzip = (zipPath: string, extractPath: string): Promise<string> =>
    new Promise((resolve, reject) => {
        if (!fs.existsSync(extractPath)) {
            fs.mkdirSync(extractPath);
        }

        const zip = new AdmZip(zipPath);

        try {
            // Extract all contents of the zip file to the specified destination
            zip.extractAllTo(extractPath, /*overwrite*/ true);
            resolve(extractPath);
        } catch (error) {
            wLogger.error((error as any).message);
            reject(error);
        }
    });
