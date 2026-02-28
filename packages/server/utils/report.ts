import { Bitness, ClientType, config, context } from '@tosu/common';
import { readFileSync, statSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
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
    logs: Array<[filename: string, LogLine[]]>;
};

type LogLine = [timestamp: string, type: string, text: string];

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
            .map((filePath) => {
                const log = readFileSync(filePath, 'utf8')
                    .split('\n')
                    .slice(0, -1)
                    .map((r) => {
                        const match = r.match(
                            /^(\d{2}:\d{2}:\d{2}\.\d{3})\s+\[(.+?)\]\s+(.*)$/
                        );

                        if (match) {
                            let level = match[2];
                            if (level === 'derror') level = 'debugError';

                            return [match[1], level, match[3]] as LogLine;
                        }

                        return ['', '', r] as LogLine;
                    });
                return [statSync(filePath).mtime.toISOString(), log];
            })
    };
}

const pkgAssetsPath =
    'pkg' in process
        ? path.join(__dirname, 'assets')
        : path.join(__dirname, '../assets');

export async function generateReportHTML(report: Report): Promise<string> {
    const rawHtml = await readFile(
        path.join(pkgAssetsPath, 'report.html'),
        'utf8'
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

    const logs = report.logs.map((r) =>
        logHtml
            .replace('{{TITLE}}', r[0])
            .replace(
                '{{LOGS}}',
                r[1]
                    .map(
                        (v, i) =>
                            `<tr><td class="highlight">${i + 1}</td><td>${v[0]}</td><td class="status-${v[1]}">${v[1]}</td><td>${v[2]}</td></tr>`
                    )
                    .join('')
            )
    );

    return rawHtml
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
        )
        .replace('{{LOGS}}', logs.join(''));
}
