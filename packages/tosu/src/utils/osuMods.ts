import { textMD5 } from '@tosu/common';

import {
    CalculateMods,
    IMods,
    ModsLazer,
    ModsOrder,
    bitValues
} from '@/utils/osuMods.types';

export const defaultCalculatedMods = {
    checksum: '',
    number: 0,
    name: '',
    array: [],
    rate: 1
} as CalculateMods;

export const modsName = (modsNumber: number, order?: boolean): string => {
    let bit = 1;

    if (order === true) {
        const convertedParts: string[] = [];

        while (bit <= modsNumber && bit <= 1 << 30) {
            if (modsNumber & bit) {
                convertedParts.push(bitValues[Math.log2(bit)]);
            }
            bit <<= 1;

            if (bit === 0) break;
        }

        // 99 - put at the end
        convertedParts.sort(
            (a, b) =>
                (ModsOrder[a.toLowerCase()] || 99) -
                (ModsOrder[b.toLowerCase()] || 99)
        );

        const converted = convertedParts
            .join('')
            .replace('DTNC', 'NC')
            .replace('SDPF', 'PF')
            .replace('ATCN', 'CN');
        return converted;
    }

    let convertedParts = '';
    while (bit <= modsNumber && bit <= 1 << 30) {
        if (modsNumber & bit) {
            convertedParts += bitValues[Math.log2(bit)];
        }
        bit <<= 1;

        if (bit === 0) break;
    }

    return convertedParts
        .replace('DTNC', 'NC')
        .replace('SDPF', 'PF')
        .replace('ATCN', 'CN');
};

/**
 * Get mods short name or mods number by giving one of them
 *
 * &nbsp;
 *
 * ### Parameters
 * - `mods` - Number / Name / Array of { acronym: "EZ" }
 * - `order?` - Transform mods from DTHD to HDDT
 */
export const calculateMods = (
    mods: IMods,
    order?: boolean
): CalculateMods | Error => {
    if (mods == null) {
        return new Error(`Specify mods name (HDDT or 72)`);
    }

    if (mods === '') {
        return Object.assign({}, defaultCalculatedMods);
    }

    let speedChange = 1;
    if (typeof mods === 'number') {
        const name = modsName(mods, order);
        const array =
            name.match(/.{1,2}/g)?.map((r) => ({ acronym: r.toUpperCase() })) ||
            [];

        const DT = array.some((r) => r.acronym === 'DT' || r.acronym === 'NC');
        const HT = array.some((r) => r.acronym === 'HT' || r.acronym === 'DC');

        if (speedChange === 1 && DT) speedChange = 1.5;
        if (speedChange === 1 && HT) speedChange = 0.75;
        return {
            checksum: textMD5(JSON.stringify(array)),
            number: mods,
            name,
            array,
            rate: speedChange
        };
    }

    let modsID = 0;
    const convertedParts: string[] = [];

    let ModsArray: string[] = [];
    if (Array.isArray(mods)) {
        ModsArray = mods.map((r) => r.acronym.toLowerCase());
    } else {
        ModsArray = mods.toLowerCase().match(/.{1,2}/g) || [];
    }

    if (!Array.isArray(ModsArray)) {
        return new Error(`Can't convert mods (${mods}) to array of mods`);
    }

    // SWITCH STATEMENT CREATED ON PURPOSE BECAUSE IT'S WAY FASTER
    for (let i = 0; i < ModsArray.length; i++) {
        const modName = ModsArray[i];
        switch (modName) {
            case 'nf':
                modsID += 1;
                convertedParts.push('NF');
                break;
            case 'ez':
                modsID += 2;
                convertedParts.push('EZ');
                break;
            case 'td':
                modsID += 4;
                convertedParts.push('TD');
                break;
            case 'hd':
                modsID += 8;
                convertedParts.push('HD');
                break;
            case 'hr':
                modsID += 16;
                convertedParts.push('HR');
                break;
            case 'sd':
                modsID += 32;
                convertedParts.push('SD');
                break;
            case 'dt':
                modsID += 64;
                speedChange = 1.5;
                convertedParts.push('DT');
                break;
            case 'rx':
                modsID += 128;
                convertedParts.push('RX');
                break;
            case 'ht':
                modsID += 256;
                speedChange = 0.75;
                convertedParts.push('HT');
                break;
            case 'nc':
                modsID += 576;
                speedChange = 1.5;
                convertedParts.push('NC');
                break;
            case 'fl':
                modsID += 1024;
                convertedParts.push('FL');
                break;
            case 'at':
                modsID += 2048;
                convertedParts.push('AT');
                break;
            case 'so':
                modsID += 4096;
                convertedParts.push('SO');
                break;
            case 'ap':
                modsID += 8192;
                convertedParts.push('AP');
                break;
            case 'pf':
                modsID += 16416;
                convertedParts.push('PF');
                break;
            case '4k':
                modsID += 32768;
                convertedParts.push('4K');
                break;
            case '5k':
                modsID += 65536;
                convertedParts.push('5K');
                break;
            case '6k':
                modsID += 131072;
                convertedParts.push('6K');
                break;
            case '7k':
                modsID += 262144;
                convertedParts.push('7K');
                break;
            case '8k':
                modsID += 524288;
                convertedParts.push('8K');
                break;
            case 'fi':
                modsID += 1048576;
                convertedParts.push('FI');
                break;
            case 'rd':
                modsID += 2097152;
                convertedParts.push('RD');
                break;
            case 'cn':
                modsID += 4194304;
                convertedParts.push('CN');
                break;
            case 'target':
                modsID += 8388608;
                convertedParts.push('TG');
                break;
            case '9k':
                modsID += 16777216;
                convertedParts.push('9K');
                break;
            case 'keycoop':
                modsID += 33554432;
                convertedParts.push('10K');
                break;
            case '1k':
                modsID += 67108864;
                convertedParts.push('1K');
                break;
            case '3k':
                modsID += 134217728;
                convertedParts.push('3K');
                break;
            case '2k':
                modsID += 268435456;
                convertedParts.push('2K');
                break;
            case 'scorev2':
                modsID += 536870912;
                convertedParts.push('v2');
                break;
            case 'mr':
                modsID += 1073741824;
                convertedParts.push('MR');
                break;

            default:
                convertedParts.push(modName.toUpperCase());
                break;
        }
    }

    // 99 - put at the end
    convertedParts.sort(
        (a, b) =>
            (ModsOrder[a.toLowerCase()] || 99) -
            (ModsOrder[b.toLowerCase()] || 99)
    );

    const ModsLazer = Array.isArray(mods)
        ? mods
        : ModsArray.map((r) => ({ acronym: r.toUpperCase() }));

    // Fixing 4.50000003 numbers
    (ModsLazer as any[]).forEach((r, ind) => {
        Object.entries(r.settings || {}).forEach((s) =>
            typeof s[1] === 'number'
                ? ((ModsLazer as any)[ind].settings[s[0]] = parseFloat(
                      s[1].toFixed(2)
                  ))
                : ''
        );

        if (r.settings?.accuracy_judge_mode !== undefined)
            r.settings.accuracy_judge_mode =
                r.settings.accuracy_judge_mode.toString();

        if (r.settings?.reflection !== undefined)
            r.settings.reflection = r.settings.reflection.toString();
    });

    const settingsSpeedChange = (ModsLazer as any).find(
        (r) => typeof r.settings?.speed_change === 'number'
    )?.settings?.speed_change;

    const DT = ModsLazer.some((r) => r.acronym === 'DT' || r.acronym === 'NC');
    const HT = ModsLazer.some((r) => r.acronym === 'HT' || r.acronym === 'DC');

    if (speedChange === 1 && DT) speedChange = 1.5;
    if (speedChange === 1 && HT) speedChange = 0.75;

    return {
        checksum: textMD5(JSON.stringify(ModsLazer)),
        number: modsID,
        name: convertedParts
            .join('')
            .replace('DTNC', 'NC')
            .replace('SDPF', 'PF')
            .replace('ATCN', 'CN'),
        array: ModsLazer,
        rate: settingsSpeedChange || speedChange
    };
};

export function removeDebuffMods(mods: ModsLazer) {
    try {
        const _mods = mods.filter(
            (r) => !(r.acronym === 'RX' || r.acronym === 'AP')
        );
        return _mods;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
        return mods;
    }
}
