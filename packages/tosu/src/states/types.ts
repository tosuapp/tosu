import { CalculateMods } from '@/utils/osuMods.types';

export interface Statistics {
    perfect: number;
    great: number;
    good: number;
    ok: number;
    meh: number;
    miss: number;
    smallTickMiss: number;
    smallTickHit: number;
    largeTickMiss: number;
    largeTickHit: number;
    smallBonus: number;
    largeBonus: number;
    ignoreMiss: number;
    ignoreHit: number;
    comboBreak: number;
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
