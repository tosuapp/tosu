import { CalculateMods } from '@/utils/osuMods.types';

export interface Statistics {
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

    smallTickMiss?: number;
    smallTickHit?: number;
    largeTickMiss?: number;
    largeTickHit?: number;
    smallBonus?: number;
    largeBonus?: number;
    ignoreMiss?: number;
    ignoreHit?: number;
    comboBreak?: number;
    /** sliderEndHits */
    sliderTailHit?: number;
    legacyComboIncrease?: number;
}

export interface KeyOverlay {
    K1Pressed: boolean;
    K1Count: number;
    K2Pressed: boolean;
    K2Count: number;
    M1Pressed: boolean;
    M1Count: number;
    M2Pressed: boolean;
    M2Count: number;
}

export interface LeaderboardPlayer {
    userId: number;
    name: string;
    score: number;
    combo: number;
    maxCombo: number;
    mods: CalculateMods;
    statistics: Statistics;
    maximumStatistics: Statistics;
    team: number;
    position: number;
    isPassing: boolean;
}
