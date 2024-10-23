import { dirname as pathDirname } from 'path';

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
}

export interface PatternResult {
    address: number;
    index: number;
}

export class Process {
    public id: number;
    public handle: number;
    public bitness: number;

    constructor(id: number, bitness: number = 32) {
        this.id = id;
        this.handle = ProcessUtils.openProcess(this.id);
        this.bitness = bitness;
    }

    static findProcesses(imageName: string): number[] {
        return ProcessUtils.findProcesses(imageName);
    }

    static isProcessExist(pid: number): boolean {
        return ProcessUtils.isProcessExist(pid);
    }

    static isProcess64bit(pid: number): boolean {
        return ProcessUtils.isProcess64bit(pid);
    }

    static disablePowerThrottling() {
        return ProcessUtils.disablePowerThrottling();
    }

    get path(): string {
        if (process.platform === 'win32') {
            return pathDirname(ProcessUtils.getProcessPath(this.handle));
        }

        // If using osu-winello
        if (
            process.platform === 'linux' &&
            this.getProcessPath().match('wine-preloader')
        ) {
            return this.getProcessCommandLine()
                .slice(2)
                .replace(/\\/g, '/')
                .replace(/\/osu!.exe$/, ''); // Format windows dir to linux style.
        }

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

        return { signature, mask };
    }

    readBuffer(address: number, size: number): Buffer {
        return ProcessUtils.readBuffer(this.handle, address, size);
    }

    scanSync(pattern: string): number {
        const result = Process.buildPattern(pattern);

        return ProcessUtils.scanSync(
            this.handle,
            result.signature,
            result.mask
        );
    }

    scan(pattern: string, callback: (address: number) => void): void {
        const result = Process.buildPattern(pattern);

        ProcessUtils.scan(this.handle, result.signature, result.mask, callback);
    }

    scanAsync(pattern: string): Promise<number> {
        const result = Process.buildPattern(pattern);

        return new Promise((resolve, reject) => {
            try {
                ProcessUtils.scan(
                    this.handle,
                    result.signature,
                    result.mask,
                    resolve
                );
            } catch (e) {
                reject(e);
            }
        });
    }

    scanBatch(signatures: string[]): PatternResult[] {
        const patterns: Pattern[] = [];

        for (const signature of signatures) {
            const result = Process.buildPattern(signature);

            patterns.push({
                signature: result.signature,
                mask: result.mask
            });
        }

        return ProcessUtils.batchScan(this.handle, patterns);
    }
}
