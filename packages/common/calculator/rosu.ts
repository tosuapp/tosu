import * as rosu from '@kotrikd/rosu-pp';
import type { GameMode } from '@kotrikd/rosu-pp';

import {
    ICalculator,
    ICalculatorAttributesParams,
    ICalculatorDifficultyParams,
    wLogger
} from '../index';

export class RosuCalculator extends ICalculator {
    calculator: typeof rosu;

    override async load() {
        super.load();

        if (this.isLocal) {
            this.calculator = await import('@kotrikd/rosu-pp');
            return;
        }

        // FIXME: didnt test it
        try {
            this.calculator = await import(this.path);
        } catch (error) {
            wLogger.error(
                '[calculator] Failed to load external, fallbacking to internal'
            );
            wLogger.debug('[calculator] Failed to load external:', error);

            this.calculator = await import('@kotrikd/rosu-pp');
        }
    }

    beatmap(content: string, mode: GameMode): rosu.Beatmap | Error {
        try {
            const beatmap = new this.calculator.Beatmap(content);
            if (beatmap.mode === 0 && beatmap.mode !== mode)
                beatmap.convert(mode);

            return beatmap;
        } catch (error) {
            return error as Error;
        }
    }

    attributes(params: ICalculatorAttributesParams): rosu.BeatmapAttributes {
        const attributes = new this.calculator.BeatmapAttributesBuilder({
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
        const calculate = new this.calculator.Performance(params).calculate(
            beatmap
        );
        return calculate;
    }

    difficulty(params: ICalculatorDifficultyParams): rosu.Difficulty {
        const strains = new this.calculator.Difficulty(params);
        return strains;
    }

    strains(
        params: ICalculatorDifficultyParams,
        beatmap: rosu.Beatmap
    ): rosu.Strains {
        const strains = new this.calculator.Difficulty(params).strains(beatmap);
        return strains;
    }
}
