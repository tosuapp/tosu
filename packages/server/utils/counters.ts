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
    emptyCounters,
    emptyNotice,
    galleryImageHTML,
    iconsImages,
    iframeHTML,
    metadataHTML,
    nameHTML,
    noMoreCounters,
    resultItemHTML,
    searchBar,
    settingsGroupHTML,
    settingsItemHTMLv2,
    settingsNumberInputHTML,
    settingsSaveButtonHTMLv2,
    settingsSwitchHTML,
    settingsTextInputHTML,
    settingsTextareaInputHTML
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
    address,
    external,
    query
}: {
    array: ICounter[];
    address: string | undefined;
    external?: boolean;
    query?: string;
}) {
    let items = '';
    for (let i = 0; i < array.length; i++) {
        const item = array[i];

        try {
            if (query != null) {
                const queryArr = Array.from(
                    new Set(query.split(' ').map((r) => r.toLowerCase()))
                );

                if (queryArr.includes('sc')) {
                    const idx = queryArr.indexOf('sc');
                    if (idx !== -1) queryArr[idx] = 'streamcompanion';
                }

                const hasQuery = queryArr.some(
                    (q) =>
                        item.name.toLowerCase().includes(q) ||
                        item.author.toLowerCase().includes(q) ||
                        (item.compatiblewith ?? []).some((c) =>
                            c.toLowerCase().includes(q)
                        )
                );
                if (!hasQuery) continue;
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
                config.serverIP === '0.0.0.0' ? '127.0.0.1' : config.serverIP;

            const iframe = iframeHTML
                .replace(
                    '{URL}',
                    `http://${address || ip}:${config.serverPort}/${item.folderName}/`
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
                    `http://${address || ip}:${config.serverPort}/${item.folderName}/`
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

export function buildLocalCounters(
    res: http.ServerResponse,
    address: string | undefined,
    query?: string
) {
    const array = getLocalCounters();
    const build = rebuildJSON({
        array,
        address,
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
                .replace('{{SEARCH}}', searchBar)
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
    address: string | undefined,
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
            address,
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

            let html = content
                .replace('{{LOCAL_AMOUNT}}', ` (${totalLocal})`)
                .replace('{{AVAILABLE_AMOUNT}}', ` (${totalAvailable})`)
                .replace('{{SEARCH}}', searchBar)
                .replace('{{LIST}}', text || noMoreCounters);
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
    const generalGroup = settingsGroupHTML
        .replace('{header}', 'General')
        .replace(
            '{items}',
            [
                settingsItemHTMLv2
                    .replace('{name}', 'Auto Update Client')
                    .replace(
                        '{description}',
                        'Check for updates on startup and automatically install newer versions if available.'
                    )
                    .replace(
                        '{input-1}',
                        settingsSwitchHTML
                            .replace('{id}', 'ENABLE_AUTOUPDATE')
                            .replace(
                                '{checked}',
                                config.enableAutoUpdate ? 'checked' : ''
                            )
                    ),
                settingsItemHTMLv2

                    .replace('{name}', 'Open Dashboard on Startup')
                    .replace(
                        '{description}',
                        'Automatically open the tosu dashboard in your default browser on startup.'
                    )
                    .replace(
                        '{input-1}',
                        settingsSwitchHTML
                            .replace('{id}', 'OPEN_DASHBOARD_ON_STARTUP')
                            .replace(
                                '{checked}',
                                config.openDashboardOnStartup ? 'checked' : ''
                            )
                    ),
                settingsItemHTMLv2
                    .replace('{name}', 'In-Game Overlay')
                    .replace(
                        '{description}',
                        'Show the in-game overlay in the game, toggleable via a custom keybind.'
                    )
                    .replace(
                        '{input-1}',
                        settingsSwitchHTML
                            .replace('{id}', 'ENABLE_INGAME_OVERLAY')
                            .replace(
                                '{checked}',
                                config.enableIngameOverlay ? 'checked' : ''
                            )
                    )
                    .replace(
                        '{input-2}',
                        settingsTextInputHTML
                            .replace('{id}', 'INGAME_OVERLAY_KEYBIND')
                            .replace('{value}', config.ingameOverlayKeybind)
                    )
            ]
                .map((item) => item.replace(/\{[^}]*}/g, ''))
                .join('\n')
        );

    const dataGroup = settingsGroupHTML
        .replace('{header}', 'Data Fetching')
        .replace(
            '{items}',
            [
                settingsItemHTMLv2
                    .replace('{name}', 'RT PP Calculation')
                    .replace(
                        '{description}',
                        'Allow real-time calculation of performance points.<br>Useful to turn off for tournaments or users who do not care about pp.'
                    )
                    .replace(
                        '{input-1}',
                        settingsSwitchHTML
                            .replace('{id}', 'CALCULATE_PP')
                            .replace(
                                '{checked}',
                                config.calculatePP ? 'checked' : ''
                            )
                    ),
                settingsItemHTMLv2

                    .replace('{name}', 'Key Overlay Data')
                    .replace(
                        '{description}',
                        'Allow retrieval of live keypress data for the [K1/K2/M1/M2] keys.'
                    )
                    .replace(
                        '{input-1}',
                        settingsSwitchHTML
                            .replace('{id}', 'ENABLE_KEY_OVERLAY')
                            .replace(
                                '{checked}',
                                config.calculatePP ? 'checked' : ''
                            )
                    ),
                settingsItemHTMLv2
                    .replace('{name}', 'Common Poll Rate')
                    .replace(
                        '{description}',
                        'Interval of time, in milliseconds, between polling of general game data.'
                    )
                    .replace(
                        '{input-2}',
                        settingsNumberInputHTML
                            .replace('{id}', 'POLL_RATE')
                            .replace('{value}', config.pollRate.toString())
                            .replace('{min}', '100')
                    ),
                settingsItemHTMLv2
                    .replace('{name}', 'Precise Poll Rate')
                    .replace(
                        '{description}',
                        'Interval of time, in milliseconds, between polling of precise game data. (KeyOverlayData, HitErrorData)'
                    )
                    .replace(
                        '{input-2}',
                        settingsNumberInputHTML
                            .replace('{id}', 'PRECISE_POLL_RATE')
                            .replace(
                                '{value}',
                                config.preciseDataPollRate.toString()
                            )
                            .replace('{min}', '0')
                    )
            ]
                .map((item) => item.replace(/\{[^}]*}/g, ''))
                .join('\n')
        );

    const serverGroup = settingsGroupHTML
        .replace('{header}', 'Server')
        .replace(
            '{items}',
            [
                "<div style='display: flex; flex-direction: row; gap: 4rem'>{items}</div>".replace(
                    '{items}',
                    [
                        settingsItemHTMLv2
                            .replace('{name}', 'Server IP')
                            .replace(
                                '{description}',
                                'The server IP address tosu will listen on.'
                            )
                            .replace(
                                '{input-2}',
                                settingsTextInputHTML
                                    .replace('{id}', 'SERVER_IP')
                                    .replace(
                                        '{value}',
                                        config.serverIP.toString()
                                    )
                            ),
                        settingsItemHTMLv2
                            .replace('{name}', 'Server Port')
                            .replace(
                                '{description}',
                                'The server port tosu will listen on.<br>Must be between 1024 and 65535.'
                            )
                            .replace(
                                '{input-2}',
                                settingsTextInputHTML
                                    .replace('{id}', 'SERVER_PORT')
                                    .replace(
                                        '{value}',
                                        config.serverPort.toString()
                                    )
                            )
                    ]
                        .map((item) => item.replace(/\{[^}]*}/g, ''))
                        .join('\n')
                ),
                settingsItemHTMLv2
                    .replace('{name}', 'Allowed IPs')
                    .replace(
                        '{description}',
                        'A comma-separated list of IP addresses that are allowed to connect to the server.<br>Server IP is automatically added to the list. | Supports wildcard support (eg. 192.168.*.*)'
                    )
                    .replace(
                        '{input-3}',
                        settingsTextareaInputHTML
                            .replace('{id}', 'ALLOWED_IPS')
                            .replace('{value}', config.allowedIPs)
                    )
            ]
                .map((item) => item.replace(/\{[^}]*}/g, ''))
                .join('\n')
        );

    const advancedGroup = settingsGroupHTML
        .replace('{header}', 'Advanced')
        .replace(
            '{items}',
            [
                settingsItemHTMLv2
                    .replace('{name}', 'Debugging Mode')
                    .replace(
                        '{description}',
                        'Allow logging of additional verbose data to the console.<br>May cause performance issues: Please do not enable unless troubleshooting.'
                    )
                    .replace(
                        '{input-1}',
                        settingsSwitchHTML
                            .replace('{id}', 'DEBUG_LOG')
                            .replace(
                                '{checked}',
                                config.debugLogging ? 'checked' : ''
                            )
                    ),
                settingsItemHTMLv2
                    .replace('{name}', 'Show Multiplayer Commands')
                    .replace(
                        '{description}',
                        'Show bancho multiplayer commands (!mp) in the tournament chat manager.'
                    )
                    .replace(
                        '{input-1}',
                        settingsSwitchHTML
                            .replace('{id}', 'SHOW_MP_COMMANDS')
                            .replace(
                                '{checked}',
                                config.showMpCommands ? 'checked' : ''
                            )
                    ),
                settingsItemHTMLv2
                    .replace('{name}', 'Counters Directory')
                    .replace(
                        '{description}',
                        "Path to the folder containing the tosu counters. (named 'static' by default)"
                    )
                    .replace(
                        '{input-2}',
                        settingsTextInputHTML
                            .replace('{id}', 'STATIC_FOLDER_PATH')
                            .replace('{value}', config.staticFolderPath)
                    )
            ]
                .map((item) => item.replace(/\{[^}]*}/g, ''))
                .join('\n')
        );

    const groups = [generalGroup, dataGroup, serverGroup, advancedGroup]
        .map((item) => item.replace(/\{[^}]*}/g, ''))
        .join('\n');

    const settingsPage = `<div class="settings">${groups} ${settingsSaveButtonHTMLv2}</div>`;

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
                .replace('{{SEARCH}}', '')
                .replace('{{LIST}}', settingsPage);
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
                .replace('{{SEARCH}}', '')
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

export function buildEmptyPage(res: http.ServerResponse) {
    fs.readFile(
        path.join(pkgAssetsPath, 'homepage.html'),
        'utf8',
        (err, content) => {
            if (err) {
                wLogger.debug('buildEmptyPage', 'homepage read', err);
                res.writeHead(404, { 'Content-Type': 'text/html' });

                res.end('<html>page not found</html>');
                return;
            }

            let html = content
                .replace('{{LOCAL_AMOUNT}}', '')
                .replace('{{AVAILABLE_AMOUNT}}', '')
                .replace('{{SEARCH}}', '')
                .replace('{{LIST}}', '');
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
