import { Bitness, ClientType, config, context } from '@tosu/common';
import { createReadStream, statSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
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
    /** Log files to include (read lazily while streaming the report) */
    logs: { title: string; path: string }[];
};

async function specsDetails(): Promise<ReportSpecs> {
    const batt = await battery();
    const os = await osInfo();
    const cpuInfo = await cpu();
    const gpu = await graphics();

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
    const logs = await readdir(logsPath);

    return {
        date: new Date(),
        spec: specs,
        config,
        instances,
        counters,
        logs: logs
            .map((fileName) => path.join(logsPath, fileName))
            .toSorted((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)
            .slice(0, 10)
            .map((filePath) => ({
                title: statSync(filePath).mtime.toISOString(),
                path: filePath
            }))
    };
}

const pkgAssetsPath =
    'pkg' in process
        ? path.join(__dirname, 'assets')
        : path.join(__dirname, '../assets');

const LOG_GROUP_TEMPLATE = `<div class="group logs">
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

const LOG_OUTPUT_BUDGET = 50 * 1024 * 1024;

export async function* generateReportHTML(
    report: Report
): AsyncGenerator<string> {
    const rawHtml = await readFile(
        path.join(pkgAssetsPath, 'report.html'),
        'utf8'
    );

    const [pageHead, pageTail] = rawHtml.split('{{LOGS}}');

    yield pageHead
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

    const [logGroupHead, logGroupTail] = LOG_GROUP_TEMPLATE.split('{{LOGS}}');

    let sent = 0;
    let truncated = false;

    for (const file of report.logs) {
        yield logGroupHead.replace('{{TITLE}}', file.title);

        const stream = createReadStream(file.path, 'utf8');
        const rl = createInterface({ input: stream, crlfDelay: Infinity });
        let i = 0;

        try {
            for await (const line of rl) {
                const match = line.match(
                    /^(\d{2}:\d{2}:\d{2}\.\d{3})\s+\[(.+?)\]\s+(.*)$/
                );

                let timestamp = '';
                let level = '';
                let text = line;
                if (match) {
                    timestamp = match[1];
                    level = match[2] === 'derror' ? 'debugError' : match[2];
                    text = match[3];
                }

                const row = `<tr><td class="highlight">${i + 1}</td><td>${timestamp}</td><td class="status-${level}">${level}</td><td>${text}</td></tr>`;
                i++;

                sent += Buffer.byteLength(row, 'utf8');
                if (sent > LOG_OUTPUT_BUDGET) {
                    truncated = true;
                    yield `<tr><td class="highlight">…</td><td></td><td class="status-warn">warn</td><td>Log output truncated: report exceeded the ${LOG_OUTPUT_BUDGET / 1024 / 1024} MB budget.</td></tr>`;
                    break;
                }

                yield row;
            }
        } finally {
            rl.close();
            stream.destroy();
        }

        yield logGroupTail;

        if (truncated) break;
    }

    if (truncated) {
        yield `<style>#truncation-banner { display: flex; }</style>`;
    }

    yield pageTail;
}
