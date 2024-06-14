import { MemoryReader as NativeMemoryReader } from './native/index.node';

export class MemoryReader {
    private nativeReader: NativeMemoryReader;

    constructor(processId: number) {
        this.nativeReader = new NativeMemoryReader(processId);
    }

    public static isProcessExists(processId: number): boolean {
        return NativeMemoryReader.isProcessExists(processId);
    }

    public static findProcesses(processName: string): number[] {
        return NativeMemoryReader.findProcesses(processName);
    }

    public static getProcessPath(processId: number): string {
        return NativeMemoryReader.getProcessPath(processId);
    }

    public static getProcessCommandLine(processId: number): string {
        return NativeMemoryReader.getProcessCommandLine(processId);
    }

    public findSignature(signature: string): number {
        return this.nativeReader.findSignature(signature);
    }

    public readRaw(address: number, length: number): number[] {
        return this.nativeReader.readRaw(address, length);
    }

    public readPointer(address: number): number {
        return this.nativeReader.readPointer(address);
    }

    public readString(address: number): string {
        return this.nativeReader.readString(address);
    }

    public readI8(address: number): number {
        return this.nativeReader.read_i8(address);
    }

    public readI16(address: number): number {
        return this.nativeReader.read_i16(address);
    }

    public readI32(address: number): number {
        return this.nativeReader.read_i32(address);
    }

    public readI64(address: number): number {
        return this.nativeReader.read_i64(address);
    }

    public readU8(address: number): number {
        return this.nativeReader.read_u8(address);
    }

    public readU16(address: number): number {
        return this.nativeReader.read_u16(address);
    }

    public readU32(address: number): number {
        return this.nativeReader.read_u32(address);
    }

    public readU64(address: number): number {
        return this.nativeReader.read_u64(address);
    }

    public readF32(address: number): number {
        return this.nativeReader.read_f32(address);
    }

    public readF64(address: number): number {
        return this.nativeReader.read_f64(address);
    }
}
