/**
 * Simple function to convert 4.123123132131 -> 4.13
 *
 * @param decimalNumber number with big amount of numbers after dot
 * @returns float number with two digits after
 */
export const fixDecimals = (decimalNumber: number) =>
    parseFloat(decimalNumber.toFixed(2));

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
    const ticksMask = 0x3fffffff;

    dateDataHi &= ticksMask;

    const dateData = (BigInt(dateDataHi) << 32n) | BigInt(dateDataLo);

    const ticksPerMillisecond = 10000n;
    const epochTicks = 621355968000000000n;
    const milliseconds = (dateData - epochTicks) / ticksPerMillisecond;

    return addTimezoneOffset(new Date(Number(milliseconds)));
};

function addTimezoneOffset(date: Date) {
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000);
}
