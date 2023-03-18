export const resolvePassedObjects = (mode: number, H300: number, H100: number, H50: number, H0: number, katu: number, geki: number): number => {
	switch (mode) {
        case 0:
            return H300 + H100 + H50 + H0;
        case 1:
            return H300 + H100 + H0;
        case 2:
            return H300 + H100 + H50 + H0 + katu;
        case 3:
            return H300 + H100 + H50 + H0 + katu + geki;
        default:
            return 0;
	}
}