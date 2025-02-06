import { join } from 'path';

const DOUBLE_POWERS_10 = [
    1, 1e1, 1e2, 1e3, 1e4, 1e5, 1e6, 1e7, 1e8, 1e9, 1e10, 1e11, 1e12, 1e13,
    1e14, 1e15, 1e16, 1e17, 1e18, 1e19, 1e20, 1e21, 1e22, 1e23, 1e24, 1e25,
    1e26, 1e27, 1e28, 1e29, 1e30, 1e31, 1e32, 1e33, 1e34, 1e35, 1e36, 1e37,
    1e38, 1e39, 1e40, 1e41, 1e42, 1e43, 1e44, 1e45, 1e46, 1e47, 1e48, 1e49,
    1e50, 1e51, 1e52, 1e53, 1e54, 1e55, 1e56, 1e57, 1e58, 1e59, 1e60, 1e61,
    1e62, 1e63, 1e64, 1e65, 1e66, 1e67, 1e68, 1e69, 1e70, 1e71, 1e72, 1e73,
    1e74, 1e75, 1e76, 1e77, 1e78, 1e79, 1e80
];

/**
 * Simple function to convert 4.123123132131 -> 4.13
 *
 * @param decimalNumber number with big amount of numbers after dot
 * @returns float number with two digits after
 */
export const fixDecimals = (decimalNumber: number) =>
    parseFloat((decimalNumber || 0).toFixed(2));

/**
 * Converts raw .NET's dateData to Date object
 *
 *  @param {number} dateDataHi Raw .NET internal ticks high-order number
 *  @param {number} dateDataLo Raw .NET internal ticks low-order number
 *  @returns {Date} Local timezone Date
 */
export const netDateBinaryToDate = (
    dateDataHi: number,
    dateDataLo: number
): Date => {
    const buffer = Buffer.alloc(8);

    const ticksMask = 0x3fffffff;

    dateDataHi &= ticksMask;

    buffer.writeInt32LE(dateDataLo);
    buffer.writeInt32LE(dateDataHi, 4);

    const dateData = buffer.readBigInt64LE();

    const ticksPerMillisecond = 10000n;
    const epochTicks = 621355968000000000n;
    const milliseconds = (dateData - epochTicks) / ticksPerMillisecond;

    return new Date(Number(milliseconds));
};

/**
 * Converts .NET's decimal to Number
 *
 *  @param {number} lo64 64-bit low-order number of decimal
 *  @param {number} hi32 32-bit high-order number of decimal
 *  @param {number} flags Flags indicating scale and sign of decimal
 *  @returns {number} double-precision number
 */
export const numberFromDecimal = (
    lo64: number,
    hi32: number,
    flags: number
): number => {
    if (lo64 === 0 && hi32 === 0 && flags === 0) {
        return 0;
    }

    const isNegative = (flags >> 24) & 0xff;
    const scale = (flags >> 16) & 0xff;

    const ds2to64 = 1.8446744073709552e19;

    let value = (lo64 + hi32 * ds2to64) / DOUBLE_POWERS_10[scale];

    if (isNegative) {
        value = -value;
    }

    return value;
};

/**
 * Joins multiple paths, sanitizing each parameter (like invalid windows characters, trailing spaces, etc.) before joining.
 *
 * @param {...string[]} paths Paths to sanitize and join.
 * @returns {string} The joined & sanitized path.
 */
export const cleanPath = (...paths: string[]): string => {
    paths.map((p) => {
        // Ensure UTF-8 encoding and trim whitespace
        let cleaned = Buffer.from(p.trim(), 'utf-8').toString('utf-8');

        // Replace invalid OS-specific characters
        cleaned = cleaned.replace(
            process.platform === 'win32' ? /[<>:"/\\|?*]/g : /\//g,
            ''
        );

        // On Windows, trim trailing dots and spaces
        if (process.platform === 'win32')
            cleaned = cleaned.replace(/[ .]+$/, '');

        return cleaned;
    });

    return join(...paths);
};
