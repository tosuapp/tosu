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
    smallTickHit: number;
    largeTickMiss?: number;
    largeTickHit: number;
    smallBonus?: number;
    largeBonus?: number;
    ignoreMiss?: number;
    ignoreHit?: number;
    comboBreak?: number;
    /** sliderEndHits */
    sliderTailHit: number;
    legacyComboIncrease?: number;
}

export interface KeyOverlayButton {
    name: string;
    isPressed: boolean;
    count: number;
}

export interface LeaderboardPlayer {
    userId: number;
    name: string;
    score: number;
    combo: number;
    accuracy: number;
    maxCombo: number;
    mods: CalculateMods;
    statistics: Statistics;
    team: number;
    position: number;
    isPassing: boolean;
}
