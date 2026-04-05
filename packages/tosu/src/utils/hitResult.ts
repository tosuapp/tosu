import type { Hits3 } from '@/api/types/v2';
import type { Statistics } from '@/states/types';

/**
 * Perform conversion from legacy hit results to lazer hit statistics
 * base on https://github.com/ppy/osu/blob/master/osu.Game/Scoring/Legacy/ScoreInfoExtensions.cs
 */
export function fromLegacyHitResults(
    mode: number,
    geki: number,
    n300: number,
    katu: number,
    n100: number,
    n50: number,
    miss: number
): Statistics {
    const statistics: Statistics = {
        perfect: 0,
        great: 0,
        good: 0,
        ok: 0,
        meh: 0,
        miss: 0,
        smallTickHit: 0,
        largeTickHit: 0,
        sliderTailHit: 0,
        smallTickMiss: 0,
        largeTickMiss: 0,
        smallBonus: 0,
        largeBonus: 0,
        ignoreMiss: 0,
        ignoreHit: 0,
        comboBreak: 0
    };

    addGeki(mode, geki, statistics);
    statistics.great = n300;
    addKatu(mode, katu, statistics);
    addN100(mode, n100, statistics);
    addN50(mode, n50, statistics);
    statistics.miss = miss;
    return statistics;
}

/**
 * Perform conversion from lazer hit statistics to legacy hit results
 */
export function toLegacyHits(mode: number, statistics: Statistics): Hits3 {
    const hits: Hits3 = {
        0: getMiss(mode, statistics),
        50: getN50(mode, statistics),
        100: getN100(mode, statistics),
        300: statistics.great,
        geki: getGeki(mode, statistics),
        katu: getKatu(mode, statistics),
        sliderEndHits: statistics.sliderTailHit,
        smallTickHits: statistics.smallTickHit,
        largeTickHits: statistics.largeTickHit
    };

    return hits;
}

function addGeki(mode: number, geki: number, statistics: Statistics) {
    switch (mode) {
        case 1:
            statistics.largeBonus += geki;
            break;
        case 3:
            statistics.perfect += geki;
            break;
        default:
            break;
    }
}

function getGeki(mode: number, statistics: Statistics) {
    switch (mode) {
        case 1:
            return statistics.largeBonus;
        case 3:
            return statistics.perfect;
        default:
            return 0;
    }
}

function addKatu(mode: number, katu: number, statistics: Statistics) {
    switch (mode) {
        case 1:
            statistics.largeBonus += katu;
            break;
        case 2:
            statistics.smallTickMiss += katu;
            break;
        case 3:
            statistics.good += katu;
            break;
        default:
            break;
    }
}

function getKatu(mode: number, statistics: Statistics) {
    switch (mode) {
        case 1:
            return statistics.largeBonus;
        case 2:
            return statistics.smallTickMiss;
        case 3:
            return statistics.good;
        default:
            return 0;
    }
}

function addN100(mode: number, n100: number, statistics: Statistics) {
    switch (mode) {
        case 0:
        case 1:
        case 3:
            statistics.ok += n100;
            break;
        case 2:
            statistics.largeTickHit += n100;
            break;
        default:
            break;
    }
}

function getN100(mode: number, statistics: Statistics) {
    switch (mode) {
        case 0:
        case 1:
        case 3:
            return statistics.ok;
        case 2:
            return statistics.largeTickHit;
        default:
            return 0;
    }
}

function addN50(mode: number, n50: number, statistics: Statistics) {
    switch (mode) {
        case 0:
        case 3:
            statistics.meh += n50;
            break;
        case 2:
            statistics.smallTickHit += n50;
            break;
        default:
            break;
    }
}

function getN50(mode: number, statistics: Statistics) {
    switch (mode) {
        case 0:
        case 3:
            return statistics.meh;
        case 2:
            return statistics.smallTickHit;
        default:
            return 0;
    }
}

function getMiss(mode: number, statistics: Statistics) {
    switch (mode) {
        case 0:
        case 1:
        case 3:
            return statistics.miss;
        case 2:
            return statistics.miss + statistics.largeTickMiss;
        default:
            return 0;
    }
}
