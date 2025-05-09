import { OsuMods } from '@/utils/osuMods.types';

/**
 * Used to calculate accuracy out of hits
 */
export const calculateAccuracy = ({
    hits,
    mode,
    isRound
}: {
    isRound: boolean;
    hits: {
        300: any;
        100: any;
        50: any;
        0: any;
        geki: any;
        katu: any;
    };
    mode: number;
}) => {
    let acc = 0.0;

    switch (mode) {
        case 0:
            acc =
                (100.0 * (6 * hits[300] + 2 * hits[100] + hits[50])) /
                (6 * (hits[50] + hits[100] + hits[300] + hits[0]));
            break;
        case 1:
            acc =
                (100.0 * (2 * hits[300] + hits[100])) /
                (2 * (hits[300] + hits[100] + hits[0]));
            break;
        case 2:
            acc =
                (100.0 * (hits[300] + hits[100] + hits[50])) /
                (hits[300] + hits[100] + hits[50] + hits.katu + hits[0]);
            break;
        case 3:
            acc =
                (100.0 *
                    (6 * hits.geki +
                        6 * hits[300] +
                        4 * hits.katu +
                        2 * hits[100] +
                        hits[50])) /
                (6 *
                    (hits[50] +
                        hits[100] +
                        hits[300] +
                        hits[0] +
                        hits.geki +
                        hits.katu));
            break;
    }

    if (isRound === true) return parseFloat(acc.toFixed(2));
    return acc;
};

/**
 * Used to calculate grade out of hits
 */
export const calculateGrade = ({
    isLazer,
    hits,
    mods,
    mode
}: {
    isLazer: boolean;
    hits: {
        300: number;
        100: number;
        50: number;
        0: number;
        geki: number;
        katu: number;
    };
    mods: number | string;
    mode: number;
}): string => {
    let silver = false;

    if (typeof mods === 'string') {
        silver = /hd|fl/i.test(mods.toLowerCase());
    }

    if (typeof mods === 'number') {
        silver =
            (mods & OsuMods.Hidden) === OsuMods.Hidden ||
            (mods & OsuMods.Flashlight) === OsuMods.Flashlight;
    }

    const acc = calculateAccuracy({ hits, mode, isRound: false }) / 100;
    let rank = '';

    if (isLazer === true) {
        switch (mode) {
            case 0:
            case 1: {
                if (acc === 1) rank = silver ? 'XH' : 'X';
                else if (acc >= 0.95 && hits[0] === 0)
                    rank = silver ? 'SH' : 'S';
                else if (acc >= 0.9) rank = 'A';
                else if (acc >= 0.8) rank = 'B';
                else if (acc >= 0.7) rank = 'C';
                else rank = 'D';

                break;
            }

            case 2: {
                if (acc === 1) rank = silver ? 'XH' : 'X';
                else if (acc >= 0.98) rank = silver ? 'SH' : 'S';
                else if (acc >= 0.94) rank = 'A';
                else if (acc >= 0.9) rank = 'B';
                else if (acc >= 0.85) rank = 'C';
                else rank = 'D';

                break;
            }

            case 3: {
                if (acc === 1) rank = silver ? 'XH' : 'X';
                else if (acc >= 0.95) rank = silver ? 'SH' : 'S';
                else if (acc >= 0.9) rank = 'A';
                else if (acc >= 0.8) rank = 'B';
                else if (acc >= 0.7) rank = 'C';
                else rank = 'D';

                break;
            }
        }
    } else {
        switch (mode) {
            case 0: {
                const total = hits[300] + hits[100] + hits[50] + hits[0];
                if (total === 0) {
                    rank = silver ? 'XH' : 'X';
                    break;
                }

                let r300 = 0;
                let r50 = 0;

                r300 = hits[300] / total;
                r50 = hits[50] / total;

                if (r300 === 1) {
                    rank = silver ? 'XH' : 'X';
                } else if (r300 > 0.9 && r50 < 0.01 && hits[0] === 0) {
                    rank = silver ? 'SH' : 'S';
                } else if ((r300 > 0.8 && hits[0] === 0) || r300 > 0.9) {
                    rank = 'A';
                } else if ((r300 > 0.7 && hits[0] === 0) || r300 > 0.8) {
                    rank = 'B';
                } else if (r300 > 0.6) {
                    rank = 'C';
                } else {
                    rank = 'D';
                }

                break;
            }

            case 1: {
                const total = hits[300] + hits[100] + hits[50] + hits[0];
                if (total === 0) {
                    rank = silver ? 'XH' : 'X';
                    break;
                }

                let r300 = 0;
                let r50 = 0;

                r300 = hits[300] / total;
                r50 = hits[50] / total;

                if (r300 === 1) {
                    rank = silver ? 'XH' : 'X';
                } else if (r300 > 0.9 && r50 < 0.01 && hits[0] === 0) {
                    rank = silver ? 'SH' : 'S';
                } else if ((r300 > 0.8 && hits[0] === 0) || r300 > 0.9) {
                    rank = 'A';
                } else if ((r300 > 0.7 && hits[0] === 0) || r300 > 0.8) {
                    rank = 'B';
                } else if (r300 > 0.6) {
                    rank = 'C';
                } else {
                    rank = 'D';
                }

                break;
            }

            case 2: {
                if (acc === 1) rank = silver ? 'XH' : 'X';
                else if (acc > 0.98) rank = silver ? 'SH' : 'S';
                else if (acc > 0.94) rank = 'A';
                else if (acc > 0.9) rank = 'B';
                else if (acc > 0.85) rank = 'C';
                else rank = 'D';

                break;
            }

            case 3: {
                if (acc === 1) rank = silver ? 'XH' : 'X';
                else if (acc > 0.95) rank = silver ? 'SH' : 'S';
                else if (acc > 0.9) rank = 'A';
                else if (acc > 0.8) rank = 'B';
                else if (acc > 0.7) rank = 'C';
                else rank = 'D';

                break;
            }
        }
    }

    return rank;
};

/**
 *
 * @param mode gamemode number
 * @param H300 number
 * @param H100 number
 * @param H50 number
 * @param H0 number
 * @param katu number
 * @param geki number
 * @returns Total passed objects
 */
export const calculatePassedObjects = (
    mode: number,
    H300: number,
    H100: number,
    H50: number,
    H0: number,
    katu: number,
    geki: number
): number => {
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
};
