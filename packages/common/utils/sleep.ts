export const sleep = (ms: number) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
};

export function debounce(
    callback: (...args: any[]) => void,
    ms: number
): (...args: any[]) => void {
    const timeout: { value: NodeJS.Timeout | null } = { value: null };

    const debounce = (...args: any[]) => {
        if (timeout.value) clearTimeout(timeout.value);
        timeout.value = setTimeout(callback, ms, ...args);
    };

    return debounce;
}
