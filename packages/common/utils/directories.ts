import fs from 'fs';
import path from 'path';

export function recursiveFilesSearch({
    dir,
    filename,
    fileList
}: {
    dir: string;
    filename: string;
    fileList: string[];
}) {
    const files = fs.readdirSync(dir);
    files.forEach((file) => {
        const filePath = path.join(dir, file);
        const stats = fs.statSync(filePath);
        if (stats.isDirectory()) {
            recursiveFilesSearch({ dir: filePath, filename, fileList });
        } else if (filePath.includes(filename)) {
            fileList.push(filePath);
        }
    });
    return fileList;
}
