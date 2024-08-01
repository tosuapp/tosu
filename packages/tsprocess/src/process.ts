import ProcessUtils from '.';

export interface ProcessInfo {
    id: number;
    exeFile: string;
    parentId: number;
    pcPriClassBase: number;
}

export class Process {
    public id: number;
    public handle: number;

    constructor(id: number) {
        this.id = id;
        this.handle = ProcessUtils.openProcess(this.id);
    }

    static findProcesses(imageName: string): number[] {
        return ProcessUtils.findProcesses(imageName);
    }

    static isProcessExist(pid: number): boolean {
        return ProcessUtils.isProcessExist(pid);
    }

    static disablePowerThrottling() {
        return ProcessUtils.disablePowerThrottling();
    }

    get path(): string {
        if (process.platform === 'win32') {
            console.log('PATH-win', ProcessUtils.getProcessPath(this.handle));
            return ProcessUtils.getProcessPath(this.handle);
        }

        const commandLine = this.getProcessCommandLine();
        console.log('PATH-linux', commandLine);

        if (commandLine.includes(':')) {
            return commandLine.split(':')[1].replace(/\\/g, '/');
        }
        return commandLine;
    }

    getProcessCommandLine(): string {
        return ProcessUtils.getProcessCommandLine(this.handle);
    }

    readByte(address: number): number {
        return ProcessUtils.readByte(this.handle, address);
    }

    readShort(address: number): number {
        return ProcessUtils.readShort(this.handle, address);
    }

    readInt(address: number): number {
        return ProcessUtils.readInt(this.handle, address);
    }

    readUInt(address: number): number {
        return ProcessUtils.readUInt(this.handle, address);
    }

    readPointer(address: number): number {
        return this.readInt(this.readInt(address));
    }

    readLong(address: number): number {
        return ProcessUtils.readLong(this.handle, address);
    }

    readFloat(address: number): number {
        return ProcessUtils.readFloat(this.handle, address);
    }

    readDouble(address: number): number {
        return ProcessUtils.readDouble(this.handle, address);
    }

    readSharpString(address: number): string {
        return ProcessUtils.readCSharpString(this.handle, address);
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

    readBuffer(address: number, size: number): Buffer {
        return ProcessUtils.readBuffer(this.handle, address, size);
    }

    scanSync(pattern: string): number {
        const bytes = pattern.split(' ');
        const signature = Buffer.from(
            bytes.map((x) => (x === '??' ? '00' : x)).join(''),
            'hex'
        );
        const mask = Buffer.from(
            bytes.map((x) => (x === '??' ? '00' : '01')).join(''),
            'hex'
        );

        return ProcessUtils.scanSync(this.handle, signature, mask);
    }

    scan(pattern: string, callback: (address: number) => void): void {
        const bytes = pattern.split(' ');
        const signature = Buffer.from(
            bytes.map((x) => (x === '??' ? '00' : x)).join(''),
            'hex'
        );
        const mask = Buffer.from(
            bytes.map((x) => (x === '??' ? '00' : '01')).join(''),
            'hex'
        );

        ProcessUtils.scan(this.handle, signature, mask, callback);
    }

    scanAsync(pattern: string): Promise<number> {
        const bytes = pattern.split(' ');
        const signature = Buffer.from(
            bytes.map((x) => (x === '??' ? '00' : x)).join(''),
            'hex'
        );
        const mask = Buffer.from(
            bytes.map((x) => (x === '??' ? '00' : '01')).join(''),
            'hex'
        );
        return new Promise((resolve, reject) => {
            try {
                ProcessUtils.scan(this.handle, signature, mask, resolve);
            } catch (e) {
                reject(e);
            }
        });
    }
}
