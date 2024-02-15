import fs from 'fs';

import { OVERLAYS_STATIC } from '@/constants/overlaysStatic';

export const readDirectory = (
    folderPath: string,
    url: string,
    callback: Function
) => {
    fs.readdir(folderPath, (err, folders) => {
        if (err) {
            return callback(`Files not found: ${folderPath}`);
        }

        let html = folders.map(
            (r) => `<li><a href="${url == '/' ? '' : url}${r}/">${r}</a></li>`
        );

        return callback(
            OVERLAYS_STATIC.replace('{OVERLAYS_LIST}', html.join('\n'))
        );
    });
};
