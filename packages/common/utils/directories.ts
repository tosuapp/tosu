import fs from 'fs';
import path from 'path';

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
