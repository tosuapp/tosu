import fs from 'fs';

export function JsonSafeParse(params: {
    isFile: boolean;
    payload: string;
    defaultValue: unknown;
}) {
    try {
        if (params.isFile) {
            const content = fs.readFileSync(params.payload, 'utf8');
            return JSON.parse(content);
        }

        return JSON.parse(params.payload);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
        return params.defaultValue;
    }
}
