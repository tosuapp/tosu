import { Bitness, ClientType, config } from '@tosu/common';
import { readFile } from 'node:fs/promises';
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
    logs: string[][];
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
    const log = await readFile(config.logFilePath, 'utf8');

    return {
        date: new Date(),
        spec: specs,
        config,
        instances,
        counters,
        logs: log
            .split('\n')
            .slice(0, -1)
            .map((r) => {
                const parse = r.split(
                    /info|debugError|debug|time|error|warn/gm
                );
                return [
                    parse[0] || '',
                    r.match(/info|debugError|debug|time|error|warn/gm)?.[0] ||
                        '',
                    parse[1] || ''
                ];
            })
    };
}

const pkgAssetsPath =
    'pkg' in process
        ? path.join(__dirname, 'assets')
        : path.join(__filename, '../../../assets');

export async function generateReportHTML(report: Report): Promise<string> {
    const rawHtml = await readFile(
        path.join(pkgAssetsPath, 'report.html'),
        'utf8'
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
        .replace(
            '{{LOGS}}',
            report.logs
                .map(
                    (v, i) =>
                        `<tr><td class="highlight">${i + 1}</td><td>${v[0]}</td><td class="status-${v[1]}">${v[1]}</td><td>${v[2]}</td></tr>`
                )
                .join('')
        );
}
