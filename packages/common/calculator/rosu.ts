import * as rosu from '@kotrikd/rosu-pp';
import type { GameMode } from '@kotrikd/rosu-pp';

import {
    ICalculator,
    ICalculatorAttributesParams,
    ICalculatorDifficultyParams
} from '../index';

export class RosuCalculator extends ICalculator {
    calculator: any;

    async load() {
        // FIXME: didnt test it
        this.calculator = this.isLocal
            ? await import('@kotrikd/rosu-pp')
            : await import(this.path);
    }

    beatmap(content: string, mode: GameMode): rosu.Beatmap | Error {
        try {
            const beatmap = new rosu.Beatmap(content);
            if (beatmap.mode === 0 && beatmap.mode !== mode)
                beatmap.convert(mode);

            return beatmap;
        } catch (error) {
            return error as Error;
        }
    }

    attributes(params: ICalculatorAttributesParams): rosu.BeatmapAttributes {
        const attributes = new rosu.BeatmapAttributesBuilder({
            isConvert: params.isConvert,
            map: params.map,
            mods: params.mods,
            mode: params.mode
        }).build();

        return attributes;
    }

    performance(
        params: rosu.PerformanceArgs,
        beatmap: rosu.MapOrAttributes
    ): rosu.PerformanceAttributes {
        const calculate = new rosu.Performance(params).calculate(beatmap);
        return calculate;
    }

    difficulty(params: ICalculatorDifficultyParams): rosu.Difficulty {
        const strains = new rosu.Difficulty(params);
        return strains;
    }

    strains(
        params: ICalculatorDifficultyParams,
        beatmap: rosu.Beatmap
    ): rosu.Strains {
        const strains = new rosu.Difficulty(params).strains(beatmap);
        return strains;
    }
}
