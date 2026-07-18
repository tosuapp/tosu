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
 */
export function calculateMaxAchievableScore(
    beatmap: PlayBeatmap,
    combo: number,
    current: ScoreInfoData,
    curDiff: DifficultyAttrsData,
    max: ScoreInfoData
): ScoreInfoData {
    const score = populateMaxHits(beatmap.mode, current, curDiff, max);
    // Calculate max achievable combo using current max combo or current combo plus remaining combo
    const remainingCombo = max.maxCombo - curDiff.maxCombo;
    score.maxCombo = Math.max(score.maxCombo, combo + remainingCombo);

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
