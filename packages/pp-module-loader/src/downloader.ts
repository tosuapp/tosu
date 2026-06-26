import { downloadFile, getCachePath, verifyDownload } from '@tosu/common';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as tar from 'tar';

import { getPrebuiltPackageName } from './package';
import type { NpmPackageDist } from './registry/types';

export async function downloadCalculator(
    version: string,
    dist?: NpmPackageDist
): Promise<string> {
    const packageName = getPrebuiltPackageName();

    const calculatorRootPath = getCalculatorPath();
    const folderPath = path.join(
        calculatorRootPath,
        `${packageName}-${version}`
    );
    const archivePath = path.join(
        calculatorRootPath,
        `${packageName}-${version}.tgz`
    );

    if (await fs.stat(folderPath).catch(() => false)) {
        return folderPath;
    }

    if (!dist) {
        throw new Error(
            `Calculator version: "${version}" is not available for download.`
        );
    }

    await fs.mkdir(calculatorRootPath, { recursive: true });
    try {
        await downloadFile(dist.tarball, archivePath);

        if (!(await verifyDownload(`sha1:${dist.shasum}`, archivePath))) {
            await fs.rm(archivePath);
            throw new Error('Download verification failed.');
        }

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

function getCalculatorPath(): string {
    return path.join(getCachePath(), 'calculators');
}
