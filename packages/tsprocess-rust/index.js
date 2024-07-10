const {
    MemoryReader: NativeMemoryReader
} = require('./NativeMemoryReader.node');

class MemoryReader {
    #nativeReader;

    constructor(processId) {
        this.nativeReader = new NativeMemoryReader(processId);
    }

    static isProcessExists(processId) {
        return NativeMemoryReader.isProcessExists(processId);
    }

    static findProcesses(processName) {
        return NativeMemoryReader.findProcesses(processName);
    }

    static getProcessPath(processId) {
        return NativeMemoryReader.getProcessPath(processId);
    }

    static getProcessCommandLine(processId) {
        return NativeMemoryReader.getProcessCommandLine(processId);
    }

    findSignature(signature) {
        return this.nativeReader.findSignature(signature);
    }

    readRaw(address, length) {
        return this.nativeReader.readRaw(address, length);
    }

    readPointer(address) {
        return this.nativeReader.readPointer(address);
    }

    readString(address) {
        return this.nativeReader.readString(address);
    }

    readI8(address) {
        return this.nativeReader.read_i8(address);
    }

    readI16(address) {
        return this.nativeReader.read_i16(address);
    }

    readI32(address) {
        return this.nativeReader.read_i32(address);
    }

    readI64(address) {
        return this.nativeReader.read_i64(address);
    }

    readU8(address) {
        return this.nativeReader.read_u8(address);
    }

    readU16(address) {
        return this.nativeReader.read_u16(address);
    }

    readU32(address) {
        return this.nativeReader.read_u32(address);
    }

    readU64(address) {
        return this.nativeReader.read_u64(address);
    }

    readF32(address) {
        return this.nativeReader.read_f32(address);
    }

    readF64(address) {
        return this.nativeReader.read_f64(address);
    }
}

module.exports = { MemoryReader };
