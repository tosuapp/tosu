import fs from 'fs';
import { homedir } from 'os';
import path from 'path';

import { config } from './config';

export function ensureDirectoryExists(dir: string) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

export function recursiveFilesSearch({
    _ignoreFileName,
    dir,
    filename,
    fileList
}: {
    _ignoreFileName?: string;
    dir: string;
    filename: string;
    fileList: { filePath: string; created: number }[];
}) {
    const files = fs.readdirSync(dir);
    files.forEach((file) => {
        if (file.startsWith('.')) return;

        const filePath = path.join(dir, file);
        const stats = fs.statSync(filePath);
        if (stats.isDirectory()) {
            if (_ignoreFileName) {
                const ignoreFilePath = path.join(filePath, _ignoreFileName);
                if (fs.existsSync(ignoreFilePath)) {
                    return;
                }
            }

            recursiveFilesSearch({ dir: filePath, filename, fileList });
        } else if (filePath.includes(filename)) {
            const stats = fs.statSync(filePath);

            fileList.push({ filePath, created: stats.mtimeMs });
        }
    });

    fileList.sort((a, b) => a.created - b.created);

    return fileList.map((r) => r.filePath);
}

export function getStaticPath() {
    let staticPath =
        config.staticFolderPath || path.join(getDataPath(), 'static');

    // replace ./static with normal path to the static with program path
    if (
        staticPath.toLowerCase() === './static' ||
        staticPath.toLowerCase() === '.\\static'
    )
        staticPath = path.join(getDataPath(), 'static');
    ensureDirectoryExists(staticPath);
    return path.resolve(staticPath);
}

export function getCachePath() {
    if (process.platform === 'linux') {
        const xdgCacheHome =
            process.env.XDG_CACHE_HOME || path.join(homedir(), '.cache');
        const cachePath = path.join(xdgCacheHome, 'tosu');
        ensureDirectoryExists(cachePath);
        return cachePath;
    } else {
        return path.join(getProgramPath(), '.cache');
    }
}

export function getProgramPath() {
    if ('pkg' in process) return path.dirname(process.execPath);
    return process.cwd();
}

export function getSettingsPath(folderName: string) {
    if (!folderName) return '';

    const settingsFolderPath = path.join(getConfigPath(), 'settings');
    ensureDirectoryExists(settingsFolderPath);

    const folderPath = path.join(
        settingsFolderPath,
        `${folderName}.values.json`
    );
    return folderPath;
}

export function getDataPath() {
    if (process.platform === 'linux') {
        const xdgDataHome =
            process.env.XDG_DATA_HOME ||
            path.join(homedir(), '.local', 'share');
        const dataPath = path.join(xdgDataHome, 'tosu');
        ensureDirectoryExists(dataPath);
        return dataPath;
    } else {
        return getProgramPath();
    }
}

export function getConfigPath() {
    if (process.platform === 'linux') {
        const xdgConfigHome =
            process.env.XDG_CONFIG_HOME || path.join(homedir(), '.config');
        const configPath = path.join(xdgConfigHome, 'tosu');
        ensureDirectoryExists(configPath);
        return configPath;
    } else {
        return getProgramPath();
    }
}
