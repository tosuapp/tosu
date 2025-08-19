import fs from 'fs';

export function JsonSafeParse(isFile: boolean, str: string, errorReturn: any) {
    try {
        if (isFile) {
            const content = fs.readFileSync(str, 'utf8');
            return JSON.parse(content);
        }

        return JSON.parse(str);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
        return errorReturn;
    }
}
