export abstract class AbstractMemoryReader {
    public readonly processId: number;

    constructor(processId: number) {
        this.processId = processId;
    }

    protected abstract getPath(): string;

    public get path(): string {
        return this.getPath();
    }

    public abstract getProcessCommandLine(): string;

    public abstract readByte(address: number): number;

    public abstract readShort(address: number): number;

    public abstract readInt(address: number): number;

    public abstract readUInt(address: number): number;

    public abstract readPointer(address: number): number;

    public abstract readLong(address: number): number;

    public abstract readFloat(address: number): number;

    public abstract readDouble(address: number): number;

    public abstract readSharpString(address: number): string;

    public readSharpDictionary(address: number): number[] {
        const result: number[] = [];
        const items = this.readInt(address + 0x8);
        const size = this.readInt(address + 0x1c);

        for (let i = 0; i < size; i++) {
            const address = items + 0x8 + 0x10 * i;

            result.push(address);
        }

        return result;
    }

    public abstract readBuffer(address: number, size: number): Buffer;

    public abstract scanSync(
        pattern: string,
        refresh: boolean,
        baseAddress: number
    ): number;

    public abstract scan(
        pattern: string,
        callback: (address: number) => void,
        refresh: boolean,
        baseAddress: number
    ): void;

    public abstract scanAsync(
        pattern: string,
        refresh: boolean,
        baseAddress: number
    ): Promise<number>;
}
