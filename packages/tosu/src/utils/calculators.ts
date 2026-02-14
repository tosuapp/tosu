import { CalculateMods, Mod, ModsLazer, Rulesets } from '@tosu/common';
import { HitObject } from 'osu-classes';

import { Statistics } from '@/states/types';

/**
 * Used to calculate accuracy out of hits
 * credits: https://github.com/maxohn/rosu-pp
 */
export const calculateAccuracy = (params: {
    isLazer: boolean;

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

            const perfectWeight =
                params.isLazer ||
                params.mods.some((mod) => mod.acronym === 'V2')
                    ? 61
                    : 60;
            numerator =
                perfectWeight * hits.perfect +
                60 * hits.great +
                40 * hits.good +
                20 * hits.ok +
                10 * hits.meh;
            denominator = totalHits * perfectWeight;
            break;
        }
    }

    if (denominator === 0) return 0;
    return (numerator / denominator) * 100;
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
    hitObjects: HitObject[],
    currentTime: number,
    previousIndex: number
): number => {
    let value = -1;
    for (let i = previousIndex; i < hitObjects.length; i++) {
        const item = hitObjects[i];
        if (item.startTime > currentTime) break;
        value = i;
    }

    return value;
};

export const calculateBeatmapAttributes = (params: {
    isConvert: boolean;

    ar: number;
    cs: number;
    od: number;
    hp: number;

    mode: number;
    mods: CalculateMods;
}) => {
    const isEz = params.mods.array.some((r) => r.acronym === 'EZ');
    const isHr = params.mods.array.some((r) => r.acronym === 'HR');
    const DA = (params.mods.array as Mod[]).find((r) => r.acronym === 'DA');
    const multiply = isHr ? 1.4 : isEz ? 0.5 : 1;

    const AR = DA?.settings?.approach_rate ?? params.ar;
    const CS = DA?.settings?.circle_size ?? params.cs;
    const OD = DA?.settings?.overall_difficulty ?? params.od;
    const HP = DA?.settings?.drain_rate ?? params.hp;

    let arConverted = isHr ? Math.min(AR * multiply, 10) : AR * multiply;
    let odConverted = isHr ? Math.min(OD * multiply, 10) : OD * multiply;
    const csConverted = isHr ? Math.min(CS * 1.3, 10) : CS * multiply;
    const hpConverted = isHr ? Math.min(HP * multiply, 10) : HP * multiply;

    if (params.mods.rate !== 1) {
        arConverted =
            arConverted <= 5
                ? 15 - (15 - arConverted) / (1 * params.mods.rate)
                : 13 - (13 - arConverted) / (1 * params.mods.rate);

        switch (params.mode) {
            case Rulesets.osu:
                odConverted =
                    13.33 - (13.33 - odConverted) / (1 * params.mods.rate);
                break;

            case Rulesets.taiko:
                odConverted =
                    16.66666666666667 -
                    (16.66666666666667 - odConverted) / (1 * params.mods.rate);
                break;

            case Rulesets.mania: {
                // if (commonParams.lazer === true || (commonParams.lazer === false && isV2))
                //     odMs = _OD <= 5 ? 22.4 - 0.6 * _OD : 24.9 - 1.1 * _OD;

                // else if (this.mode !== currentMode)
                //     odMs = 16;

                // else
                //     odMs = 16;
                // odMs = Math.floor(72 - 6 * _OD);
                break;
            }
        }
    }

    return {
        ar: arConverted,
        od: odConverted,
        cs: csConverted,
        hp: hpConverted
    };
};
