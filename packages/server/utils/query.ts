export function parseQueryInt(
    value: string | undefined | null,
    minimumValue: number,
    fallbackValue: number
): number {
    if (value === undefined || value === null || value.trim() === '')
        return fallbackValue;
    const num = Number(value);
    if (!Number.isFinite(num)) return fallbackValue;
    return Math.max(minimumValue, Math.trunc(num));
}
