import { CalculateMods } from '@/utils/osuMods.types';

export interface Statistics {
    miss: number;
    meh: number;
    ok: number;
    good: number;
    great: number;
    perfect: number;
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
    legacyComboIncrease: number;
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
    name: string;
    score: number;
    combo: number;
    maxCombo: number;
    mods: CalculateMods;
    h300: number;
    h100: number;
    h50: number;
    h0: number;
    team: number;
    position: number;
    isPassing: boolean;
}
