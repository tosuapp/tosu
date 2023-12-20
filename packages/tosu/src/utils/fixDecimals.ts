/**
 * Simple function to convert 4.123123132131 -> 4.13
 *
 * @param decimalNumber number with big amount of numbers after dot
 * @returns float number with two digits after
 */
export const fixDecimals = (decimalNumber: number) =>
    Math.ceil(decimalNumber * 100) / 100;
