export function silentCatch(
    func: ((...args: any[]) => void) | undefined,
    ...args: any[]
) {
    try {
        if (func == null) return;
        func(...args);
    } catch {
        // todo
    }
}
