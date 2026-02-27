import { wLogger } from '@tosu/common';
import { existsSync, readFileSync } from 'node:fs';
import { dirname as pathDirname, join as pathJoin } from 'path';

import ProcessUtils from '.';

export interface ProcessInfo {
    id: number;
    exeFile: string;
    parentId: number;
    pcPriClassBase: number;
}

export interface Pattern {
    signature: Buffer;
    mask: Buffer;
    nonZeroMask: boolean;
}

export interface Signature {
    value: string;
    nonZeroMask: boolean;
}

export interface PatternResult {
    address: number;
    index: number;
}

export class Process {
    public id: number;
    public handle: number;
    public bitness: number;

    constructor(id: number, bitness: number) {
        this.id = id;
        this.handle = ProcessUtils.openProcess(this.id);
        this.bitness = bitness;
    }

    static findProcesses(names: string[]): number[] {
        return ProcessUtils.findProcesses(names);
    }

    static isProcessExist(handle: number): boolean {
        return ProcessUtils.isProcessExist(handle);
    }

    static isProcess64bit(pid: number): boolean {
        return ProcessUtils.isProcess64bit(pid);
    }

    static disablePowerThrottling() {
        return ProcessUtils.disablePowerThrottling();
    }

    static getFocusedProcess(): number {
        return ProcessUtils.getForegroundWindowProcess();
    }

    static openProcess(id: number): number {
        return ProcessUtils.openProcess(id);
    }

    static getProcessCommandLine(id: number) {
        const handle = this.openProcess(id);

        const commandLine = ProcessUtils.getProcessCommandLine(handle).trim();

        this.closeHandle(handle);

        return commandLine;
    }

    static closeHandle(handle: number): void {
        return ProcessUtils.closeHandle(handle);
    }

    get path(): string {
        if (process.platform === 'win32') {
            wLogger.info(`Process path resolved using %%win32%% method`);
            return pathDirname(ProcessUtils.getProcessPath(this.handle));
        }

        // If using wine (not symlinked into image)
        if (process.platform === 'linux') {
            const overriddenOsuPath = process.env.TOSU_OSU_PATH || '';
            if (overriddenOsuPath !== '') {
                wLogger.info(
                    `Process path resolved using %%TOSU_OSU_PATH%% environment variable`
                );

                // for other genius, who have their custom wine prefixes
                // with symlinking or other breaking default cwd????
                // tldr should be like: /home/kotrik/.local/share/osu-wine/osu!
                return overriddenOsuPath;
            }

            if (this.getProcessPath().match('wine-preloader')) {
                // bicycle for osu-winnello
                // I swear a god, I will create a delete osu-winnello repo PR
                // if you guys will break this
                const homeEnv = process.env.HOME || '';
                const xdgDataHome = process.env.XDG_DATA_HOME || '';
                const shareFolder =
                    xdgDataHome !== ''
                        ? xdgDataHome
                        : pathJoin(homeEnv, '.local/share');
                const osuWinelloPath = pathJoin(
                    shareFolder,
                    'osuconfig/osupath'
                );

                if (existsSync(osuWinelloPath)) {
                    wLogger.info(
                        `Process path resolved using %%wine-preloader%% (osu-winnello)`
                    );
                    // osu-sinello script installation found
                    return readFileSync(osuWinelloPath, 'utf-8').trim();
                }

                wLogger.info(
                    `Process path resolved using %%CommandLine%% parsing`
                );

                return this.getProcessCommandLine()
                    .slice(2)
                    .replace(/\\/g, '/')
                    .trim()
                    .replace(/\/osu!\.exe$/, ''); // Format windows dir to linux style.
            }
        }

        wLogger.info(`Process path resolved using %%CWD%%`);

        return this.getProcessCwd();
    }

    sizeOfPtr() {
        return this.bitness === 32 ? 4 : 8;
    }

    getProcessCommandLine(): string {
        return ProcessUtils.getProcessCommandLine(this.handle);
    }

    getProcessCwd(): string {
        return ProcessUtils.getProcessCwd(this.handle);
    }

    getProcessPath(): string {
        return ProcessUtils.getProcessPath(this.handle);
    }

    readIntPtr(address: number): number {
        return this.bitness === 64
            ? ProcessUtils.readLong(this.handle, this.bitness, address)
            : ProcessUtils.readInt(this.handle, this.bitness, address);
    }

    readByte(address: number): number {
        return ProcessUtils.readByte(this.handle, this.bitness, address);
    }

    readShort(address: number): number {
        return ProcessUtils.readShort(this.handle, this.bitness, address);
    }

    readInt(address: number): number {
        return ProcessUtils.readInt(this.handle, this.bitness, address);
    }

    readUInt(address: number): number {
        return ProcessUtils.readUInt(this.handle, this.bitness, address);
    }

    readPointer(address: number): number {
        return this.readIntPtr(this.readIntPtr(address));
    }

    readLong(address: number): number {
        return ProcessUtils.readLong(this.handle, this.bitness, address);
    }

    readFloat(address: number): number {
        return ProcessUtils.readFloat(this.handle, this.bitness, address);
    }

    readDouble(address: number): number {
        return ProcessUtils.readDouble(this.handle, this.bitness, address);
    }

    readSharpString(address: number): string {
        return ProcessUtils.readCSharpString(
            this.handle,
            this.bitness,
            address
        );
    }

    readSharpStringPtr(address: number): string {
        const addr = this.readIntPtr(address);

        if (!addr) {
            return '';
        }

        return ProcessUtils.readCSharpString(this.handle, this.bitness, addr);
    }

    readSharpDictionary(address: number): number[] {
        const result = [];
        const items = this.readInt(address + 0x8);
        const size = this.readInt(address + 0x1c);

        for (let i = 0; i < size; i++) {
            const address = items + 0x8 + 0x10 * i;

            result.push(address);
        }

        return result;
    }

    private static buildPattern(pattern: string): Pattern {
        const bytes = pattern.split(' ');

        const signature = Buffer.from(
            bytes.map((x) => (x === '??' ? '00' : x)).join(''),
            'hex'
        );
        const mask = Buffer.from(
            bytes.map((x) => (x === '??' ? '00' : '01')).join(''),
            'hex'
        );

        return { signature, mask, nonZeroMask: false };
    }

    readBuffer(address: number, size: number): Buffer {
        return ProcessUtils.readBuffer(
            this.handle,
            this.bitness,
            address,
            size
        );
    }

    scanSync(pattern: string, nonZeroMask: boolean = false): number {
        const result = Process.buildPattern(pattern);

        return ProcessUtils.scanSync(
            this.handle,
            result.signature,
            result.mask,
            nonZeroMask
        );
    }

    scan(
        pattern: string,
        callback: (address: number) => void,
        nonZeroMask: boolean = false
    ): void {
        const result = Process.buildPattern(pattern);

        ProcessUtils.scan(
            this.handle,
            result.signature,
            result.mask,
            callback,
            nonZeroMask
        );
    }

    scanAsync(pattern: string, nonZeroMask: boolean = false): Promise<number> {
        const result = Process.buildPattern(pattern);

        return new Promise((resolve, reject) => {
            try {
                ProcessUtils.scan(
                    this.handle,
                    result.signature,
                    result.mask,
                    resolve,
                    nonZeroMask
                );
            } catch (e) {
                reject(e);
            }
        });
    }

    scanBatch(signatures: Signature[]): PatternResult[] {
        const patterns: Pattern[] = [];

        for (const signature of signatures) {
            const result = Process.buildPattern(signature.value);

            patterns.push({
                signature: result.signature,
                mask: result.mask,
                nonZeroMask: signature.nonZeroMask
            });
        }

        return ProcessUtils.batchScan(this.handle, patterns);
    }
}
