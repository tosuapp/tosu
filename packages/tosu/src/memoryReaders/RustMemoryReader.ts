import { MemoryReader as NativeRustMemoryReader } from 'tsprocess-rust/index.ts';
import { ProcessInfo } from 'tsprocess/dist/process';

import { AbstractMemoryReader } from '@/memoryReaders/AbstractMemoryReader';
import { CppMemoryReader } from '@/memoryReaders/CppMemoryReader';

export class RustMemoryReader extends AbstractMemoryReader {
    private native: NativeRustMemoryReader;
    private cppMemoryReader: CppMemoryReader;

    constructor(id: number) {
        super(id);

        this.native = new NativeRustMemoryReader(id);
        this.cppMemoryReader = new CppMemoryReader(id);
    }

    public static findProcesses(imageName: string): number[] {
        return NativeRustMemoryReader.findProcesses(imageName);
    }

    public static isProcessExist(pid: number): boolean {
        return NativeRustMemoryReader.isProcessExists(pid);
    }

    // TODO: implement in rust
    public static disablePowerThrottling() {
        CppMemoryReader.disablePowerThrottling();
    }

    // TODO: implement in rust
    public static getProcesses(): Array<ProcessInfo> {
        return CppMemoryReader.getProcesses();
    }

    protected getPath(): string {
        return NativeRustMemoryReader.getProcessPath(this.processId);
    }

    public getProcessCommandLine(): string {
        return NativeRustMemoryReader.getProcessCommandLine(this.processId);
    }

    public readByte(address: number): number {
        return this.native.readI8(address);
    }

    public readShort(address: number): number {
        return this.native.readI16(address);
    }

    public readInt(address: number): number {
        return this.native.readI32(address);
    }

    public readUInt(address: number): number {
        return this.native.readU32(address);
    }

    public readPointer(address: number): number {
        return this.cppMemoryReader.readInt(
            this.cppMemoryReader.readInt(address)
        );
    }

    public readLong(address: number): number {
        return this.native.readI64(address);
    }

    public readFloat(address: number): number {
        return this.native.readF32(address);
    }

    public readDouble(address: number): number {
        return this.native.readF64(address);
    }

    public readSharpString(address: number): string {
        return this.native.readString(address);
    }

    public readBuffer(address: number, size: number): Buffer {
        const data = this.native.readRaw(address, size);

        return Buffer.from(data);
    }

    // TODO: implement in rust
    scanSync(
        pattern: string,
        refresh: boolean = false,
        baseAddress: number = 0
    ): number {
        return this.cppMemoryReader.scanSync(pattern, refresh, baseAddress);
    }

    // TODO: implement in rust
    scan(
        pattern: string,
        callback: (address: number) => void,
        refresh: boolean = false,
        baseAddress: number = 0
    ): void {
        this.cppMemoryReader.scan(pattern, callback, refresh, baseAddress);
    }

    // TODO: implement in rust
    scanAsync(
        pattern: string,
        refresh: boolean = false,
        baseAddress: number = 0
    ): Promise<number> {
        return this.cppMemoryReader.scanAsync(pattern, refresh, baseAddress);
    }
}
