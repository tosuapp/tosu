import { Bitness, ClientType, config } from '@tosu/common';
import { readFile } from 'node:fs/promises';
import { freemem, machine, release, totalmem, type } from 'node:os';
import path from 'node:path';
import { cpu, graphics } from 'systeminformation';

import { getLocalCounters } from './counters';

export type Report = {
    /** System informations */
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

export type ReportSpec = {
    /** Os informations */
    os: {
        /** Operating system name, e.g. "Linux", "Windows_NT", "Darwin" */
        name: string;
        /** Operating system release version, e.g. "5.4.0-42-generic", "10.0.19041" */
        release: string;
        /** Operating system architecture, e.g. "x64", "arm64" */
        arch: string;
    };
    /** CPU informations */
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
};

export type ReportInstance = {
    type: keyof typeof ClientType;
    bitness: keyof typeof Bitness;
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

export async function genReport(instanceManager: any): Promise<Report> {
    return {
        spec: await genReportSpec(),
        config,
        instances: Object.values(instanceManager.osuInstances).map(
            genReportInstance
        ),
        counters: genReportCounters(),
        log: await readFile(config.logFilePath, 'utf8')
    };
}

async function genReportSpec(): Promise<ReportSpec> {
    const cpuInfo = await cpu();
    const gpu = await graphics();

    return {
        os: {
            name: type(),
            release: release(),
            arch: machine()
        },
        cpu: {
            brand: cpuInfo.brand,
            manufacturer: cpuInfo.manufacturer,
            physicalCores: cpuInfo.physicalCores,
            logicalCores: cpuInfo.cores
        },
        gpus: gpu.controllers.map((gpu) => gpu.model),
        totalMemory: totalmem(),
        freeMemory: freemem()
    };
}

function genReportInstance(instance: any): ReportInstance {
    return {
        type: ClientType[instance.client] as keyof typeof ClientType,
        bitness: Bitness[instance.bitness] as keyof typeof Bitness
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
        .replace('{{REPORT_DATE}}', new Date().toLocaleString())
        .replace('{{OS_NAME}}', report.spec.os.name)
        .replace('{{OS_RELEASE}}', report.spec.os.release)
        .replace('{{OS_ARCH}}', report.spec.os.arch)
        .replace('{{CPU_MANUFACTURER}}', report.spec.cpu.manufacturer)
        .replace('{{CPU_BRAND}}', report.spec.cpu.brand)
        .replace(
            '{{CPU_PHYSICAL_CORES}}',
            String(report.spec.cpu.physicalCores)
        )
        .replace('{{CPU_LOGICAL_CORES}}', String(report.spec.cpu.logicalCores))
        .replace('{{GPU_ROWS}}', buildRowTable(report.spec.gpus))
        .replace(
            '{{TOTAL_MEMORY_GIB}}',
            (report.spec.totalMemory / (1024 * 1024 * 1024)).toFixed(2)
        )
        .replace(
            '{{FREE_MEMORY_GIB}}',
            (report.spec.freeMemory / (1024 * 1024 * 1024)).toFixed(2)
        )
        .replace('{{CONFIG_ROWS}}', buildRowTable(report.config))
        .replace(
            '{{INSTANCE_ROWS}}',
            buildRowTable(
                report.instances.map((instance) =>
                    wrapTable(buildRowTable(instance))
                )
            )
        )
        .replace(
            '{{COUNTER_ROWS}}',
            buildRowTable(
                report.counters.map((counters) =>
                    wrapTable(buildRowTable(counters))
                )
            )
        );
}

function buildRowTable(
    values: string[] | Record<string, string | number | boolean>
): string {
    let tableHtml = '';
    for (const key in values) {
        tableHtml += `<tr><th>${key}</th><td>${String(values[key])}</td></tr>`;
    }

    return tableHtml;
}

function wrapTable(value: string): string {
    return `<table>${value}</table>`;
}
