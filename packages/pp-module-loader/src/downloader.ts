import { downloadFile } from '@tosu/common';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as tar from 'tar';

import { getFullPrebuiltPackageName, getPrebuiltPackageName } from './package';

const CALCULATOR_FOLDER = 'pp-calculator';

export async function downloadCalculator(version: string): Promise<string> {
    const fullPackageName = getFullPrebuiltPackageName();
    const packageName = getPrebuiltPackageName();

    const folderPath = path.join(
        CALCULATOR_FOLDER,
        `${packageName}-${version}`
    );
    const archivePath = path.join(
        CALCULATOR_FOLDER,
        `${packageName}-${version}.tgz`
    );

    if (await fs.stat(folderPath).catch(() => false)) {
        return folderPath;
    }

    await fs.mkdir(CALCULATOR_FOLDER, { recursive: true });
    await downloadFile(
        `https://registry.npmjs.org/${fullPackageName}/-/${packageName}-${version}.tgz`,
        archivePath
    );
    try {
        await fs.mkdir(folderPath, { recursive: true });
        await tar.x({
            file: archivePath,
            cwd: folderPath,
            strip: 1
        });
    } catch (err) {
        await fs.rm(folderPath, { recursive: true, force: true });

        throw err;
    } finally {
        await fs.rm(archivePath, { force: true });
    }

    return folderPath;
}
