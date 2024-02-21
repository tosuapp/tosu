import { config, recursiveFilesSearch } from '@tosu/common';
import fs from 'fs';
import http from 'http';
import path from 'path';

import { getContentType } from '../utils';

const icons_images = {
    'github.com':
        'https://img.shields.io/badge/github-000000?style=for-the-badge&logo=github&logoColor=white',
    'twitter.com':
        'https://img.shields.io/badge/twitter-1DA1F2?style=for-the-badge&logo=twitter&logoColor=white',
    'discord.gg':
        'https://img.shields.io/badge/discord-5865f2?style=for-the-badge&logo=discord&logoColor=white',
    'discord.com':
        'https://img.shields.io/badge/discord-5865f2?style=for-the-badge&logo=discord&logoColor=white',
    download:
        'https://img.shields.io/badge/Download_PP_Counter-67A564?style=for-the-badge&logo=cloud&logoColor=white'
};

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

function rebuildJSON(
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
    }[],
    external?: boolean
) {
    let items = '';
    for (let i = 0; i < array.length; i++) {
        const item = array[i];

        const name = `<h4>${item.name}</h4>`;
        const author = `<span>by <a>${item.author}</a></span>`;

        const links = item.authorlinks
            .map((r) => {
                const domain =
                    /:\/\/(?<domain>\S+)\//.exec(r)?.groups?.domain || '';
                if (!domain) return null;

                const icon_url = icons_images[domain.toLowerCase()];
                if (!icon_url) return null;

                return `<a href="${r}" target="_blank"><img src="${icon_url}" /></a>`;
            })
            .filter((r) => r != null)
            .join(' ');

        const iframe = `<iframe src="http://${config.serverIP}:${config.serverPort}/${item.name} by ${item.author}/" width="${item.resolution[0]}px" height="${item.resolution[1]}px" scrolling="no" frameborder="0"></iframe>`;

        const url = `<div>URL: <span nf nft="url" nfv="http://${config.serverIP}:${config.serverPort}/${item.name} by ${item.author}/" class="copyable">/${item.name} by ${item.author}/</span></div>`;

        const resolution = `<div>Resolution: <span nf nft="width" nfv="${item.resolution[0]}" class="copyable">${item.resolution[0]}</span> x <span nf nft="height" nfv="${item.resolution[1]}" class="copyable">${item.resolution[1]}</span></div>`;

        const button = item.downloadLink
            ? `<div class="indent-left"><button class="button dl-button flexer" l="${item.downloadLink}" n="${item.name}" a="${item.author}"><span>Download</span></button></div>`
            : `<div class="indent-left"><button class="button delete-button flexer" n="${item.name}" a="${item.author}"><span>Delete</span></button></div>`;

        const assets = (item.assets || [])
            .map((r) => {
                return `<img src="${r.url}" />`;
            })
            .filter((r) => r != null)
            .join(' ');

        const gallery = item.assets ? assets : iframe;

        const footer =
            external != true
                ? `<div class="ri-footer flexer">${url}${resolution}</div>`
                : '';

        items += `<div class="result-item">
        <div class="ri-head flexer">
          <div>
            ${name}
            <div class="ri-links flexer">${author}${links}</div>
          </div>
          ${button}
        </div>
        <hr>
        <div class="ri-gallery flexer" style="--width: ${item.resolution[0]}px">${gallery}</div>
        ${footer}
      </div>`;
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

export function buildLocalCounters(res: http.ServerResponse) {
    const array = getLocalCounters();
    const build = rebuildJSON(array);

    const emptryNotice = `<div class="no-results">
  No counters<br /><a href="/?tab=1">Go here to get one 👉</a>
  </div>`;

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

export async function buildExternalCounters(res: http.ServerResponse) {
    const request = await fetch(
        `https://raw.githubusercontent.com/cyperdark/osu-counters/master/.github/api.json`
    );
    const json: any = await request.json();

    const exists = getLocalCounters();
    const array = json.filter(
        (r) => !exists.find((s) => s.name == r.name && s.author == r.author)
    );

    fs.readFile(
        'F:/coding/wip/tosu/packages/server/assets/homepage.html',
        'utf8',
        (err, content) => {
            const html = content.replace('{{LIST}}', rebuildJSON(array, true));

            res.writeHead(200, {
                'Content-Type': getContentType('file.html')
            });
            res.end(html);
        }
    );
}
