import { Process } from 'tsprocess';

export interface DictionaryIntToRefEntry {
    key: number;
    address: number;
}

export function readNullableInt(
    process: Process,
    address: number
): number | undefined {
    // if (process.readByte(address + 4) === 0) {
    //     return undefined;
    // }
    // return process.readInt(address);
    if (process.readByte(address) === 0) {
        return undefined;
    }
    return process.readInt(address + 0x4);
}

export function readSharpDictionaryIntToRef(
    process: Process,
    address: number
): DictionaryIntToRefEntry[] {
    const result = [];

    const entriesArray = process.readIntPtr(address + 0x8 + 0x8);

    const entriesLength = process.readInt(entriesArray + 0x8);
    for (let i = 0; i < entriesLength; i++) {
        const entrySize = 24;
        const entry = entriesArray + 0x8 + 0x8 + i * entrySize;

        const hash = process.readInt(entry + 0x8);
        if (hash === 0) continue;

        const entryAddress = process.readIntPtr(entry);
        const entryKey = process.readInt(entry + 0x10);

        result.push({
            key: entryKey,
            address: entryAddress
        });
    }

    return result;
}
