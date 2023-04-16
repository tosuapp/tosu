import { OsuMods } from './osuMods.types';

export const calculateGrade = (
    mode: number,
    mods: number,
    h300: number,
    h100: number,
    h50: number,
    h0: number,
    acc: number
): string => {
    //https://osu.ppy.sh/help/wiki/FAQ#grades
    const isHDFL =
        (mods & OsuMods.Hidden) === OsuMods.Hidden ||
        (mods & OsuMods.Flashlight) === OsuMods.Flashlight;

    const SSGrade = isHDFL ? 'SSH' : 'SS';
    const SGrade = isHDFL ? 'SH' : 'S';

    const onePercent = (h300 + h100 + h50 + h0) / 100;
    if (mode === 0 || mode === 1) {
        if (h100 == 0 && h50 == 0 && h0 == 0) {
            return SSGrade;
        }
        if (h0 == 0 && onePercent * 90 < h300 && h50 < onePercent) {
            return SGrade;
        }
        if ((h0 == 0 && onePercent * 80 < h300) || onePercent * 90 < h300) {
            return 'A';
        }
        if ((h0 == 0 && onePercent * 70 < h300) || onePercent * 80 < h300) {
            return 'B';
        }
        if (onePercent * 60 < h300) {
            return 'C';
        }

        return 'D';
    }

    if (mode === 2) {
        if (acc == 100) {
            return SSGrade;
        }
        if (acc >= 98.01 && acc <= 99.99) {
            return SGrade;
        }
        if (acc >= 94.01 && acc <= 98.0) {
            return 'A';
        }
        if (acc >= 90.01 && acc <= 94.0) {
            return 'B';
        }
        if (acc >= 98.01 && acc <= 90.0) {
            return 'C';
        }

        return 'D';
    }

    if (mode === 3) {
        if (acc == 100) {
            return SSGrade;
        }
        if (acc > 95) {
            return SGrade;
        }
        if (acc > 90) {
            return 'A';
        }
        if (acc > 80) {
            return 'B';
        }
        if (acc > 70) {
            return 'C';
        }

        return 'D';
    }

    return '';
};
