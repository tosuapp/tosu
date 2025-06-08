import crypto from 'crypto';

export function formatMilliseconds(ms: number) {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const milliseconds = ms % 1000;

    const hoursStr = String(hours).padStart(2, '0');
    const minutesStr = String(minutes).padStart(2, '0');
    const secondsStr = String(seconds).padStart(2, '0');

    return `${hoursStr}:${minutesStr}:${secondsStr}.${milliseconds}`;
}

export function textMD5(text: string) {
    return crypto.createHash('md5').update(text).digest('hex');
}

export function isRealNumber(value: any) {
    return typeof value === 'number' && !isNaN(value) && isFinite(value);
}

export function isAllowedValue(
    type: 'bool' | 'byte' | 'int' | 'double' | 'string' | 'bstring' | 'enum',
    value: any
) {
    if (type === 'int' || type === 'enum' || type === 'double')
        return isRealNumber(value);
    else if (type === 'bool') return typeof value === 'boolean';
    else if (type === 'bstring' || type === 'string')
        return typeof value === 'string';

    return false;
}

export function setNestedValue(obj: any, path: string, value: any): boolean {
    const paths = path.split('.');
    if (paths.length === 1) {
        if (typeof obj[paths[0]] === 'object') return false;
        if (obj[paths[0]] === value) return false;

        obj[paths[0]] = value;
        return true;
    }

    return setNestedValue(obj[paths[0]], paths.slice(1).join('.'), value);
}
