import type rosu from '@kotrikd/rosu-pp';

import { ModsLazer } from '../utils/osuMods.types';

export {
    HitResultPriority,
    PerformanceAttributes,
    GradualPerformance,
    Beatmap
} from '@kotrikd/rosu-pp';

export type PerformanceArgs = rosu.PerformanceArgs;

export type Calculator = {
    type: 'rosu' | 'csharp';
    path: string;
};

export type ICalculatorAttributesParams = {
    isConvert: boolean;
    map: rosu.Beatmap;
    mods: ModsLazer;
    mode: rosu.GameMode;
};

export type ICalculatorDifficultyParams = {
    mods: ModsLazer;
    lazer: boolean;
};

export abstract class ICalculator {
    /**
     * if true uses bundled pp counter
     */
    isLocal: boolean;
    path: string;

    abstract calculator: any;

    constructor(path: string) {
        this.isLocal = path === 'local';
        this.path = path;
    }

    /**
     * Async load pp calculator module
     */
    abstract load(): Promise<void>;

    /**
     * Returns parsed and converted beatmap object
     */
    abstract beatmap(
        content: string,
        mode: number | string
    ): rosu.Beatmap | Error;

    /**
     * Returns converted beatmap attributes after mods
     */
    abstract attributes(
        params: ICalculatorAttributesParams
    ): rosu.BeatmapAttributes;

    abstract performance(
        params: rosu.PerformanceArgs,
        beatmap: rosu.MapOrAttributes
    ): rosu.PerformanceAttributes;

    abstract difficulty(params: ICalculatorDifficultyParams): rosu.Difficulty;

    abstract strains(
        params: ICalculatorDifficultyParams,
        beatmap: rosu.Beatmap
    ): rosu.Strains;
}
