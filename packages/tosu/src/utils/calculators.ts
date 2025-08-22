import { Statistics } from '@/states/types';
import { ModsLazer } from '@/utils/osuMods.types';

/**
 * Used to calculate accuracy out of hits
 * credits: https://github.com/maxohn/rosu-pp
 */
export const calculateAccuracy = (params: {
    mods: ModsLazer;
    mode: number;

    statistics: {
        /** geki */
        perfect: number;
        /** h300 */
        great: number;
        /** katu */
        good: number;
        /** h100 */
        ok: number;
        /** h50 */
        meh: number;
        /** h0 */
        miss: number;
    };
}) => {
    const hits = params.statistics;
    let numerator = 0;
    let denominator = 0;

    switch (params.mode) {
        case 0: {
            numerator = 6 * hits.great + 2 * hits.ok + hits.meh;
            denominator = 6 * (hits.great + hits.ok + hits.meh + hits.miss);
            break;
        }

        case 1: {
            const totalHits = hits.great + hits.ok + hits.miss;
            if (totalHits === 0) break;

            numerator = 2 * hits.great + hits.ok;
            denominator = 2 * totalHits;
            break;
        }

        case 2: {
            const totalHits =
                hits.great + hits.ok + hits.meh + hits.good + hits.miss;
            if (totalHits === 0) break;

            numerator = hits.great + hits.ok + hits.meh;
            denominator = totalHits;
            break;
        }

        case 3: {
            const totalHits =
                hits.perfect +
                hits.great +
                hits.good +
                hits.ok +
                hits.meh +
                hits.miss;
            if (totalHits === 0) break;

            const perfectWeight = params.mods.find(
                (mod) => mod.acronym === 'CL'
            )
                ? 60
                : 61;
            numerator =
                perfectWeight * hits.perfect +
                60 * hits.great +
                40 * hits.good +
                20 * hits.ok +
                10 * hits.meh;
            denominator = totalHits;
            break;
        }
    }

    if (denominator === 0) return 0;
    return +((numerator / denominator) * 100).toFixed(2);
};

export const calculateGrade = (params: {
    isLazer: boolean;

    mods: ModsLazer;
    mode: number;
    accuracy: number;

    statistics: Statistics;
}): string => {
    const silver = params.mods.some(
        (mod) => mod.acronym === 'FL' || mod.acronym === 'HD'
    );

    const accuracy = params.accuracy / 100;

    let rank = '';

    if (params.isLazer === true) {
        switch (params.mode) {
            case 0:
            case 1: {
                if (accuracy === 1) rank = silver ? 'XH' : 'X';
                else if (accuracy >= 0.95 && params.statistics.miss === 0)
                    rank = silver ? 'SH' : 'S';
                else if (accuracy >= 0.9) rank = 'A';
                else if (accuracy >= 0.8) rank = 'B';
                else if (accuracy >= 0.7) rank = 'C';
                else rank = 'D';

                break;
            }

            case 2: {
                if (accuracy === 1) rank = silver ? 'XH' : 'X';
                else if (accuracy >= 0.98) rank = silver ? 'SH' : 'S';
                else if (accuracy >= 0.94) rank = 'A';
                else if (accuracy >= 0.9) rank = 'B';
                else if (accuracy >= 0.85) rank = 'C';
                else rank = 'D';

                break;
            }

            case 3: {
                if (accuracy === 1) rank = silver ? 'XH' : 'X';
                else if (accuracy >= 0.95) rank = silver ? 'SH' : 'S';
                else if (accuracy >= 0.9) rank = 'A';
                else if (accuracy >= 0.8) rank = 'B';
                else if (accuracy >= 0.7) rank = 'C';
                else rank = 'D';

                break;
            }
        }
    } else {
        const hits = params.statistics;
        switch (params.mode) {
            case 0: {
                const total = hits.great + hits.ok + hits.meh + hits.miss;
                if (total === 0) {
                    rank = silver ? 'XH' : 'X';
                    break;
                }

                let r300 = 0;
                let r50 = 0;

                r300 = hits.great / total;
                r50 = hits.meh / total;

                if (r300 === 1) {
                    rank = silver ? 'XH' : 'X';
                } else if (r300 > 0.9 && r50 < 0.01 && hits.miss === 0) {
                    rank = silver ? 'SH' : 'S';
                } else if ((r300 > 0.8 && hits.miss === 0) || r300 > 0.9) {
                    rank = 'A';
                } else if ((r300 > 0.7 && hits.miss === 0) || r300 > 0.8) {
                    rank = 'B';
                } else if (r300 > 0.6) {
                    rank = 'C';
                } else {
                    rank = 'D';
                }

                break;
            }

            case 1: {
                const total = hits.great + hits.ok + hits.meh + hits.miss;
                if (total === 0) {
                    rank = silver ? 'XH' : 'X';
                    break;
                }

                let r300 = 0;
                let r50 = 0;

                r300 = hits.great / total;
                r50 = hits.meh / total;

                if (r300 === 1) {
                    rank = silver ? 'XH' : 'X';
                } else if (r300 > 0.9 && r50 < 0.01 && hits.miss === 0) {
                    rank = silver ? 'SH' : 'S';
                } else if ((r300 > 0.8 && hits.miss === 0) || r300 > 0.9) {
                    rank = 'A';
                } else if ((r300 > 0.7 && hits.miss === 0) || r300 > 0.8) {
                    rank = 'B';
                } else if (r300 > 0.6) {
                    rank = 'C';
                } else {
                    rank = 'D';
                }

                break;
            }

            case 2: {
                if (accuracy === 1) rank = silver ? 'XH' : 'X';
                else if (accuracy > 0.98) rank = silver ? 'SH' : 'S';
                else if (accuracy > 0.94) rank = 'A';
                else if (accuracy > 0.9) rank = 'B';
                else if (accuracy > 0.85) rank = 'C';
                else rank = 'D';

                break;
            }

            case 3: {
                if (accuracy === 1) rank = silver ? 'XH' : 'X';
                else if (accuracy > 0.95) rank = silver ? 'SH' : 'S';
                else if (accuracy > 0.9) rank = 'A';
                else if (accuracy > 0.8) rank = 'B';
                else if (accuracy > 0.7) rank = 'C';
                else rank = 'D';

                break;
            }
        }
    }

    return rank;
};

export const calculatePassedObjects = (
    mode: number,
    statistics: Statistics
): number => {
    switch (mode) {
        case 0:
            return (
                statistics.great +
                statistics.ok +
                statistics.meh +
                statistics.miss
            );
        case 1:
            return statistics.great + statistics.ok + statistics.miss;
        case 2:
            return (
                statistics.great +
                statistics.ok +
                statistics.meh +
                statistics.miss +
                statistics.good
            );
        case 3:
            return (
                statistics.great +
                statistics.ok +
                statistics.meh +
                statistics.miss +
                statistics.good +
                statistics.great
            );
        default:
            return 0;
    }
};
