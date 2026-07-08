import { Bitness, ClientType, config, context } from '@tosu/common';
import { createReadStream } from 'node:fs';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import * as readline from 'node:readline/promises';
import { battery, cpu, graphics, osInfo } from 'systeminformation';

import { getLocalCounters } from './counters';

export type ReportSpecs = {
    systemType: 'Desktop' | 'Laptop';
    os: string;
    cpu: string;
    gpus: string[];
};

export type Report = {
    /** Report generation date */
    date: Date;
    /** System information */
    spec: ReportSpecs;
    /** Current tosu configuration */
    config: typeof config;
    /** Current osu! instances */
    instances: {
        pid: number;
        type: keyof typeof ClientType;
        bitness: keyof typeof Bitness;
        version: string;
    }[];
    /** Installed counters */
    counters: {
        /** Counter author */
        author: string;
        /** Counter name */
        name: string;
        /** Counter version */
        version: string;
        /** Counter folder name */
        folderName: string;
    }[];
    /** Log file content */
    logs: [filename: string, LogLine[]][];
};

type LogLine = [timestamp: string, type: string, text: string];

async function specsDetails(): Promise<ReportSpecs> {
    const [batt, os, cpuInfo, gpu] = await Promise.all([
        battery(),
        osInfo(),
        cpu(),
        graphics()
    ]);

    return {
        systemType: batt.hasBattery ? 'Laptop' : 'Desktop',
        os: `${os.platform}-${os.arch}`,
        cpu: cpuInfo.brand,
        gpus: gpu.controllers.map((gpu) => gpu.model)
    };
}

export async function generateReport(instanceManager: any): Promise<Report> {
    const instances = Object.values(instanceManager.osuInstances).map(
        (instance: any) => ({
            pid: instance.pid,
            type: ClientType[instance.client] as keyof typeof ClientType,
            bitness: Bitness[instance.bitness] as keyof typeof Bitness,
            version: instance.getServices(['settings']).settings.client.version
        })
    );
    const counters = getLocalCounters().map((counter) => ({
        author: counter.author,
        name: counter.name,
        version: counter.version,
        folderName: counter.folderName
    }));

    const specs = await specsDetails();

    const logsPath = path.dirname(context.logFilePath);
    const logFiles = await readdir(logsPath);

    const logEntries = (
        await Promise.all(
            logFiles.map(async (fileName) => {
                const filePath = path.join(logsPath, fileName);
                return {
                    path: filePath,
                    mtime: (await stat(filePath)).mtime
                };
            })
        )
    )
        .sort((a, b) => b.mtime.getTime() - a.mtime.getTime())
        .slice(0, 10);

    const logs: [string, LogLine[]][] = await Promise.all(
        logEntries.map(async ({ path, mtime }) => {
            const rl = readline.createInterface({
                input: createReadStream(path),
                crlfDelay: Infinity
            });

            const lines: LogLine[] = [];
            for await (const line of rl) {
                const match = line.match(
                    /^(\d{2}:\d{2}:\d{2}\.\d{3})\s+\[(.+?)\]\s+(.*)$/
                );

                if (match) {
                    let level = match[2];
                    if (level === 'derror') level = 'debugError';

                    lines.push([match[1], level, match[3]]);
                } else {
                    lines.push(['', '', line]);
                }
            }

            return [mtime.toISOString(), lines];
        })
    );

    return {
        date: new Date(),
        spec: specs,
        config,
        instances,
        counters,
        logs
    };
}

const pkgAssetsPath =
    'pkg' in process
        ? path.join(__dirname, 'assets')
        : path.join(__dirname, '../assets');

export async function* generateReportHTML(
    report: Report
): AsyncGenerator<string> {
    const rawHtml = await readFile(
        path.join(pkgAssetsPath, 'report.html'),
        'utf8'
    );

    const [htmlHead, htmlTail] = rawHtml.split('{{LOGS}}');
    yield htmlHead
        .replace('{{TIME}}', report.date.toISOString())
        .replace('{{SYSTEM_TYPE}}', report.spec.systemType)
        .replace('{{SYSTEM_OS}}', report.spec.os)
        .replace('{{SYSTEM_CPU}}', report.spec.cpu)
        .replace('{{SYSTEM_GPUS}}', report.spec.gpus.join(', '))
        .replace(
            '{{TOSU_CONFIG}}',
            Object.entries(report.config)
                .map(
                    ([k, v]) =>
                        `<td class="highlight">${k}</td><td>${v}</td></tr>`
                )
                .join('')
        )
        .replace(
            '{{INSTANCES}}',
            report.instances
                .map(
                    (v, i) =>
                        `<tr><td class="highlight">${i + 1}</td><td>${v.pid}</td><td>${v.type}</td><td>${v.bitness}</td><td>${v.version}</td></tr>`
                )
                .join('')
        )
        .replace(
            '{{COUNTERS}}',
            report.counters
                .map(
                    (v, i) =>
                        `<tr><td class="highlight">${i + 1}</td><td>${v.name}</td><td>${v.version}</td><td>${v.author}</td><td>${v.folderName}</td></tr>`
                )
                .join('')
        );

    const logHtml = `<div class="group logs">
      <h3>{{TITLE}}</h3>
      <div class="group-content">
        <div class="scrollable">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th class="timestamp">Timestamp</th>
                <th class="type">Type</th>
                <th class="message">Message</th>
              </tr>
            </thead>
            {{LOGS}}
          </table>
        </div>
      </div>
    </div>`;

    const [logHtmlHead, logHtmlTail] = logHtml.split('{{LOGS}}');
    for (const [name, log] of report.logs) {
        yield logHtmlHead.replace('{{TITLE}}', name);

        for (const [i, [timestamp, type, text]] of log.entries()) {
            yield `<tr><td class="highlight">${i + 1}</td><td>${timestamp}</td><td class="status-${type}">${type}</td><td>${text}</td></tr>`;
        }

        yield logHtmlTail;
    }

    yield htmlTail;
}
