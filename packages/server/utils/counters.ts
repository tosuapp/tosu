import {
    JsonSaveParse,
    config,
    recursiveFilesSearch,
    wLogger
} from '@tosu/common';
import fs from 'fs';
import http from 'http';
import path from 'path';

import { getContentType } from '../utils';
import {
    authorHTML,
    authorLinksHTML,
    checkboxHTML,
    emptyCounters,
    emptyNotice,
    galleryImageHTML,
    iconsImages,
    iframeHTML,
    inputHTML,
    metadataHTML,
    nameHTML,
    noMoreCounters,
    resultItemHTML,
    saveSettingsButtonHTML,
    selectHTML,
    settingsItemHTML
} from './htmls';

/**
 * ТАК КАК БЛЯТЬ У НАС В ЖЫЭСЕ
 * НЕ ПРИДУМАЛИ НОРМАЛЬНО ПАКЕТИРОВАТЬ ГОВНО БЕЗ ВЕБПАКА
 * ИДЕМ И ПИЛИМ КОСТЫЛИ
 * kys js!
 */
const pkgAssetsPath =
    'pkg' in process
        ? path.join(__dirname, 'assets')
        : path.join(__filename, '../../../assets');

const pkgRunningFolder =
    'pkg' in process ? path.dirname(process.execPath) : process.cwd();

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

        if (/[0-9 ]+x[ 0-9-]+/.test(value)) {
            object[key.toLowerCase()] = value.split('x');
        } else object[key.toLowerCase()] = value.trim();
    }

    filePath = path.resolve(filePath);

    const staticPath = path.resolve(config.staticFolderPath);
    object.folderName = path
        .dirname(filePath.replace(staticPath, ''))
        .replace(/^(\\\\\\|\\\\|\\|\/|\/\/)/, '')
        .replace(/\\/gm, '/');

    const settingsPath = path.join(
        staticPath,
        object.folderName,
        'settings.json'
    );
    const settings = fs.existsSync(settingsPath)
        ? JsonSaveParse(fs.readFileSync(settingsPath, 'utf8'), [])
        : [];

    if (object.resolution)
        object.resolution = object.resolution.map((r) => r.trim());
    if (object.authorlinks) object.authorlinks = object.authorlinks.split(',');

    object.settings = Array.isArray(settings) ? settings : [];

    delete object.compatiblewith;
    delete object.usecase;

    return object;
}

export function parseSettings(
    settingsPath: string,
    settingsValuesPath: string,
    folderName: string
): string | Error {
    const array:
        | {
              type:
                  | 'text'
                  | 'number'
                  | 'checkbox'
                  | 'options'
                  | 'color'
                  | 'note';
              title: string;
              description: string;
              value: any;
          }[]
        | Error = JsonSaveParse(
        fs.readFileSync(settingsPath, 'utf8'),
        new Error('nothing')
    );
    if (array instanceof Error) {
        return array;
    }

    if (!Array.isArray(array)) {
        return new Error('settings.json is not array of objects');
    }

    const arrayValues: {
        title: string;
        value: any;
    }[] = JsonSaveParse(fs.readFileSync(settingsValuesPath, 'utf8'), []);

    let html = `<h2 class="ms-title"><span>Settings</span><span>«${folderName}»</span></h2><div class="m-scroll">`;
    for (let i = 0; i < array.length; i++) {
        const setting = array[i];

        if (setting.title === undefined || setting.title === null) {
            continue;
        }

        const value =
            arrayValues.find((r) => r.title === setting.title)?.value ||
            setting.value;

        switch (setting.type) {
            case 'text': {
                html += settingsItemHTML
                    .replace('{NAME}', setting.title)
                    .replace('{DESCRIPTION}', setting.description)
                    .replace(
                        '{INPUT}',
                        inputHTML
                            .replace('{TYPE}', 'text')
                            .replace(/{NAME}/gm, setting.title)
                            .replace('{ADDON}', `ucs t="${setting.type}"`)
                            .replace('{VALUE}', value)
                    );

                break;
            }

            case 'number': {
                html += settingsItemHTML
                    .replace('{NAME}', setting.title)
                    .replace('{DESCRIPTION}', setting.description)
                    .replace(
                        '{INPUT}',
                        inputHTML
                            .replace('{TYPE}', 'number')
                            .replace(/{NAME}/gm, setting.title)
                            .replace('{ADDON}', `ucs t="${setting.type}"`)
                            .replace('{VALUE}', value)
                    );

                break;
            }

            case 'checkbox': {
                html += settingsItemHTML
                    .replace('{NAME}', setting.title)
                    .replace('{DESCRIPTION}', setting.description)
                    .replace(
                        '{INPUT}',
                        checkboxHTML
                            .replace('{TYPE}', 'text')
                            .replace(/{NAME}/gm, setting.title)
                            .replace(
                                '{ADDON}',
                                value
                                    ? `ucs t="${setting.type}" checked="true"`
                                    : `ucs t="${setting.type}"`
                            )
                            .replace('{VALUE}', `${value}`)
                    );

                break;
            }

            case 'color': {
                html += settingsItemHTML
                    .replace('{NAME}', setting.title)
                    .replace('{DESCRIPTION}', setting.description)
                    .replace(
                        '{INPUT}',
                        inputHTML
                            .replace('{TYPE}', 'color')
                            .replace(/{NAME}/gm, setting.title)
                            .replace('{ADDON}', `ucs t="${setting.type}"`)
                            .replace('{VALUE}', value)
                    );

                break;
            }

            case 'options': {
                const options = Array.isArray(setting.value)
                    ? setting.value
                          .map((r) => `<option value="${r}">${r}</option>`)
                          .join('\n')
                    : '';
                html += settingsItemHTML
                    .replace('{NAME}', setting.title)
                    .replace('{DESCRIPTION}', setting.description)
                    .replace(
                        '{INPUT}',
                        selectHTML
                            .replace(/{NAME}/gm, setting.title)
                            .replace('{ADDON}', ``)
                            .replace('{OPTIONS}', options)
                    );
                break;
            }
        }
    }

    html += '</div>'; // close scroll div

    html += `<div class="ms-btns flexer si-btn">
        <button class="button update-settings-button flexer" n="${folderName}"><span>Update settings</span></button>
        <button class="button cancel-button flexer"><span>Cancel</span></button>
    </div>`;
    return html;
}

export function saveSettings(
    settingsPath: string,
    settingsValuesPath: string,
    result: {
        title: string;
        value: any;
    }[]
) {
    const array:
        | {
              uniqueID: number;
              type: 'input' | 'checkbox' | 'options' | 'note';
              title: string;
              description: string;
              value: any;
          }[]
        | Error = JsonSaveParse(
        fs.readFileSync(settingsPath, 'utf8'),
        new Error('nothing')
    );
    if (array instanceof Error) {
        return array;
    }

    if (!Array.isArray(array)) {
        return new Error('settings.json is not array of objects');
    }

    for (let i = 0; i < result.length; i++) {
        const setting = result[i];

        const find = array.findIndex((r) => r.title === setting.title);
        if (find === -1) continue;

        switch (array[find].type) {
            case 'input': {
                array[find].value = setting.value;
                break;
            }

            case 'checkbox': {
                array[find].value = Boolean(setting.value);
                break;
            }

            default: {
                array[find].value = setting.value;
                break;
            }
        }
    }

    const values = array.map((r) => ({
        title: r.title,
        value: r.value
    }));
    fs.writeFileSync(settingsValuesPath, JSON.stringify(values), 'utf8');
    return true;
}

function rebuildJSON({
    array,
    external,
    query
}: {
    array: {
        folderName: string;
        name: string;
        author: string;
        resolution: number[];
        authorlinks: string[];
        settings: [];

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
            ) {
                continue;
            }
        }

        const name = nameHTML.replace('{NAME}', item.name);
        const author = authorHTML.replace('{AUTHOR}', item.author);

        const links = item.authorlinks
            .map((r) => {
                const domain =
                    /:\/\/(?<domain>\S+)\//.exec(r)?.groups?.domain || '';
                if (!domain) return null;

                const iconUrl = iconsImages[domain.toLowerCase()];
                if (!iconUrl) return null;

                return authorLinksHTML
                    .replace('{LINK}', r)
                    .replace('{ICON_URL}', iconUrl);
            })
            .filter((r) => r != null)
            .join(' ');

        const ip =
            config.serverIP === '0.0.0.0' ? 'localhost' : config.serverIP;

        const iframe = iframeHTML
            .replace(
                '{URL}',
                `http://${ip}:${config.serverPort}/${item.folderName}/`
            )
            .replace(
                '{WIDTH}',
                item.resolution[0] === -1
                    ? '500px'
                    : item.resolution[0] === -2
                      ? '100%'
                      : `${item.resolution[0]}px`
            )
            .replace(
                '{HEIGHT}',
                item.resolution[1] === -1 ? '500px' : `${item.resolution[1]}px`
            )
            .replace('{NAME}', item.folderName);

        const metadata = metadataHTML
            .replace(
                '{COPY_URL}',
                `http://${config.serverIP}:${config.serverPort}/${item.folderName}/`
            )
            .replace('{TEXT_URL}', `/${item.folderName}/`)
            .replace(
                '{COPY_X}',
                item.resolution[0] === -1 || item.resolution[0] === -2
                    ? 'ANY'
                    : item.resolution[0].toString()
            )
            .replace(
                '{X}',
                item.resolution[0] === -1 || item.resolution[0] === -2
                    ? 'ANY'
                    : item.resolution[0].toString()
            )
            .replace(
                '{COPY_Y}',
                item.resolution[1] === -1 || item.resolution[1] === -2
                    ? 'ANY'
                    : item.resolution[1].toString()
            )
            .replace(
                '{Y}',
                item.resolution[1] === -1 || item.resolution[1] === -2
                    ? 'ANY'
                    : item.resolution[1].toString()
            );

        const settingsBtn =
            item.settings.length > 0
                ? `<button class="button settings-button flexer" n="${item.folderName}"><span>Settings</span></button>`
                : '';

        const button = item.downloadLink
            ? `<div class="buttons-group indent-left"><button class="button dl-button flexer" l="${item.downloadLink}" n="${item.name}" a="${item.author}"><span>Download</span></button></div>`
            : `<div class="buttons-group flexer indent-left">
                ${settingsBtn}
                <button class="button open-button flexer" n="${item.folderName}"><span>Open Folder</span></button>
                <button class="button delete-button flexer" n="${item.folderName}"><span>Delete</span></button>
            </div>`;

        const assets = (item.assets || [])
            .map((r) => {
                return galleryImageHTML.replace('{LINK}', r.url);
            })
            .filter((r) => r != null)
            .join(' ');

        const gallery = item.assets ? assets : iframe;

        const footer =
            external !== true
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
    try {
        const staticPath =
            path.resolve(config.staticFolderPath) ||
            path.join(pkgRunningFolder, 'static');

        const countersListTXT = recursiveFilesSearch({
            _ignoreFileName: 'ignore.txt',
            dir: staticPath,
            fileList: [],
            filename: 'metadata.txt'
        });

        const countersListHTML = recursiveFilesSearch({
            _ignoreFileName: 'ignore.txt',
            dir: staticPath,
            fileList: [],
            filename: 'index.html'
        });

        const arrayOfLocal = countersListHTML
            .filter((r) => {
                const folder = path.dirname(r);
                return (
                    countersListTXT.find((s) => path.dirname(s) === folder) ==
                    null
                );
            })
            .map((r) => {
                const nestedFolderPath = path.dirname(
                    r.replace(staticPath, '')
                );
                const folderName = nestedFolderPath
                    .replace(/^(\\\\\\|\\\\|\\|\/|\/\/)/, '')
                    .replace(/\\/gm, '/');

                const settingsPath = path.join(
                    staticPath,
                    folderName,
                    'settings.json'
                );
                const settings = fs.existsSync(settingsPath)
                    ? JsonSaveParse(fs.readFileSync(settingsPath, 'utf8'), [])
                    : [];

                return {
                    folderName: nestedFolderPath
                        .replace(/^(\\\\\\|\\\\|\\|\/|\/\/)/, '')
                        .replace(/\\/gm, '/'),
                    name: path.basename(path.dirname(r)),
                    author: 'local',
                    resolution: [-2, '400'],
                    authorlinks: [],
                    settings: Array.isArray(settings) ? settings : []
                };
            });

        const array = countersListTXT.map((r) => parseTXT(r));
        return array.concat(arrayOfLocal).filter((r) => r.name !== '');
    } catch (error) {
        wLogger.error((error as any).message);
        wLogger.debug(error);
        return [];
    }
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
        return res.end(build || emptyCounters);
    }

    fs.readFile(
        path.join(pkgAssetsPath, 'homepage.html'),
        'utf8',
        (err, content) => {
            if (err) {
                wLogger.debug(err);
                res.writeHead(404, {
                    'Content-Type': 'text/html'
                });

                res.end('<html>page not found</html>');
                return;
            }

            const html = content.replace('{{LIST}}', build || emptyNotice);

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
        'https://raw.githubusercontent.com/cyperdark/osu-counters/master/.github/api.json'
    );
    const json: any = await request.json();

    const exists = getLocalCounters();
    const array = json.filter(
        (r) => !exists.find((s) => s.name === r.name && s.author === r.author)
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
        return res.end(build || emptyCounters);
    }

    fs.readFile(
        path.join(pkgAssetsPath, 'homepage.html'),
        'utf8',
        (err, content) => {
            if (err) {
                wLogger.debug(err);
                res.writeHead(404, {
                    'Content-Type': 'text/html'
                });

                res.end('<html>page not found</html>');
                return;
            }

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
        .replace('{NAME}', 'DEBUG_LOG')
        .replace(
            '{DESCRIPTION}',
            "Enables logs for tosu developers, not very intuitive for you, the end user.<br />best not to include without developer's request."
        )
        .replace(
            '{INPUT}',
            checkboxHTML
                .replace(/{NAME}/gm, 'DEBUG_LOG')
                .replace('{ADDON}', config.debugLogging ? 'checked="true"' : '')
                .replace('{VALUE}', `${config.debugLogging}`)
        );

    const calculatePPHTML = settingsItemHTML
        .replace('{NAME}', 'CALCULATE_PP')
        .replace(
            '{DESCRIPTION}',
            'Turns PP counting on/off. Very useful for tournament client, you only care about scoring and map stats for example'
        )
        .replace(
            '{INPUT}',
            checkboxHTML
                .replace(/{NAME}/gm, 'CALCULATE_PP')
                .replace('{ADDON}', config.calculatePP ? 'checked="true"' : '')
                .replace('{VALUE}', `${config.calculatePP}`)
        );

    const enableKeyOverlayHTML = settingsItemHTML
        .replace('{NAME}', 'ENABLE_KEY_OVERLAY')
        .replace(
            '{DESCRIPTION}',
            'Enables/disable reading of K1/K2/M1/M2 keys from osu'
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

    const enableGosuOverlayHTML = settingsItemHTML
        .replace('{NAME}', 'ENABLE_GOSU_OVERLAY')
        .replace(
            '{DESCRIPTION}',
            'Enables/disable in-game <b>gosumemory</b> overlay<br />(!!!I AM NOT RESPONSIBLE FOR USING IT!!!)'
        )
        .replace(
            '{INPUT}',
            checkboxHTML
                .replace(/{NAME}/gm, 'ENABLE_GOSU_OVERLAY')
                .replace(
                    '{ADDON}',
                    config.enableGosuOverlay ? 'checked="true"' : ''
                )
                .replace('{VALUE}', `${config.enableGosuOverlay}`)
        );

    const pollRateHTML = settingsItemHTML
        .replace('{NAME}', 'POLL_RATE')
        .replace(
            '{DESCRIPTION}',
            'Frequency in milliseconds for updating information.'
        )
        .replace(
            '{INPUT}',
            inputHTML
                .replace('{TYPE}', 'number')
                .replace(/{NAME}/gm, 'POLL_RATE')
                .replace('{ADDON}', config.pollRate ? 'min="0"' : '')
                .replace('{VALUE}', `${config.pollRate}`)
        );

    const preciseDataPollRateHTML = settingsItemHTML
        .replace('{NAME}', 'PRECISE_DATA_POLL_RATE')
        .replace(
            '{DESCRIPTION}',
            'Frequency in milliseconds for updating precise information. (Key overlay and HitErrorData)'
        )
        .replace(
            '{INPUT}',
            inputHTML
                .replace('{TYPE}', 'number')
                .replace(/{NAME}/gm, 'PRECISE_DATA_POLL_RATE')
                .replace('{ADDON}', config.preciseDataPollRate ? 'min="0"' : '')
                .replace('{VALUE}', `${config.preciseDataPollRate}`)
        );

    const serverIPHTML = settingsItemHTML
        .replace('{NAME}', 'SERVER_IP')
        .replace('{DESCRIPTION}', 'The IP address for the API and WebSocket.')
        .replace(
            '{INPUT}',
            inputHTML
                .replace('{TYPE}', 'text')
                .replace(/{NAME}/gm, 'SERVER_IP')
                .replace('{ADDON}', config.serverIP ? 'min="0"' : '')
                .replace('{VALUE}', `${config.serverIP}`)
        );

    const serverPortHTML = settingsItemHTML
        .replace('{NAME}', 'SERVER_PORT')
        .replace('{DESCRIPTION}', 'The port for the API and WebSocket.')
        .replace(
            '{INPUT}',
            inputHTML
                .replace('{TYPE}', 'number')
                .replace(/{NAME}/gm, 'SERVER_PORT')
                .replace('{ADDON}', config.serverPort ? 'min="0"' : '')
                .replace('{VALUE}', `${config.serverPort}`)
        );

    const staticFolderPathtHTML = settingsItemHTML
        .replace('{NAME}', 'STATIC_FOLDER_PATH')
        .replace('{DESCRIPTION}', 'The directory path containing PP counters.')
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
    ${enableGosuOverlayHTML}
    ${pollRateHTML}
    ${preciseDataPollRateHTML}
    ${serverIPHTML}
    ${serverPortHTML}
    ${staticFolderPathtHTML}
    ${saveSettingsButtonHTML}
    </div>`;

    fs.readFile(
        path.join(pkgAssetsPath, 'homepage.html'),
        'utf8',
        (err, content) => {
            if (err) {
                wLogger.debug(err);
                res.writeHead(404, {
                    'Content-Type': 'text/html'
                });

                res.end('<html>page not found</html>');
                return;
            }

            const html = content.replace('{{LIST}}', settings);

            res.writeHead(200, {
                'Content-Type': getContentType('file.html')
            });
            res.end(html);
        }
    );
}

export function buildInstructionLocal(res: http.ServerResponse) {
    const pageContent = `<div class="settings">
        <h3>How to Add Your Own Counter <a>Locally</a></h3>
        <p>
          1. <b>Create a new folder</b>:<br>- First, create a <a>new folder</a> inside your static folder.<br><br>
          2. <b>Move your pp counter files</b>:<br>- Next, move <a>your pp counter</a> files into the newly created folder.<br><br>
          3. <b>Download and place metadata file</b>:<br>- Download the <a
             href="https://raw.githubusercontent.com/cyperdark/osu-counters/master/quickstart/metadata.txt"
             target="_blank">metadata.txt</a> file and place it in the counter folder.<br><br>
          4. <b>Fill out the metadata file</b>:<br>- Finally, <a>open</a> the metadata.txt file and <a>fill out</a> the necessary information.
        </p>
      </div>`;
    fs.readFile(
        path.join(pkgAssetsPath, 'homepage.html'),
        'utf8',
        (err, content) => {
            if (err) {
                wLogger.debug(err);
                res.writeHead(404, {
                    'Content-Type': 'text/html'
                });

                res.end('<html>page not found</html>');
                return;
            }

            const html = content.replace('{{LIST}}', pageContent);

            res.writeHead(200, {
                'Content-Type': getContentType('file.html')
            });
            res.end(html);
        }
    );
}
