import { Bitness, ClientType, config } from '@tosu/common';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { battery, cpu, graphics, mem, osInfo } from 'systeminformation';

import { getLocalCounters } from './counters';

export type ReportInstance = {
    pid: number;
    type: keyof typeof ClientType;
    bitness: keyof typeof Bitness;
    version: string;
};

export type ReportCounter = {
    /** Counter author */
    author: string;
    /** Counter name */
    name: string;
    /** Counter version */
    version: string;
    /** Counter folder name */
    folderName: string;
};

export type ReportSpec = {
    systemType: 'Desktop' | 'Laptop';
    /** Os information */
    os: {
        /** Operating system name, e.g. "Linux", "Windows_NT", "Darwin" */
        name: string;
        /** Operating system release version, e.g. "5.4.0-42-generic", "10.0.19041" */
        release: string;
        /** Operating system architecture, e.g. "x64", "arm64" */
        arch: string;
    };
    /** CPU information */
    cpu: {
        /** CPU manufacturer, e.g. "AMD", "Intel" */
        manufacturer: string;
        /** CPU brand name, e.g. "Ryzen 9 5900X 12-Core Processor" */
        brand: string;
        /** Number of physical CPU cores */
        physicalCores: number;
        /** Number of logical CPU cores */
        logicalCores: number;
    };
    /** GPU model names */
    gpus: string[];

    /** Total memory in bytes */
    totalMemory: number;
    /** Free memory in bytes */
    freeMemory: number;
    /** Potentially available memory in bytes */
    availableMemory: number;
    /** Used memory in bytes */
    usedMemory: number;
};

export type Report = {
    /** Report generation date */
    date: Date;
    /** System information */
    spec: ReportSpec;
    /** Current tosu configuration */
    config: typeof config;
    /** Current osu! instances */
    instances: ReportInstance[];
    /** Installed counters */
    counters: ReportCounter[];
    /** Log file content */
    log: string;
};

async function genReportSpec(): Promise<ReportSpec> {
    const batt = await battery();
    const os = await osInfo();
    const cpuInfo = await cpu();
    const gpu = await graphics();
    const memory = await mem();

    return {
        systemType: batt.hasBattery ? 'Laptop' : 'Desktop',
        os: {
            name: os.platform,
            release: os.release,
            arch: os.arch
        },
        cpu: {
            brand: cpuInfo.brand,
            manufacturer: cpuInfo.manufacturer,
            physicalCores: cpuInfo.physicalCores,
            logicalCores: cpuInfo.cores
        },
        gpus: gpu.controllers.map((gpu) => gpu.model),
        totalMemory: memory.total,
        freeMemory: memory.free,
        usedMemory: memory.used,
        availableMemory: memory.available
    };
}

function genReportInstance(instance: any): ReportInstance {
    return {
        pid: instance.pid,
        type: ClientType[instance.client] as keyof typeof ClientType,
        bitness: Bitness[instance.bitness] as keyof typeof Bitness,
        version: instance.getServices(['settings']).settings.client.version
    };
}

function genReportCounters(): ReportCounter[] {
    return getLocalCounters().map((counter) => ({
        author: counter.author,
        name: counter.name,
        version: counter.version,
        folderName: counter.folderName
    }));
}

export async function genReport(instanceManager: any): Promise<Report> {
    const spec = await genReportSpec();
    const instances = Object.values(instanceManager.osuInstances).map(
        genReportInstance
    );
    const counters = genReportCounters();
    const log = await readFile(config.logFilePath, 'utf8');

    return {
        date: new Date(),
        spec,
        config,
        instances,
        counters,
        log
    };
}

const pkgAssetsPath =
    'pkg' in process
        ? path.join(__dirname, 'assets')
        : path.join(__filename, '../../../assets');

export async function genReportHTML(report: Report): Promise<string> {
    const rawHtml = await readFile(
        path.join(pkgAssetsPath, 'report.html'),
        'utf8'
    );

    return rawHtml
        .replace('{{REPORT_JSON}}', JSON.stringify(report))
        .replace('{{TIME}}', report.date.toISOString())
        .replace('{{SYSTEM_TYPE}}', report.spec.systemType)
        .replace(
            '{{SYSTEM_OS}}',
            [report.spec.os.name, report.spec.os.release, report.spec.os.arch]
                .map((v) => `<td>${v}</td>`)
                .join('')
        )
        .replace(
            '{{SYSTEM_CPU}}',
            [
                report.spec.cpu.manufacturer,
                report.spec.cpu.brand,
                report.spec.cpu.physicalCores,
                report.spec.cpu.logicalCores
            ]
                .map((v) => `<td>${v}</td>`)
                .join('')
        )
        .replace(
            '{{SYSTEM_GPUS}}',
            report.spec.gpus
                .map((gpu) => {
                    const [brand, ...model] = gpu.split(' ');
                    return [brand, model.join(' ')];
                })
                .map(
                    (v, i) =>
                        `<th>${i}</th></th><td>${v[0]}</td><td>${v[1]}</td>`
                )
                .join('')
        )
        .replace(
            '{{SYSTEM_RAM}}',
            [
                report.spec.totalMemory,
                report.spec.usedMemory,
                report.spec.availableMemory
            ]
                .map((n) => n / (1024 * 1024 * 1024))
                .map((v) => `<td>${v.toFixed(2)} GiB</td>`)
                .join('')
        )
        .replace(
            '{{TOSU_CONFIG}}',
            Object.entries(report.config)
                .map(
                    ([k, v], i) =>
                        `<tr><th>${i + 1}</th><td>${k}</td><td>${v}</td></tr>`
                )
                .join('')
        )
        .replace(
            '{{INSTANCES}}',
            report.instances
                .map(
                    (v, i) =>
                        `<tr><th>${i + 1}</th><td>${v.pid}</td><td>${v.type}</td><td>${v.bitness}</td><td>${v.version}</td></tr>`
                )
                .join('')
        )
        .replace(
            '{{COUNTERS}}',
            report.counters
                .map(
                    (v, i) =>
                        `<tr><th>${i + 1}</th><td>${v.name}</td><td>${v.version}</td><td>${v.author}</td><td>${v.folderName}</td></tr>`
                )
                .join('')
        );
}
