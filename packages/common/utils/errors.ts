export function silentCatch(func: (() => void) | undefined) {
    try {
        if (func == null) return;
        func();
    } catch {
        // todo
    }
}
