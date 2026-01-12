import type rosu from '@kotrikd/rosu-pp';
import fsp from 'fs/promises';

import { ModsLazer, wLogger } from '../index';

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
        this.path = path;
        this.load();
    }

    /**
     * Async load pp calculator module
     */
    async load(): Promise<void> {
        this.isLocal = this.path === 'local';
        if (this.isLocal) return;

        try {
            const stats = await fsp.stat(this.path);
            if (stats.isDirectory()) {
                this.isLocal = false;

                wLogger.info('[calculator]', 'Successfully loaded external');
                return;
            }

            this.isLocal = true;
        } catch (error) {
            wLogger.error(
                '[calculator] Unable to find external one, make sure you specified path to a folder'
            );
            wLogger.debug('[calculator] Unable to find external one:', error);

            this.isLocal = true;
        }
    }

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
