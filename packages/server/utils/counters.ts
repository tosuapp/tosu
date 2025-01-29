import {
    JsonSafeParse,
    config,
    getStaticPath,
    recursiveFilesSearch,
    wLogger
} from '@tosu/common';
import fs from 'fs';
import http from 'http';
import path from 'path';
import semver from 'semver';

import { getContentType } from '../utils';
import { ICounter, bodyPayload } from './counters.types';
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
    settingsItemHTML,
    submitCounterHTML,
    textareaHTML
} from './htmls';
import { parseCounterSettings } from './parseSettings';

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
        if (
            key === null ||
            value === null ||
            key === undefined ||
            value === undefined
        )
            continue;
        value = value.split('##')[0].replace(/\r/, '').replace(':', '');

        if (/[0-9 ]+x[ 0-9-]+/.test(value)) {
            object[key.toLowerCase()] = value.split(/x/i);
        } else object[key.toLowerCase()] = value.trim();
    }

    filePath = path.resolve(filePath);

    const staticPath = getStaticPath();
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
        ? JsonSafeParse(fs.readFileSync(settingsPath, 'utf8'), [])
        : [];

    if (object.resolution)
        object.resolution = object.resolution.map((r) => +r.trim()) || [
            'Any',
            'Any'
        ];
    else object.resolution = ['Any', 'Any'];

    if (object.authorlinks) object.authorlinks = object.authorlinks.split(',');
    if (!object.version) object.version = '1.0';

    object.settings = Array.isArray(settings) ? settings : [];

    delete object.compatiblewith;
    delete object.usecase;

    return object;
}

export function saveSettings(folderName: string, payload: bodyPayload[]) {
    const result = parseCounterSettings(
        folderName,
        'user/save',
        payload as any
    );
    if (result instanceof Error) {
        return result;
    }

    fs.writeFileSync(
        result.settingsValuesPath!,
        JSON.stringify(result.values),
        'utf8'
    );
    return true;
}

function rebuildJSON({
    array,
    external,
    query
}: {
    array: ICounter[];
    external?: boolean;
    query?: string;
}) {
    let items = '';
    for (let i = 0; i < array.length; i++) {
        const item = array[i];

        try {
            if (query != null) {
                let isCompatibleFilter = false;
                if (
                    query.toLowerCase() === 'sc' &&
                    item.compatiblewith?.some((r) =>
                        r.toLowerCase().includes('streamcompanion')
                    )
                )
                    isCompatibleFilter = true;

                if (
                    !(
                        item.name.toLowerCase().includes(query) ||
                        item.name.toLowerCase().includes(query)
                    ) &&
                    isCompatibleFilter !== true
                ) {
                    continue;
                }
            }

            if (!Array.isArray(item.settings)) item.settings = [];

            const externalHasSettings =
                item._settings === true && external === true
                    ? '<div class="external-exists flexer"><i class="icon-settings"></i> customisable</div>'
                    : '';

            const name = nameHTML
                .replace(
                    '{NAME}',
                    item.version
                        ? `${item.name} v${item.version}${externalHasSettings}`
                        : `${item.name}${externalHasSettings}`
                )
                .replace('{CLASS}', 'flexer');
            const author = authorHTML.replace('{AUTHOR}', item.author);

            const authorlinks = Array.isArray(item.authorlinks)
                ? item.authorlinks
                : [];

            const links = authorlinks
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
                          : item.resolution[0] <= 10
                            ? '100%'
                            : `${item.resolution[0]}px`
                )
                .replace(
                    '{HEIGHT}',
                    item.resolution[1] === -1
                        ? '500px'
                        : item.resolution[0] <= 10
                          ? '300px'
                          : `${item.resolution[1]}px`
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

            const settingsBuilderBtn = `<button class="button settings-builder-button flexer" n="${item.folderName}"><i class="icon-builder"></i></button>`;

            const settingsBtn =
                item.settings.length > 0
                    ? `<button class="button settings-button flexer" n="${item.folderName}"><span>Settings</span></button>`
                    : '';

            const updateBtn =
                item._updatable === true
                    ? `<button class="button update-button flexer" l="${item.downloadLink}" n="${item.name}" a="${item.author}"><span>Update</span></button>`
                    : '';
            const downloadBtn =
                item.downloadLink && item._downloaded !== true
                    ? `<button class="button dl-button flexer" l="${item.downloadLink}" n="${item.name}" a="${item.author}"><span>Download</span></button>`
                    : `<button class="button open-button flexer" n="${item.name} by ${item.author}"><span>Open Folder</span></button>`;

            const externalButtons = `<div class="buttons-group flexer indent-left">
                ${updateBtn}
                ${downloadBtn}
            </div>`;

            const localButtons = `<div class="calu buttons-group flexer indent-left" n="${item.name}" a="${item.author}" v="${item.version}">
                ${settingsBuilderBtn}
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

            let itemStatus = '';
            if (item._updatable === true) itemStatus = ' updatable';
            else if (item._downloaded === true) itemStatus = ' downloaded';

            items += resultItemHTML
                .replace('{CLASS}', itemStatus)
                .replace('{NAME}', name)
                .replace('{AUTHOR}', author)
                .replace('{AUTHOR_LINKS}', links)
                .replace('{BUTTONS}', external ? externalButtons : localButtons)
                .replace('{GALLERY}', gallery)
                .replace('{FOOTER}', footer);
        } catch (error) {
            wLogger.error('rebuildJSON', item.name, (error as any).message);
            wLogger.debug('rebuildJSON', item.name, error);
        }
    }

    return items;
}

export function getLocalCounters(): ICounter[] {
    try {
        const staticPath = getStaticPath();

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
                    ? JsonSafeParse(fs.readFileSync(settingsPath, 'utf8'), [])
                    : [];

                return {
                    folderName: nestedFolderPath
                        .replace(/^(\\\\\\|\\\\|\\|\/|\/\/)/, '')
                        .replace(/\\/gm, '/'),
                    name: path.basename(path.dirname(r)),
                    version: '1.0',
                    author: 'local',
                    resolution: [-2, '400'],
                    authorlinks: [],
                    settings: Array.isArray(settings) ? settings : []
                } as ICounter;
            });

        const array = countersListTXT.map((r) => parseTXT(r));
        return array.concat(arrayOfLocal).filter((r) => r.name !== '');
    } catch (error) {
        wLogger.error('getLocalCounters', (error as any).message);
        wLogger.debug('getLocalCounters', error);

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
                wLogger.debug('buildLocalCounters', 'homepage read', err);
                res.writeHead(404, {
                    'Content-Type': 'text/html'
                });

                res.end('<html>page not found</html>');
                return;
            }

            let html = content
                .replace('{{LOCAL_AMOUNT}}', ` (${array.length})`)
                .replace('{{AVAILABLE_AMOUNT}}', ``)
                .replace('{{LIST}}', build || emptyNotice);
            if (semver.gt(config.updateVersion, config.currentVersion)) {
                html = html
                    .replace('{OLD}', config.currentVersion)
                    .replace('{NEW}', config.updateVersion)
                    .replace('update-available hidden', 'update-available');
            }

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
    let text = '';
    let totalLocal = 0;
    let totalAvailable = 0;

    try {
        const request: any = await fetch('https://tosu.app/api.json');
        const json: ICounter[] = await request.json();

        const exists = getLocalCounters();
        const array = json.map((r) => {
            const find = exists.find(
                (s) => s.name === r.name && s.author === r.author
            );

            if (
                r.version &&
                find &&
                r.version.toString().toLowerCase() !==
                    find.version.toString().toLowerCase()
            )
                r._updatable = true;

            if (find) r._downloaded = true;
            return r;
        });

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

        text = build;

        totalLocal = exists.length;
        totalAvailable = json.length;
    } catch (error) {
        wLogger.error('buildExternalCounters', (error as any).message);
        wLogger.debug('buildExternalCounters', error);

        if (query != null) {
            res.writeHead(200, {
                'Content-Type': getContentType('file.html')
            });
            return res.end((error as any).message || emptyCounters);
        }

        text = `Error: ${(error as any).message}`;
    }

    fs.readFile(
        path.join(pkgAssetsPath, 'homepage.html'),
        'utf8',
        (err, content) => {
            if (err) {
                wLogger.debug('buildExternalCounters', 'homepage read', err);
                res.writeHead(404, { 'Content-Type': 'text/html' });

                res.end('<html>page not found</html>');
                return;
            }

            let responseHTML = submitCounterHTML;
            responseHTML += text || noMoreCounters;

            let html = content
                .replace('{{LOCAL_AMOUNT}}', ` (${totalLocal})`)
                .replace('{{AVAILABLE_AMOUNT}}', ` (${totalAvailable})`)
                .replace('{{LIST}}', responseHTML);
            if (semver.gt(config.updateVersion, config.currentVersion)) {
                html = html
                    .replace('{OLD}', config.currentVersion)
                    .replace('{NEW}', config.updateVersion)
                    .replace('update-available hidden', 'update-available');
            }

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
            'Enable/disable the logging of additional debug information to the console.<br />Note: Devs might ask you to enabled this feature for debugging purposes.<br />Note: We suggest to keep this setting disabled while playing the game as it may cause performance issues.'
        )
        .replace(
            '{CHECKBOX}',
            checkboxHTML
                .replace(/{ID}/gm, 'DEBUG_LOG')
                .replace('{ADDON}', config.debugLogging ? 'checked="true"' : '')
                .replace('{VALUE}', `${config.debugLogging}`)
        )
        .replace('{INPUT}', '');

    const calculatePPHTML = settingsItemHTML
        .replace('{NAME}', 'CALCULATE_PP')
        .replace(
            '{DESCRIPTION}',
            'Enable/disable the real-time calculation of performance points.<br />Note: Useful to disable for tournament clients.'
        )
        .replace(
            '{CHECKBOX}',
            checkboxHTML
                .replace(/{ID}/gm, 'CALCULATE_PP')
                .replace('{ADDON}', config.calculatePP ? 'checked="true"' : '')
                .replace('{VALUE}', `${config.calculatePP}`)
        )
        .replace('{INPUT}', '');

    const enableKeyOverlayHTML = settingsItemHTML
        .replace('{NAME}', 'ENABLE_KEY_OVERLAY')
        .replace(
            '{DESCRIPTION}',
            'Enable/disable the retrieval of data from the key overlay. (K1/K2/M1/M2)'
        )
        .replace(
            '{CHECKBOX}',
            checkboxHTML
                .replace(/{ID}/gm, 'ENABLE_KEY_OVERLAY')
                .replace(
                    '{ADDON}',
                    config.enableKeyOverlay ? 'checked="true"' : ''
                )
                .replace('{VALUE}', `${config.enableKeyOverlay}`)
        )
        .replace('{INPUT}', '');

    const enableIngameOverlayHTML = settingsItemHTML
        .replace('{NAME}', 'ENABLE_INGAME_OVERLAY')
        .replace('{DESCRIPTION}', 'Enable/disable the in-game overlay.')
        .replace(
            '{CHECKBOX}',
            checkboxHTML
                .replace(/{ID}/gm, 'ENABLE_INGAME_OVERLAY')
                .replace(
                    '{ADDON}',
                    config.enableIngameOverlay ? 'checked="true"' : ''
                )
                .replace('{VALUE}', `${config.enableIngameOverlay}`)
        )
        .replace('{INPUT}', '');

    const pollRateHTML = settingsItemHTML
        .replace('{NAME}', 'POLL_RATE')
        .replace(
            '{DESCRIPTION}',
            'Interval of time (in milliseconds) between the retrieval of general data.'
        )
        .replace(
            '{INPUT}',
            inputHTML
                .replace('{TYPE}', 'number')
                .replace(/{ID}/gm, 'POLL_RATE')
                .replace('{ADDON}', config.pollRate ? 'min="100"' : '')
                .replace('{VALUE}', `${config.pollRate}`)
        )
        .replace('{CHECKBOX}', '');

    const preciseDataPollRateHTML = settingsItemHTML
        .replace('{NAME}', 'PRECISE_DATA_POLL_RATE')
        .replace(
            '{DESCRIPTION}',
            'Interval of time (in milliseconds) between the retrieval of precise data. (HitErrorData, KeyOverlayData)'
        )
        .replace(
            '{INPUT}',
            inputHTML
                .replace('{TYPE}', 'number')
                .replace(/{ID}/gm, 'PRECISE_DATA_POLL_RATE')
                .replace('{ADDON}', config.preciseDataPollRate ? 'min="0"' : '')
                .replace('{VALUE}', `${config.preciseDataPollRate}`)
        )
        .replace('{CHECKBOX}', '');

    const enableAutoUpdateHtml = settingsItemHTML
        .replace('{NAME}', 'ENABLE_AUTOUPDATE')
        .replace(
            '{DESCRIPTION}',
            'Enable/disable the automatic download of the latest stable version of tosu. (Source: GitHub Releases).'
        )
        .replace(
            '{CHECKBOX}',
            checkboxHTML
                .replace(/{ID}/gm, 'ENABLE_AUTOUPDATE')
                .replace(
                    '{ADDON}',
                    config.enableAutoUpdate ? 'checked="true"' : ''
                )
                .replace('{VALUE}', `${config.enableAutoUpdate}`)
        )
        .replace('{INPUT}', '');

    const openDashboardOnStartupHtml = settingsItemHTML
        .replace('{NAME}', 'OPEN_DASHBOARD_ON_STARTUP')
        .replace(
            '{DESCRIPTION}',
            'Automatically open the dashboard in a browser tab when tosu starts.'
        )
        .replace(
            '{CHECKBOX}',
            checkboxHTML
                .replace(/{ID}/gm, 'OPEN_DASHBOARD_ON_STARTUP')
                .replace(
                    '{ADDON}',
                    config.openDashboardOnStartup ? 'checked="true"' : ''
                )
                .replace('{VALUE}', `${config.openDashboardOnStartup}`)
        )
        .replace('{INPUT}', '');

    const serverIPHTML = settingsItemHTML
        .replace('{NAME}', 'SERVER_IP')
        .replace('{DESCRIPTION}', 'Host IP of the tosu local server. (API/WS)')
        .replace(
            '{INPUT}',
            inputHTML
                .replace('{TYPE}', 'text')
                .replace(/{ID}/gm, 'SERVER_IP')
                .replace('{ADDON}', config.serverIP ? 'min="0"' : '')
                .replace('{VALUE}', `${config.serverIP}`)
        )
        .replace('{CHECKBOX}', '');

    const serverPortHTML = settingsItemHTML
        .replace('{NAME}', 'SERVER_PORT')
        .replace('{DESCRIPTION}', 'Web port of the tosu local server. (API/WS)')
        .replace(
            '{INPUT}',
            inputHTML
                .replace('{TYPE}', 'number')
                .replace(/{ID}/gm, 'SERVER_PORT')
                .replace('{ADDON}', config.serverPort ? 'min="0"' : '')
                .replace('{VALUE}', `${config.serverPort}`)
        )
        .replace('{CHECKBOX}', '');

    const staticFolderPathHTML = settingsItemHTML
        .replace('{NAME}', 'STATIC_FOLDER_PATH')
        .replace(
            '{DESCRIPTION}',
            'Path to the folder containing the pp counters.'
        )
        .replace(
            '{INPUT}',
            inputHTML
                .replace('{TYPE}', 'text')
                .replace(/{ID}/gm, 'STATIC_FOLDER_PATH')
                .replace('{ADDON}', config.staticFolderPath ? 'min="0"' : '')
                .replace('{VALUE}', `${config.staticFolderPath}`)
        )
        .replace('{CHECKBOX}', '');

    const showMpCommandsHTML = settingsItemHTML
        .replace('{NAME}', 'SHOW_MP_COMMANDS')
        .replace(
            '{DESCRIPTION}',
            `Show multiplayer commands in the tournament manager chat. (The ones starting with '!mp')<br />Note: Option disabled by default.`
        )
        .replace(
            '{CHECKBOX}',
            checkboxHTML
                .replace(/{ID}/gm, 'SHOW_MP_COMMANDS')
                .replace(
                    '{ADDON}',
                    config.showMpCommands ? 'checked="true"' : ''
                )
                .replace('{VALUE}', `${config.showMpCommands}`)
        )
        .replace('{INPUT}', '');

    const allowedIPsHTML = settingsItemHTML
        .replace('{NAME}', 'ALLOWED_IPS')
        .replace(
            '{DESCRIPTION}',
            `Whitelist of IPs that are allowed to interact with the local tosu server.<br /><br />- Has wildcard syntax support (eg. 192.168.*.*)<br />- Matches against IPs that receive the "Unallowed Request" status.`
        )
        .replace(
            '{INPUT}',
            textareaHTML
                .replace(/{ID}/gm, 'ALLOWED_IPS')
                .replace('{ADDON}', 'rows="3"')
                .replace('{VALUE}', `${config.allowedIPs}`)
        )
        .replace('{CHECKBOX}', '');

    const settings = `<div class="settings">
    ${enableAutoUpdateHtml}
    ${openDashboardOnStartupHtml}
    <div class="si-divider"></div>
    ${enableIngameOverlayHTML}
    ${enableKeyOverlayHTML}
    <div class="si-divider"></div>
    ${calculatePPHTML}
    ${showMpCommandsHTML}
    <div class="si-divider"></div>
    ${pollRateHTML}
    ${preciseDataPollRateHTML}
    <div class="si-divider"></div>
    ${serverIPHTML}
    ${serverPortHTML}
    ${allowedIPsHTML}
    <div class="si-divider"></div>
    ${staticFolderPathHTML}
    ${debugHTML}
    ${saveSettingsButtonHTML}
    </div>`;

    fs.readFile(
        path.join(pkgAssetsPath, 'homepage.html'),
        'utf8',
        (err, content) => {
            if (err) {
                wLogger.debug('buildSettings', 'homepage read', err);
                res.writeHead(404, { 'Content-Type': 'text/html' });

                res.end('<html>page not found</html>');
                return;
            }

            let html = content
                .replace('{{LOCAL_AMOUNT}}', '')
                .replace('{{AVAILABLE_AMOUNT}}', '')
                .replace('{{LIST}}', settings);
            if (semver.gt(config.updateVersion, config.currentVersion)) {
                html = html
                    .replace('{OLD}', config.currentVersion)
                    .replace('{NEW}', config.updateVersion)
                    .replace('update-available hidden', 'update-available');
            }

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
          1. <b>Create a new folder</b>:<br>- First, create a <a>new folder</a> inside your <a class="button open-button small" n="static.exe">static folder</a>.<br><br>
          2. <b>Move your pp counter files</b>:<br>- Next, move <a>your pp counter</a> files into the newly created folder.<br><br>
          3. <b>Download and place metadata file</b>:<br>- Download the <a
             href="https://raw.githubusercontent.com/tosuapp/counters/master/quickstart/metadata.txt"
             target="_blank">metadata.txt</a> file and place it in the counter folder.<br><br>
          4. <b>Fill out the metadata file</b>:<br>- Finally, <a>open</a> the metadata.txt file and <a>fill out</a> the necessary information.
        </p>
      </div>`;
    fs.readFile(
        path.join(pkgAssetsPath, 'homepage.html'),
        'utf8',
        (err, content) => {
            if (err) {
                wLogger.debug('buildInstructionLocal', 'homepage read', err);
                res.writeHead(404, { 'Content-Type': 'text/html' });

                res.end('<html>page not found</html>');
                return;
            }

            let html = content
                .replace('{{LOCAL_AMOUNT}}', '')
                .replace('{{AVAILABLE_AMOUNT}}', '')
                .replace('{{LIST}}', pageContent);
            if (semver.gt(config.updateVersion, config.currentVersion)) {
                html = html
                    .replace('{OLD}', config.currentVersion)
                    .replace('{NEW}', config.updateVersion)
                    .replace('update-available hidden', 'update-available');
            }

            res.writeHead(200, {
                'Content-Type': getContentType('file.html')
            });
            res.end(html);
        }
    );
}
