import { config, recursiveFilesSearch } from '@tosu/common';
import fs from 'fs';
import http from 'http';
import path from 'path';

import { getContentType } from '../utils';
import {
    authorHTML,
    authorLinksHTML,
    checkboxHTML,
    emptryCounters,
    emptryNotice,
    galleryImageHTML,
    icons_images,
    iframeHTML,
    inputHTML,
    metadataHTML,
    nameHTML,
    noMoreCounters,
    resultItemHTML,
    saveSettingsButtonHTML,
    settingsItemHTML
} from './htmls';

function splitTextByIndex(text, letter) {
    const index = text.indexOf(letter);
    if (index === -1) {
        return [text];
    } else {
        const part1 = text.substring(0, index);
        const part2 = text.substring(index);

        return [part1, part2];
    }
}

export function parseTXT(filePath: string) {
    const content = fs.readFileSync(filePath, 'utf8')?.split('\n');

    const object: any = {};
    for (let i = 0; i < content.length; i++) {
        const line = content[i];
        const result = splitTextByIndex(line, ':');
        let [key, value] = result;
        if (key == null || value == null) continue;
        value = value.split('##')[0].replace(/\r/, '').replace(':', '');

        if (/[0-9-]+x[0-9-]+/.test(value))
            object[key.toLowerCase()] = value.split('x');
        else object[key.toLowerCase()] = value.trim();
    }

    if (object.resolution)
        object.resolution = object.resolution.map((r) => r.trim());
    if (object.authorlinks) object.authorlinks = object.authorlinks.split(',');

    delete object.compatiblewith;
    delete object.usecase;

    return object;
}

function rebuildJSON({
    array,
    external,
    query
}: {
    array: {
        name: string;
        author: string;
        resolution: number[];
        authorlinks: string[];

        usecase?: string;
        compatiblewith?: string;
        assets?: {
            type: string;
            url: string;
        }[];
        downloadLink?: string;
    }[];
    external?: boolean;
    query?: string;
}) {
    let items = '';
    for (let i = 0; i < array.length; i++) {
        const item = array[i];

        if (query != null) {
            if (
                !(
                    item.name.toLowerCase().includes(query) ||
                    item.name.toLowerCase().includes(query)
                )
            )
                continue;
        }

        const name = nameHTML.replace('{NAME}', item.name);
        const author = authorHTML.replace('{AUTHOR}', item.author);

        const links = item.authorlinks
            .map((r) => {
                const domain =
                    /:\/\/(?<domain>\S+)\//.exec(r)?.groups?.domain || '';
                if (!domain) return null;

                const icon_url = icons_images[domain.toLowerCase()];
                if (!icon_url) return null;

                return authorLinksHTML
                    .replace('{LINK}', r)
                    .replace('{ICON_URL}', icon_url);
            })
            .filter((r) => r != null)
            .join(' ');

        const iframe = iframeHTML
            .replace(
                '{URL}',
                `http://${config.serverIP}:${config.serverPort}/${item.name} by ${item.author}/`
            )
            .replace(
                '{WIDTH}',
                item.resolution[0] == -1 ? '500' : `${item.resolution[0]}px`
            )
            .replace(
                '{HEIGHT}',
                item.resolution[1] == -1 ? '500' : `${item.resolution[1]}px`
            );

        const metadata = metadataHTML
            .replace(
                '{COPY_URL}',
                `http://${config.serverIP}:${config.serverPort}/${item.name} by ${item.author}/`
            )
            .replace('{TEXT_URL}', `/${item.name} by ${item.author}/`)
            .replace(
                '{COPY_X}',
                item.resolution[0] == -1 ? 'ANY' : item.resolution[0].toString()
            )
            .replace(
                '{X}',
                item.resolution[0] == -1 ? 'ANY' : item.resolution[0].toString()
            )
            .replace(
                '{COPY_Y}',
                item.resolution[1] == -1 ? 'ANY' : item.resolution[1].toString()
            )
            .replace(
                '{Y}',
                item.resolution[1] == -1 ? 'ANY' : item.resolution[1].toString()
            );

        const button = item.downloadLink
            ? `<div class="buttons-group indent-left"><button class="button dl-button flexer" l="${item.downloadLink}" n="${item.name}" a="${item.author}"><span>Download</span></button></div>`
            : `<div class="buttons-group flexer indent-left">
                <button class="button open-button flexer" n="${item.name}" a="${item.author}"><span>Open Folder</span></button>
                <button class="button delete-button flexer" n="${item.name}" a="${item.author}"><span>Delete</span></button>
            </div>`;

        const assets = (item.assets || [])
            .map((r) => {
                return galleryImageHTML.replace('{LINK}', r.url);
            })
            .filter((r) => r != null)
            .join(' ');

        const gallery = item.assets ? assets : iframe;

        const footer =
            external != true
                ? `<div class="ri-footer flexer">${metadata}</div>`
                : '';

        items += resultItemHTML
            .replace('{NAME}', name)
            .replace('{AUTHOR}', author)
            .replace('{AUTHOR_LINKS}', links)
            .replace('{BUTTONS}', button)
            .replace('{GALLERY}', gallery)
            .replace('{FOOTER}', footer);
    }

    return items;
}

function getLocalCounters() {
    const staticPath =
        config.staticFolderPath ||
        path.join(path.dirname(process.execPath), 'static');

    const countersList = recursiveFilesSearch({
        dir: staticPath,
        fileList: [],
        filename: 'metadata.txt'
    });

    const array = countersList.map((r) => parseTXT(r));
    return array;
}

export function buildLocalCounters(res: http.ServerResponse, query?: string) {
    const array = getLocalCounters();
    const build = rebuildJSON({
        array,
        external: false,
        query
    });

    if (query != null) {
        res.writeHead(200, {
            'Content-Type': getContentType('file.html')
        });
        return res.end(build || emptryCounters);
    }

    fs.readFile(
        'F:/coding/wip/tosu/packages/server/assets/homepage.html',
        'utf8',
        (err, content) => {
            const html = content.replace('{{LIST}}', build || emptryNotice);

            res.writeHead(200, {
                'Content-Type': getContentType('file.html')
            });
            res.end(html);
        }
    );
}

export async function buildExternalCounters(
    res: http.ServerResponse,
    query?: string
) {
    const request = await fetch(
        `https://raw.githubusercontent.com/cyperdark/osu-counters/master/.github/api.json`
    );
    const json: any = await request.json();

    const exists = getLocalCounters();
    const array = json.filter(
        (r) => !exists.find((s) => s.name == r.name && s.author == r.author)
    );

    const build = rebuildJSON({
        array,
        external: true,
        query
    });

    if (query != null) {
        res.writeHead(200, {
            'Content-Type': getContentType('file.html')
        });
        return res.end(build || emptryCounters);
    }

    fs.readFile(
        'F:/coding/wip/tosu/packages/server/assets/homepage.html',
        'utf8',
        (err, content) => {
            const html = content.replace('{{LIST}}', build || noMoreCounters);

            res.writeHead(200, {
                'Content-Type': getContentType('file.html')
            });
            res.end(html);
        }
    );
}

export function buildSettings(res: http.ServerResponse) {
    const debugHTML = settingsItemHTML
        .replace('{NAME}', `DEBUG_LOG`)
        .replace(
            '{DESCRIPTION}',
            `Enables logs for tosu developers, not very intuitive for you, the end user.<br />best not to include without developer's request.`
        )
        .replace(
            '{INPUT}',
            checkboxHTML
                .replace(/{NAME}/gm, 'DEBUG_LOG')
                .replace('{ADDON}', config.debugLogging ? 'checked="true"' : '')
                .replace('{VALUE}', `${config.debugLogging}`)
        );

    const calculatePPHTML = settingsItemHTML
        .replace('{NAME}', `CALCULATE_PP`)
        .replace(
            '{DESCRIPTION}',
            `Turns PP counting on/off. Very useful for tournament client, you only care about scoring and map stats for example`
        )
        .replace(
            '{INPUT}',
            checkboxHTML
                .replace(/{NAME}/gm, 'CALCULATE_PP')
                .replace('{ADDON}', config.calculatePP ? 'checked="true"' : '')
                .replace('{VALUE}', `${config.calculatePP}`)
        );

    const enableKeyOverlayHTML = settingsItemHTML
        .replace('{NAME}', `ENABLE_KEY_OVERLAY`)
        .replace(
            '{DESCRIPTION}',
            `Enables/disables reading K1/K2/M1/M2 keys on the keyboard`
        )
        .replace(
            '{INPUT}',
            checkboxHTML
                .replace(/{NAME}/gm, 'ENABLE_KEY_OVERLAY')
                .replace(
                    '{ADDON}',
                    config.enableKeyOverlay ? 'checked="true"' : ''
                )
                .replace('{VALUE}', `${config.enableKeyOverlay}`)
        );

    const pollRateHTML = settingsItemHTML
        .replace('{NAME}', `POLL_RATE`)
        .replace(
            '{DESCRIPTION}',
            `Once in what value, the programme should read the game values (in milliseconds)`
        )
        .replace(
            '{INPUT}',
            inputHTML
                .replace('{TYPE}', 'number')
                .replace(/{NAME}/gm, 'POLL_RATE')
                .replace('{ADDON}', config.pollRate ? 'min="0"' : '')
                .replace('{VALUE}', `${config.pollRate}`)
        );

    const keyOverlayPollRateHTML = settingsItemHTML
        .replace('{NAME}', `KEYOVERLAY_POLL_RATE`)
        .replace(
            '{DESCRIPTION}',
            `Once per value, the programme should read the values of keys K1/K2/M1/M2 (in milliseconds)`
        )
        .replace(
            '{INPUT}',
            inputHTML
                .replace('{TYPE}', 'number')
                .replace(/{NAME}/gm, 'KEYOVERLAY_POLL_RATE')
                .replace('{ADDON}', config.keyOverlayPollRate ? 'min="0"' : '')
                .replace('{VALUE}', `${config.keyOverlayPollRate}`)
        );

    const serverIPHTML = settingsItemHTML
        .replace('{NAME}', `SERVER_IP`)
        .replace(
            '{DESCRIPTION}',
            `IP address where the websocket api server will be registered`
        )
        .replace(
            '{INPUT}',
            inputHTML
                .replace('{TYPE}', 'text')
                .replace(/{NAME}/gm, 'SERVER_IP')
                .replace('{ADDON}', config.serverIP ? 'min="0"' : '')
                .replace('{VALUE}', `${config.serverIP}`)
        );

    const serverPortHTML = settingsItemHTML
        .replace('{NAME}', `SERVER_PORT`)
        .replace(
            '{DESCRIPTION}',
            `The port on which the websocket api server will run`
        )
        .replace(
            '{INPUT}',
            inputHTML
                .replace('{TYPE}', 'number')
                .replace(/{NAME}/gm, 'SERVER_PORT')
                .replace('{ADDON}', config.serverPort ? 'min="0"' : '')
                .replace('{VALUE}', `${config.serverPort}`)
        );

    const staticFolderPathtHTML = settingsItemHTML
        .replace('{NAME}', `STATIC_FOLDER_PATH`)
        .replace(
            '{DESCRIPTION}',
            `The folder from which the overlays will be taken.`
        )
        .replace(
            '{INPUT}',
            inputHTML
                .replace('{TYPE}', 'text')
                .replace(/{NAME}/gm, 'STATIC_FOLDER_PATH')
                .replace('{ADDON}', config.staticFolderPath ? 'min="0"' : '')
                .replace('{VALUE}', `${config.staticFolderPath}`)
        );

    const settings = `<div class="settings">
    ${debugHTML}
    ${calculatePPHTML}
    ${enableKeyOverlayHTML}
    ${pollRateHTML}
    ${keyOverlayPollRateHTML}
    ${serverIPHTML}
    ${serverPortHTML}
    ${staticFolderPathtHTML}
    ${saveSettingsButtonHTML}
    </div>`;

    fs.readFile(
        'F:/coding/wip/tosu/packages/server/assets/homepage.html',
        'utf8',
        (err, content) => {
            const html = content.replace('{{LIST}}', settings);

            res.writeHead(200, {
                'Content-Type': getContentType('file.html')
            });
            res.end(html);
        }
    );
}