export const JsonSaveParse = (str: string, errorReturn: any) => {
    try {
        return JSON.parse(str);
    } catch (e) {
        return errorReturn;
    }
};
