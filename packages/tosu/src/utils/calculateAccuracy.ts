export const calculateAccuracy = (
    mode: number,
    h300: number,
    h100: number,
    h50: number,
    h0: number,
    hKatu: number,
    hGeki: number
): number => {
    let totalHits: number;

    if (mode === 0) {
        totalHits = h300 + h100 + h50 + h0;

        return totalHits > 0
            ? (h50 * 50 + h100 * 100 + h300 * 300) / (totalHits * 300)
            : 0;
    } else if (mode === 1) {
        totalHits = h300 + h100 + h50 + h0;

        return totalHits > 0
            ? (h100 * 150 + h300 * 300) / (totalHits * 300)
            : 1;
    } else if (mode === 2) {
        totalHits = h300 + h100 + h50 + h0 + hKatu;

        return totalHits > 0 ? (h50 + h100 + h300) / totalHits : 1;
    } else if (mode === 3) {
        totalHits = h300 + h100 + h50 + h0 + hKatu + hGeki;

        return totalHits > 0
            ? (h50 * 50 + h100 * 100 + hKatu * 200 + (h300 + hGeki) * 300) /
                  (totalHits * 300)
            : 1;
    }

    return 0;
};
