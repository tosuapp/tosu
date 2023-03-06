import utils from "."
import fs from "fs"

const loaderBytes = Buffer.from([0x51, 0x57, 0x8B, 0x7C, 0x24, 0x0C, 0x85, 0xFF, 0x75, 0x08, 0x8D, 0x47, 0x01, 0x5F, 0x59, 0xC2, 0x04, 0x00, 0x8B, 0x47, 0x3C, 0x53, 0x03, 0xC7, 0x55, 0x8B, 0xEF, 0x89, 0x44, 0x24, 0x14, 0x56, 0x2B, 0x68, 0x34, 0x74, 0x6F, 0x83, 0xB8, 0xA4, 0x00, 0x00, 0x00, 0x00, 0x75, 0x0D, 0x5E, 0x5D, 0x5B, 0xB8, 0x02, 0x00, 0x00, 0x00, 0x5F, 0x59, 0xC2, 0x04, 0x00, 0x8B, 0x98, 0xA0, 0x00, 0x00, 0x00, 0x03, 0xDF, 0x83, 0x3B, 0x00, 0x74, 0x4C, 0x0F, 0x1F, 0x84, 0x00, 0x00, 0x00, 0x00, 0x00, 0x8B, 0x73, 0x04, 0x8D, 0x43, 0x04, 0x83, 0xEE, 0x08, 0x89, 0x44, 0x24, 0x10, 0xD1, 0xEE, 0x8D, 0x53, 0x08, 0x74, 0x25, 0x0F, 0xB7, 0x02, 0x66, 0x8B, 0xC8, 0x66, 0xC1, 0xE9, 0x0C, 0x80, 0xF9, 0x03, 0x75, 0x0A, 0x25, 0xFF, 0x0F, 0x00, 0x00, 0x03, 0x03, 0x01, 0x2C, 0x38, 0x83, 0xC2, 0x02, 0x83, 0xEE, 0x01, 0x75, 0xDF, 0x8B, 0x44, 0x24, 0x10, 0x03, 0x18, 0x83, 0x3B, 0x00, 0x75, 0xC0, 0x8B, 0x44, 0x24, 0x18, 0x83, 0xB8, 0x84, 0x00, 0x00, 0x00, 0x00, 0x74, 0x7F, 0x8B, 0xA8, 0x80, 0x00, 0x00, 0x00, 0x03, 0xEF, 0x83, 0x7D, 0x0C, 0x00, 0x74, 0x71, 0x0F, 0x1F, 0x44, 0x00, 0x00, 0x8B, 0x4D, 0x0C, 0x8B, 0x07, 0x03, 0xCF, 0x51, 0xFF, 0xD0, 0x89, 0x44, 0x24, 0x10, 0x85, 0xC0, 0x0F, 0x84, 0xB7, 0x00, 0x00, 0x00, 0x8B, 0x55, 0x00, 0x8B, 0x75, 0x10, 0x8D, 0x0C, 0x3A, 0x85, 0xC9, 0x8D, 0x1C, 0x3E, 0x0F, 0x45, 0xF2, 0x03, 0xF7, 0x8B, 0x06, 0x85, 0xC0, 0x74, 0x30, 0x90, 0x8B, 0x4F, 0x08, 0x85, 0xC0, 0x79, 0x05, 0x0F, 0xB7, 0xC0, 0xEB, 0x05, 0x83, 0xC0, 0x02, 0x03, 0xC7, 0x50, 0xFF, 0x74, 0x24, 0x14, 0xFF, 0xD1, 0x89, 0x03, 0x85, 0xC0, 0x0F, 0x84, 0x7B, 0x00, 0x00, 0x00, 0x8B, 0x46, 0x04, 0x83, 0xC6, 0x04, 0x83, 0xC3, 0x04, 0x85, 0xC0, 0x75, 0xD1, 0x83, 0xC5, 0x14, 0x83, 0x7D, 0x0C, 0x00, 0x75, 0x98, 0x8B, 0x44, 0x24, 0x18, 0x83, 0xB8, 0xC4, 0x00, 0x00, 0x00, 0x00, 0x74, 0x20, 0x8B, 0x80, 0xC0, 0x00, 0x00, 0x00, 0x8B, 0x74, 0x38, 0x0C, 0x85, 0xF6, 0x74, 0x12, 0x8B, 0x06, 0x85, 0xC0, 0x74, 0x0C, 0x6A, 0x00, 0x6A, 0x01, 0x57, 0xFF, 0xD0, 0x83, 0xC6, 0x04, 0x75, 0xEE, 0x8B, 0x47, 0x10, 0x6A, 0x40, 0x68, 0x00, 0x30, 0x00, 0x00, 0x68, 0x00, 0x04, 0x00, 0x00, 0x6A, 0x00, 0xFF, 0xD0, 0x8B, 0x4C, 0x24, 0x18, 0x8B, 0xF0, 0x56, 0x6A, 0x01, 0x57, 0x8B, 0x49, 0x28, 0x03, 0xCF, 0xFF, 0xD1, 0x85, 0xC0, 0xB9, 0x04, 0x00, 0x00, 0x00, 0x0F, 0x44, 0xF1, 0x8B, 0xC6, 0x5E, 0x5D, 0x5B, 0x5F, 0x59, 0xC2, 0x04, 0x00, 0x5E, 0x5D, 0x5B, 0xB8, 0x03, 0x00, 0x00, 0x00, 0x5F, 0x59, 0xC2, 0x04, 0x00]);

export class Module {
    base: number;
    name: string;
    private process: Process;
    constructor(process: Process, name: string, module: number) {
        this.process = process;
        this.name = name;
        this.base = module;
    }

    public get(func: string): number {
        return utils.getRemoteProcAddress(this.process.handle, this.base, func);
    }

    public get path(): string {
        return utils.getModulePath(this.process.id, this.name);
    }

    public get signature(): string {
        return utils.getPEPdbGuid(fs.readFileSync(this.path));
    }
}

export interface ProcessInfo {
    id: number;
    exeFile: string;
    parentId: number;
    pcPriClassBase: number;
}

export class Process {
    public id: number;
    public handle: number;
    private loader: number;

    constructor(id: number) {
        this.id = id;
        this.handle = utils.openProcess(this.id);
    }

    static findProcess(imageName: string): number {
        return utils.findProcess(imageName);
    }

    static isProcessExist(pid: number): boolean {
        return utils.isProcessExist(pid);
    }

    kill(): void {
        utils.killProcess(this.handle);
    }

    inject(buffer: Buffer, queueApc: boolean = false, threadHandle: number = 0): number {
        if (!this.loader) {
            this.loader = this.alloc(loaderBytes.length);
            this.writeBytes(this.loader, loaderBytes);
        }

        return utils.injectLibrary(buffer, this.handle, this.loader, queueApc, threadHandle);
    }

    inject2(buffer: Buffer): number {
        return utils.injectLibrary2(buffer, this.handle);
    }

    writeByte(address: number, value: number): void {
        utils.writeByte(this.handle, address, value);
    }

    writeBytes(address: number, value: Buffer): void {
        utils.writeBytes(this.handle, address, value);
    }

    // write int16
    writeShort(address: number, value: number): void {
        this.writeBytes(address, Buffer.from(Buffer.from([value & 0xFF, (value >> 8) & 0xFF]).reverse()));
    }

    writeInt32(address: number, value: number): void {
        this.writeBytes(address, Buffer.from(Buffer.from([value & 0xFF, (value >> 8) & 0xFF, (value >> 16) & 0xFF, (value >> 24) & 0xFF])));
    }

    alloc(size: number): number {
        return utils.alloc(this.handle, size);
    }

    readByte(address: number): number {
        return utils.readByte(this.handle, address);
    }

    readShort(address: number): number {
        return utils.readShort(this.handle, address);
    }

    readInt(address: number): number {
        return utils.readInt(this.handle, address);
    }

    readPointer(address: number): number {
        return this.readInt(this.readInt(address));
    }

    readLong(address: number): number {
        return utils.readLong(this.handle, address);
    }

    readFloat(address: number): number {
        return utils.readFloat(this.handle, address);
    }

    readDouble(address: number): number {
        return utils.readDouble(this.handle, address);
    }

    readString(address: number): string {
        return utils.readString(this.handle, address);
    }

    readSharpString(address: number): string {
        const length = this.readInt(address + 0x4)
        try {
            // TODO: fix memory leak
            const buffer = this.readBuffer(address + 0x8, length * 2)
            const out = buffer.toString("utf16le")
            return out
        } catch (_) {
            return ""
        }
    }

    readBuffer(address: number, size: number): Buffer {
        return utils.readBuffer(this.handle, address, size);
    }

    scanSync(pattern: string, refresh: boolean = false, baseAddress: number = 0): number {
        let buffer = Buffer.from(pattern.split(" ").map(x => x === "??" ? "00" : x).join(""), "hex");

        return utils.scanSync(this.handle, baseAddress, buffer, refresh);
    }

    scan(pattern: string, callback: (address: number) => void, refresh: boolean = false, baseAddress: number = 0): void {
        let buffer = Buffer.from(pattern.split(" ").map(x => x === "??" ? "00" : x).join(""), "hex");

        utils.scan(this.handle, baseAddress, buffer, refresh, callback);
    }

    getModule(moduleName: string): Module {
        return new Module(this, moduleName, utils.getRemoteModuleHandle(this.handle, moduleName));
    }

    getBaseModuleAddress(): number {
        return utils.getMainModuleBaseAddress(this.handle);
    }

    static getProcesses(): Array<ProcessInfo> {
        return utils.getProcesses();
    }
}