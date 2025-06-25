import { Bitness, ClientType, config } from '@tosu/common';
import { readFile } from 'node:fs/promises';
import { freemem, machine, release, totalmem, type } from 'node:os';
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
