import type {
    DifficultyAttrsData,
    PlayBeatmap,
    ScoreInfoData
} from '@tosuapp/lazer-calculator-prebuilt';

/**
 * Calculate the maximum achievable score based on current score.
 * @param beatmap Current beatmap.
 * @param combo Current combo count.
 * @param current Current score data.
 * @param curDiff Current difficulty attributes.
 * @param max Maximum possible score.
 * @param beatmapDiff Current beatmap difficulty attributes.
 */
export function calculateMaxAchievableScore(
    beatmap: PlayBeatmap,
    combo: number,
    current: ScoreInfoData,
    curDiff: DifficultyAttrsData,
    max: ScoreInfoData,
    beatmapDiff: DifficultyAttrsData
): ScoreInfoData {
    const score = populateMaxHits(beatmap.mode, current, curDiff, max);
    // Calculate max achievable combo using current max combo or current combo plus remaining combo
    const remainingCombo = max.maxCombo - curDiff.maxCombo;
    score.maxCombo = Math.max(score.maxCombo, combo + remainingCombo);

    // If the current score is a legacy score and std, calculate the max achievable score.
    // This is required because std pp calculation uses legacy score values for miss estimation.
    // See https://osu.ppy.sh/wiki/en/Gameplay/Score/ScoreV1/osu%21 for formula reference.
    // REMOVE: When there are proper way to calculate total score.
    if (current.isLegacyScore && beatmap.mode === 0) {
        // Combo multiplier sum base in remaining section.
        const comboMultiplierBase =
            Math.max(curDiff.maxCombo - 1, 0) +
            Math.max(max.maxCombo - 1, 0) -
            1;

        // Adjusted combo multiplier sum base in remaining section adding current combo.
        const adjustedComboMultiplierBase =
            Math.max(combo - 1, 0) * 2 + remainingCombo - 1;

        const remainingScore =
            (approxStdMaxScore(beatmapDiff) - approxStdMaxScore(curDiff)) *
            (adjustedComboMultiplierBase / comboMultiplierBase);

        score.totalScore += remainingScore;
    }

    score.accuracy = beatmap.calculateAccuracy(score);
    return score;
}

/**
 * Calculate a full combo score based on current score.
 * @param beatmap Current beatmap.
 * @param current Current score data.
 * @param curDiff Current difficulty attributes.
 * @param max Maximum possible score.
 */
export function calculateFcScore(
    beatmap: PlayBeatmap,
    current: ScoreInfoData,
    curDiff: DifficultyAttrsData,
    max: ScoreInfoData
): ScoreInfoData {
    const score = populateMaxHits(beatmap.mode, current, curDiff, max);
    score.maxCombo = max.maxCombo;

    // Remove misses and replace to max hit.
    setMaxHit(
        beatmap.mode,
        score,
        getMaxHit(beatmap.mode, score) + current.misses + current.comboBreaks
    );
    score.comboBreaks = 0;
    score.misses = 0;

    // Full combo scores doesn't have large tick and slider end misses.
    score.largeTickHits = max.largeTickHits;
    score.largeTickMisses = 0;
    score.sliderEndHits = max.sliderEndHits;

    score.accuracy = beatmap.calculateAccuracy(score);
    return score;
}

/**
 * Populate the remaining maximum hit results for the current beatmap
 * @param mode Current game mode.
 * @param current Current score data.
 * @param curDiff Current difficulty attributes.
 * @param max Maximum possible score.
 */
function populateMaxHits(
    mode: number,
    current: ScoreInfoData,
    curDiff: DifficultyAttrsData,
    max: ScoreInfoData
): ScoreInfoData {
    const score = {
        ...current,
        largeTickHits: max.largeTickHits - current.largeTickMisses,

        // Calculate max archivable slider end hits based on difference between max and current hits
        sliderEndHits:
            max.sliderEndHits - (curDiff.nSliders - current.sliderEndHits),

        // Small hit ticks doesn't affect combo but only accuracy.
        smallTickHits: max.smallTickHits - current.smallTickMisses
    };
    setMaxHit(
        mode,
        score,
        getMaxHit(mode, max) -
            current.goods -
            current.oks -
            current.mehs -
            current.misses
    );

    return score;
}

function setMaxHit(mode: number, score: ScoreInfoData, count: number) {
    switch (mode) {
        // osu!mania
        case 3:
            score.perfects = count;
            break;

        // osu!standard, osu!taiko, osu!catch
        default:
            score.greats = count;
            break;
    }
}

function getMaxHit(mode: number, score: ScoreInfoData) {
    switch (mode) {
        // osu!mania
        case 3:
            return score.perfects;

        // osu!standard, osu!taiko, osu!catch
        default:
            return score.greats;
    }
}

/**
 * Approximate the total score for osu! based on combo score and hit objects.
 * The returned score doesn't include any bonus scores.
 * But they are not meaningful in pp calculation.
 *
 * REMOVE: When there are proper way to calculate total score.
 */
function approxStdMaxScore(diff: DifficultyAttrsData): number {
    return (
        diff.maximumLegacyComboScore +
        (diff.nCircles + diff.nSliders + diff.nSpinners) * 300
    );
}
