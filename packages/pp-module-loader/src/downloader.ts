import { downloadFile } from '@tosu/common';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as tar from 'tar';

import { getPrebuiltPackageName } from './package';

const CALCULATOR_FOLDER = 'pp-calculator';

export async function downloadCalculator(version: string): Promise<string> {
    const packageName = getPrebuiltPackageName();
    const folderPath = path.join(
        CALCULATOR_FOLDER,
        `${packageName}-${version}`
    );

    if (await fs.stat(folderPath).catch(() => false)) {
        return folderPath;
    }

    const filePath = await downloadFile(
        `https://registry.npmjs.org/${packageName}/-/${packageName}-${version}.tgz`,
        CALCULATOR_FOLDER
    );
    try {
        await tar.x({
            file: filePath,
            cwd: folderPath,
            strip: 1
        });

        await fs.rm(filePath, { force: true });
    } catch (err) {
        await fs.rm(folderPath, { recursive: true, force: true });
        throw err;
    }

    return folderPath;
}
