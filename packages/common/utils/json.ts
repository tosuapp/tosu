export const JsonSafeParse = (str: string, errorReturn: any) => {
    try {
        return JSON.parse(str);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
        return errorReturn;
    }
};
