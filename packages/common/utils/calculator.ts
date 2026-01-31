import rosu from '@kotrikd/rosu-pp';
import native from '@tosuapp/osu-native-wrapper';
import fsp from 'fs/promises';

import { ModsLazer, wLogger } from '../index';

export type {
    Beatmap,
    OsuPerformanceCalculator,
    ScoreInfoInput
} from '@tosuapp/osu-native-wrapper';
export { Ruleset, ModsCollection } from '@tosuapp/osu-native-wrapper';
export type {
    NativeOsuPerformanceAttributes,
    NativeOsuDifficultyAttributes,
    NativeTimedOsuDifficultyAttributes
} from '@tosuapp/osu-native-napi';

export type PerformanceArgs = rosu.PerformanceArgs;

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

export class Calculator {
    isLoaded: boolean = false;

    bundled: boolean = true;
    path: string;

    calculator: typeof native;

    constructor(path: string) {
        this.path = path;
    }

    /**
     * Async load pp calculator module
     */
    async load(): Promise<void> {
        this.bundled = this.path === 'local';
        if (this.bundled) {
            this.calculator = await import('@tosuapp/osu-native-wrapper');
            return;
        }

        try {
            const stats = await fsp.stat(this.path);
            if (stats.isDirectory()) {
                this.calculator = await import(this.path);
                this.bundled = false;

                wLogger.info('[calculator]', 'Successfully loaded external');
                return;
            }

            this.calculator = await import('@tosuapp/osu-native-wrapper');
            this.bundled = true;
        } catch (error) {
            wLogger.error('[calculator] Failed to load external calculator');
            wLogger.debug('Failed to load external calculator:', error);

            this.calculator = await import('@tosuapp/osu-native-wrapper');
            this.bundled = true;
        } finally {
            this.isLoaded = true;
        }
    }

    beatmap(content: string, _rulesetId: number) {
        try {
            const beatmap = this.calculator.Beatmap.fromText(content);
            // todo: beatmap conversion
            // if (beatmap.mode === 0 && beatmap.mode !== mode)
            //     beatmap.convert(mode);

            return beatmap;
        } catch (error) {
            return error as Error;
        }
    }

    mods(params: { lazer: boolean; mods: ModsLazer }) {
        if (params.lazer && !params.mods.some((m) => m.acronym === 'CL'))
            params.mods.push({ acronym: 'CL' });

        const nativeMods = this.calculator.ModsCollection.create();
        for (let i = 0; i < params.mods.length; i++) {
            const mod = params.mods[i];

            try {
                nativeMods!.add(this.calculator.Mod.create(mod.acronym));
            } catch {
                continue;
            }
        }

        return nativeMods;
    }

    attributes(params: {
        lazer: boolean;
        beatmap: native.Beatmap;
        ruleset: native.Ruleset;
        mods: ModsLazer;
    }) {
        try {
            const nativeMods = this.mods(params);

            const difficultyFactory =
                this.calculator.DifficultyCalculatorFactory.create<native.OsuDifficultyCalculator>(
                    params.ruleset,
                    params.beatmap
                );

            const difficulty = nativeMods
                ? difficultyFactory.calculateWithMods(nativeMods)
                : difficultyFactory.calculate();
            const timedDifficulty = nativeMods
                ? difficultyFactory.calculateWithModsTimed(nativeMods)
                : difficultyFactory.calculateTimed();

            difficultyFactory.destroy();

            return {
                mods: nativeMods,
                difficulty,
                timedDifficulty
            };
        } catch (error) {
            return error as Error;
        }
    }

    performance(rulesetId: number) {
        try {
            const ruleset = this.calculator.Ruleset.fromId(rulesetId);
            const calculator =
                this.calculator.PerformanceCalculatorFactory.create<native.OsuPerformanceCalculator>(
                    ruleset
                );

            return {
                ruleset,
                calculator
            };
        } catch (error) {
            return error as Error;
        }
    }

    // attributes(params: ICalculatorAttributesParams): rosu.BeatmapAttributes {
    //     const attributes = new this.calculator.BeatmapAttributesBuilder({
    //         isConvert: params.isConvert,
    //         map: params.map,
    //         mods: params.mods,
    //         mode: params.mode
    //     }).build();

    //     return attributes;
    // }

    // performance(
    //     params: rosu.PerformanceArgs,
    //     beatmap: rosu.MapOrAttributes
    // ): rosu.PerformanceAttributes {
    //     const calculate = new this.calculator.Performance(params).calculate(
    //         beatmap
    //     );
    //     return calculate;
    // }

    // difficulty(params: ICalculatorDifficultyParams): rosu.Difficulty {
    //     const strains = new this.calculator.Difficulty(params);
    //     return strains;
    // }

    strains(content: string, params: ICalculatorDifficultyParams) {
        try {
            const beatmap = new rosu.Beatmap(content);
            const strains = new rosu.Difficulty(params).strains(beatmap);

            beatmap.free();
            return strains;
        } catch (error) {
            return error as Error;
        }
    }
}
