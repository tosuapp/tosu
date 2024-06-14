import { Process, ProcessInfo } from 'tsprocess/dist/process';

import { AbstractMemoryReader } from '@/memoryReaders/AbstractMemoryReader';

export class CppMemoryReader extends AbstractMemoryReader {
    private native: Process;

    constructor(id: number) {
        super(id);

        this.native = new Process(id);
    }

    static findProcesses(imageName: string): number[] {
        return Process.findProcesses(imageName);
    }

    static isProcessExist(pid: number): boolean {
        return Process.isProcessExist(pid);
    }

    static disablePowerThrottling() {
        Process.disablePowerThrottling();
    }

    static getProcesses(): Array<ProcessInfo> {
        return Process.getProcesses();
    }

    protected getPath(): string {
        return this.native.path;
    }

    getProcessCommandLine(): string {
        return this.native.getProcessCommandLine();
    }

    readByte(address: number): number {
        // console.log(address, 'address');
        return this.native.readByte(address);
    }

    readShort(address: number): number {
        return this.native.readShort(address);
    }

    readInt(address: number): number {
        return this.native.readInt(address);
    }

    readUInt(address: number): number {
        return this.native.readUInt(address);
    }

    readPointer(address: number): number {
        return this.readInt(this.readInt(address));
    }

    readLong(address: number): number {
        return this.native.readLong(address);
    }

    readFloat(address: number): number {
        return this.native.readFloat(address);
    }

    readDouble(address: number): number {
        return this.native.readDouble(address);
    }

    readSharpString(address: number): string {
        return this.native.readSharpString(address);
    }

    readBuffer(address: number, size: number): Buffer {
        return this.native.readBuffer(address, size);
    }

    scanSync(
        pattern: string,
        refresh: boolean = false,
        baseAddress: number = 0
    ): number {
        return this.native.scanSync(pattern, refresh, baseAddress);
    }

    scan(
        pattern: string,
        callback: (address: number) => void,
        refresh: boolean = false,
        baseAddress: number = 0
    ): void {
        this.native.scan(pattern, callback, refresh, baseAddress);
    }

    scanAsync(
        pattern: string,
        refresh: boolean = false,
        baseAddress: number = 0
    ): Promise<number> {
        return this.native.scanAsync(pattern, refresh, baseAddress);
    }
}
