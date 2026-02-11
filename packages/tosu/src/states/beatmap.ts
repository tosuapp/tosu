import {
    Beatmap,
    CalculateMods,
    ClientType,
    GameState,
    ModsCollection,
    ModsLazer,
    NativeOsuDifficultyAttributes,
    NativeOsuPerformanceAttributes,
    NativeTimedOsuDifficultyAttributes,
    OsuPerformanceCalculator,
    Ruleset,
    TimedLazy,
    config,
    measureTime,
    sanitizeMods,
    silentCatch,
    wLogger
} from '@tosu/common';
import fs from 'fs';
import { HitType, Beatmap as ParsedBeatmap, TimingPoint } from 'osu-classes';
import { BeatmapDecoder } from 'osu-parsers';

import { BeatmapStrains } from '@/api/types/v1';
import { AbstractInstance } from '@/instances';
import { AbstractState } from '@/states';
import { fixDecimals, safeJoin } from '@/utils/converters';

interface BeatmapPPAcc {
    '100': number;
    '99': number;
    '98': number;
    '97': number;
    '96': number;
    '95': number;
    '94': number;
    '93': number;
    '92': number;
    '91': number;
    '90': number;
}

interface BeatmapAttributes {
    ar: number;
    arConverted: number;
    cs: number;
    csConverted: number;
    hp: number;
    hpConverted: number;
    od: number;
    odConverted: number;
    circles: number;
    sliders: number;
    spinners: number;
    holds: number;
    maxCombo: number;
    fullStars: number;
    stars: number;
    aim?: number | undefined;
    speed?: number | undefined;
    flashlight?: number | undefined;
    sliderFactor?: number | undefined;
    stamina?: number | undefined;
    rhythm?: number | undefined;
    color?: number | undefined;
    reading?: number | undefined;
    hitWindow?: number | undefined;
}

interface BeatmapPPAttributes {
    ppAccuracy: number;
    ppAim: number;
    ppDifficulty: number;
    ppFlashlight: number;
    ppSpeed: number;
}

interface BeatmapPPCurrentAttributes {
    stars: number;
    pp: number;
    fcPP: number;
    maxAchieved: number;
    maxAchievable: number;
}

interface BeatmapPPTimings {
    firstObj: number;
    firstNonSpinnerObj: number;
    full: number;
}

interface BreakPoint {
    hasEffect: boolean;
    start: number;
    end: number;
}

interface KiaiPoint {
    start: number;
    end: number;
}

export class BeatmapPP extends AbstractState {
    isCalculating: boolean = false;

    isKiai: boolean;
    isBreak: boolean;

    beatmapContent?: string;
    lazerBeatmap?: ParsedBeatmap;
    beatmap?: Beatmap;

    ruleset?: Ruleset;
    nativeMods?: ModsCollection;
    attributes?: NativeOsuDifficultyAttributes;
    timedLazy?: TimedLazy<NativeTimedOsuDifficultyAttributes>;
    performanceCalculator?: OsuPerformanceCalculator;

    mode: number;
    clockRate: number = 1;
    previewtime: number = 0;
    strains: number[];
    strainsAll: BeatmapStrains;
    realtimeBPM: number;
    commonBPM: number;
    minBPM: number;
    maxBPM: number;
    ppAcc: BeatmapPPAcc;
    calculatedMapAttributes: BeatmapAttributes;
    currAttributes: BeatmapPPCurrentAttributes = {
        stars: 0.0,
        pp: 0.0,
        maxAchieved: 0.0,
        maxAchievable: 0.0,
        fcPP: 0.0
    };

    currPPAttributes: BeatmapPPAttributes = {
        ppAccuracy: 0.0,
        ppAim: 0.0,
        ppDifficulty: 0.0,
        ppFlashlight: 0.0,
        ppSpeed: 0.0
    };

    fcPPAttributes: BeatmapPPAttributes = {
        ppAccuracy: 0.0,
        ppAim: 0.0,
        ppDifficulty: 0.0,
        ppFlashlight: 0.0,
        ppSpeed: 0.0
    };

    timings: BeatmapPPTimings = {
        firstObj: 0,
        firstNonSpinnerObj: 0,
        full: 0
    };

    timingPoints: TimingPoint[] = [];
    breaks: BreakPoint[] = [];
    kiais: KiaiPoint[] = [];

    previousPassedObjects: number = 0;

    constructor(game: AbstractInstance) {
        super(game);

        this.init();
    }

    init() {
        this.isKiai = false;
        this.isBreak = false;

        this.strains = [];
        this.strainsAll = {
            series: [],
            xaxis: []
        };
        this.mode = 0;
        this.previewtime = 0;
        this.realtimeBPM = 0.0;
        this.commonBPM = 0.0;
        this.minBPM = 0.0;
        this.maxBPM = 0.0;
        this.ppAcc = {
            100: 0.0,
            99: 0.0,
            98: 0.0,
            97: 0.0,
            96: 0.0,
            95: 0.0,
            94: 0.0,
            93: 0.0,
            92: 0.0,
            91: 0.0,
            90: 0.0
        };
        this.calculatedMapAttributes = {
            ar: 0.0,
            arConverted: 0.0,
            cs: 0.0,
            csConverted: 0.0,
            hp: 0.0,
            hpConverted: 0.0,
            od: 0.0,
            odConverted: 0.0,
            circles: 0,
            sliders: 0,
            spinners: 0,
            holds: 0,
            maxCombo: 0,
            fullStars: 0.0,
            stars: 0.0,
            aim: 0.0,
            speed: 0.0,
            flashlight: 0.0,
            sliderFactor: 0.0,
            stamina: 0.0,
            rhythm: 0.0,
            color: 0.0,
            reading: 0.0,
            hitWindow: 0.0
        };
        this.currAttributes = {
            stars: 0.0,
            pp: 0.0,
            maxAchieved: 0.0,
            maxAchievable: 0.0,
            fcPP: 0.0
        };
        this.currPPAttributes = {
            ppAccuracy: 0.0,
            ppAim: 0.0,
            ppDifficulty: 0.0,
            ppFlashlight: 0.0,
            ppSpeed: 0.0
        };
        this.fcPPAttributes = {
            ppAccuracy: 0.0,
            ppAim: 0.0,
            ppDifficulty: 0.0,
            ppFlashlight: 0.0,
            ppSpeed: 0.0
        };
        this.timings = {
            firstObj: 0,
            firstNonSpinnerObj: 0,
            full: 0
        };
        this.timingPoints = [];
        this.breaks = [];
        this.kiais = [];

        this.previousPassedObjects = 0;
    }

    resetGradual() {
        silentCatch(this.timedLazy?.destroy, this.timedLazy?.enumerator);

        this.timedLazy = undefined;
        this.previousPassedObjects = 0;

        if (!this.beatmap || !this.nativeMods || !this.ruleset) {
            return;
        }

        const result = this.game.calculator.gradual({
            lazer: this.game.client === ClientType.lazer,
            beatmap: this.beatmap,
            ruleset: this.ruleset,
            mods: this.nativeMods
        });
        if (result instanceof Error) {
            wLogger.debug(
                ClientType[this.game.client],
                this.game.pid,
                `beatmap initGradual lazy not ready`,
                result
            );
            return;
        }

        this.timedLazy = result.timedLazy;
    }

    updatePPAttributes(
        type: 'curr' | 'fc',
        attributes: NativeOsuPerformanceAttributes
    ) {
        try {
            this[`${type}PPAttributes`] = {
                ppAccuracy: attributes.accuracy || 0.0,
                ppAim: attributes.aim || 0.0,
                ppDifficulty: 0.0, // FIXME: add it
                ppFlashlight: attributes.flashlight || 0.0,
                ppSpeed: attributes.speed || 0.0
            };
        } catch (exc) {
            wLogger.error(
                `%${ClientType[this.game.client]}%`,
                `Error updating PP attributes (%${type}%):`,
                (exc as Error).message
            );
            wLogger.debug(`PP attributes update error details:`, exc);
        }
    }

    updateCurrentAttributes(stars: number, pp: number) {
        const maxAchieved = Math.max(pp, this.currAttributes.maxAchieved);

        if (this.currAttributes.pp.toFixed(2) !== pp.toFixed(2)) {
            wLogger.debug(
                `%${ClientType[this.game.client]}%`,
                `Current attributes updated to %${stars.toFixed(2)}★% | %${pp.toFixed(2)}pp% (max achieved: %${maxAchieved.toFixed(2)}pp%)`
            );
        }

        this.currAttributes.stars = stars;
        this.currAttributes.pp = pp;
        this.currAttributes.maxAchieved = maxAchieved;
    }

    resetAttributes() {
        this.currAttributes = {
            stars: 0.0,
            pp: 0.0,
            maxAchieved: 0.0,
            maxAchievable: 0.0,
            fcPP: this.ppAcc[100] || 0.0
        };

        this.currPPAttributes = {
            ppAccuracy: 0.0,
            ppAim: 0.0,
            ppDifficulty: 0.0,
            ppFlashlight: 0.0,
            ppSpeed: 0.0
        };
        this.fcPPAttributes = {
            ppAccuracy: 0.0,
            ppAim: 0.0,
            ppDifficulty: 0.0,
            ppFlashlight: 0.0,
            ppSpeed: 0.0
        };
    }

    getCurrentBeatmap() {
        return this.beatmap;
    }

    @measureTime
    updateMapMetadata(
        currentMods: CalculateMods,
        currentMode: number,
        lazerBypass: boolean = false
    ) {
        try {
            const startTime = performance.now();

            const { menu, global } = this.game.getServices(['menu', 'global']);

            if (menu.folder === '.' && !lazerBypass) {
                wLogger.debug(
                    `%${ClientType[this.game.client]}%`,
                    `Skipping osu! theme song metadata update`,
                    {
                        SongsFolder: global.songsFolder,
                        Folder: menu.folder,
                        Path: menu.filename
                    }
                );
                return;
            }

            if (!menu.filename) {
                wLogger.debug(
                    `%${ClientType[this.game.client]}%`,
                    `Skipping beatmap with no file name`,
                    {
                        SongsFolder: global.songsFolder,
                        Folder: menu.folder,
                        Path: menu.filename
                    }
                );
                return;
            }

            const mapPath = safeJoin(
                global.songsFolder,
                menu.folder,
                menu.filename
            );

            if (!menu.folder || !menu.filename) {
                return 'not-ready';
            }

            if (!fs.existsSync(mapPath) || !fs.statSync(mapPath).isFile()) {
                return 'not-ready';
            }

            try {
                this.beatmapContent = fs.readFileSync(mapPath, 'utf8');

                try {
                    this.beatmap?.destroy();
                    this.lazerBeatmap = undefined;

                    silentCatch(this.ruleset?.destroy);
                    silentCatch(this.nativeMods?.destroy);
                    silentCatch(this.performanceCalculator?.destroy);

                    this.ruleset = undefined;
                    this.nativeMods = undefined;
                    this.performanceCalculator = undefined;

                    this.attributes = undefined;
                } catch (exc) {
                    this.beatmap = undefined;
                    wLogger.debug(
                        `%${ClientType[this.game.client]}%`,
                        `Failed to free previous beatmap instance:`,
                        exc
                    );
                }
            } catch (error) {
                wLogger.debug(
                    `%${ClientType[this.game.client]}%`,
                    `Error reading beatmap file:`,
                    {
                        mapPath,
                        currentMods: currentMods.array,
                        currentMode
                    },
                    (error as Error).stack
                );
                return 'not-ready';
            }

            const beatmap = this.game.calculator.beatmap(
                this.beatmapContent,
                currentMode
            );
            if (beatmap instanceof Error) {
                wLogger.debug(
                    ClientType[this.game.client],
                    this.game.pid,
                    `beatmapPP updateMapMetadata`,
                    `Can't process map`,
                    {
                        mapPath,
                        currentMods: currentMods.array,
                        currentMode
                    },
                    (beatmap as Error).stack
                );
                return 'not-ready';
            }

            this.beatmap = beatmap;

            const beatmapCheckTime = performance.now();
            const totalTime = (beatmapCheckTime - startTime).toFixed(2);
            wLogger.time(
                `%${ClientType[this.game.client]}%`,
                `Beatmap took %${totalTime}ms%`
            );

            const commonParams = {
                lazer: this.game.client === ClientType.lazer,
                mods: sanitizeMods(currentMods.array)
            };

            const performance_ = this.game.calculator.performance(currentMode);
            if (performance_ instanceof Error) {
                wLogger.debug(
                    ClientType[this.game.client],
                    this.game.pid,
                    `beatmap updateMapMetadata Gradual not ready`,
                    performance_
                );
                return;
            }

            const attributes = this.game.calculator.attributes({
                lazer: commonParams.lazer,
                beatmap: this.beatmap,
                ruleset: performance_.ruleset,
                mods: commonParams.mods
            });
            if (attributes instanceof Error) {
                wLogger.debug(
                    ClientType[this.game.client],
                    this.game.pid,
                    `beatmap updateMapMetadata Difficulty not ready`,
                    attributes
                );
                return;
            }

            this.ruleset = performance_.ruleset;
            this.performanceCalculator = performance_.calculator;

            this.nativeMods = attributes.mods;
            this.attributes = attributes.difficulty;

            this.clockRate = currentMods.rate;

            if (config.calculatePP) {
                for (const acc of [
                    100, 99, 98, 97, 96, 95, 94, 93, 92, 91, 90
                ]) {
                    const result = this.performanceCalculator.calculate(
                        {
                            ruleset: this.ruleset,
                            legacyScore: undefined,
                            beatmap: this.beatmap,
                            mods: attributes.mods,
                            maxCombo: this.attributes.maxCombo,
                            accuracy: acc / 100,
                            countGreat:
                                this.attributes.hitCircleCount +
                                this.attributes.sliderCount +
                                this.attributes.spinnerCount,
                            countSliderTailHit: this.attributes.sliderCount
                        },
                        this.attributes
                    );
                    this.ppAcc[acc as 100] = fixDecimals(result.total);
                }
            }

            const calculationTime = performance.now();
            wLogger.time(
                `%${ClientType[this.game.client]}%`,
                `Attributes & strains calculation took %${(calculationTime - beatmapCheckTime).toFixed(2)}ms%`
            );

            try {
                const decoder = new BeatmapDecoder();

                this.lazerBeatmap = decoder.decodeFromString(
                    this.beatmapContent,
                    {
                        parseEvents: true,
                        parseTimingPoints: true,
                        parseHitObjects: true,

                        parseColours: false,
                        parseEditor: false,
                        parseGeneral: true,
                        parseStoryboard: false,
                        parseMetadata: false
                    }
                );

                const { bpm, bpmMin, bpmMax } = this.lazerBeatmap;

                if (
                    safeJoin(this.lazerBeatmap.events.backgroundPath || '') !==
                        menu.backgroundFilename &&
                    !lazerBypass
                ) {
                    menu.backgroundFilename = safeJoin(
                        this.lazerBeatmap.events.backgroundPath || ''
                    );
                }

                this.previewtime = this.lazerBeatmap.general.previewTime;

                this.commonBPM = bpm * this.clockRate;
                this.minBPM = bpmMin * this.clockRate;
                this.maxBPM = bpmMax * this.clockRate;

                this.breaks = this.lazerBeatmap.events.breaks.map((r) => ({
                    hasEffect: r.hasEffect,
                    start: r.startTime,
                    end: r.endTime
                }));

                this.timings.firstObj = Math.round(
                    this.lazerBeatmap.hitObjects.at(0)?.startTime ?? 0
                );
                this.timings.firstNonSpinnerObj = Math.round(
                    this.lazerBeatmap.hitObjects.find(
                        (r) => !(r.hitType & HitType.Spinner)
                    )?.startTime ?? 0
                );
                this.timings.full = Math.round(this.lazerBeatmap.totalLength);

                this.mode = this.lazerBeatmap.mode;

                this.timingPoints =
                    this.lazerBeatmap.controlPoints.timingPoints;

                const kiais: KiaiPoint[] = [];
                const points = this.lazerBeatmap.controlPoints.effectPoints;
                for (const point of points) {
                    const isEnded = kiais[kiais.length - 1]?.end !== -1;
                    if (point.kiai === false && !isEnded) {
                        kiais[kiais.length - 1].end = point.startTime;
                        continue;
                    }

                    if (point.kiai === true && isEnded)
                        kiais.push({ start: point.startTime, end: -1 });
                }

                this.kiais = kiais;

                this.game.resetReportCount(
                    'beatmapPP updateMapMetadataTimings'
                );
            } catch (exc) {
                this.game.reportError(
                    'beatmapPP updateMapMetadataTimings',
                    10,
                    ClientType[this.game.client],
                    this.game.pid,
                    `beatmapPP updateMapMetadata`,
                    (exc as any).message
                );
                wLogger.debug(
                    `%${ClientType[this.game.client]}%`,
                    `Error in metadata timings update:`,
                    exc
                );
                return;
            }

            const beatmapParseTime = performance.now();
            wLogger.time(
                `%${ClientType[this.game.client]}%`,
                `Beatmap parsing took %${(beatmapParseTime - calculationTime).toFixed(2)}ms%`
            );

            this.calculatedMapAttributes = {
                ar: this.beatmap.native.approachRate,
                arConverted: this.beatmap.native.approachRate, // FIXME: asd
                cs: this.beatmap.native.circleSize,
                csConverted: this.beatmap.native.circleSize, // FIXME: asd
                od: this.beatmap.native.overallDifficulty,
                odConverted: this.beatmap.native.overallDifficulty, // FIXME: asd
                hp: this.beatmap.native.drainRate,
                hpConverted: this.beatmap.native.drainRate, // FIXME: asd
                circles: this.lazerBeatmap.hittable,
                sliders: this.lazerBeatmap.slidable,
                spinners: this.lazerBeatmap.spinnable,
                holds: this.lazerBeatmap.holdable,
                maxCombo: this.attributes.maxCombo,
                fullStars: this.attributes.starRating,
                stars: this.attributes.starRating,
                aim: this.attributes.aimDifficulty || 0,
                speed: this.attributes.speedDifficulty || 0,
                flashlight: this.attributes.flashlightDifficulty || 0,
                sliderFactor: this.attributes.sliderFactor || 0,
                stamina: (this.attributes as any).staminaDifficulty || 0,
                rhythm: (this.attributes as any).rhythmDifficulty || 0,
                color: (this.attributes as any).colourDifficulty || 0,
                reading: (this.attributes as any).readingDifficulty || 0
                // hitWindow: this.difficultyAttributes.greatHitWindow
            };

            this.game.resetReportCount('beatmapPP updateMapMetadata');
        } catch (exc) {
            this.game.reportError(
                'beatmapPP updateMapMetadata',
                10,
                ClientType[this.game.client],
                this.game.pid,
                `beatmapPP updateMapMetadata`,
                (exc as any).message
            );
            wLogger.debug(
                `%${ClientType[this.game.client]}%`,
                `Error updating map metadata:`,
                exc
            );
        }
    }

    @measureTime
    updateGraph(currentMods: ModsLazer) {
        if (this.beatmapContent === undefined) return;
        try {
            const { menu } = this.game.getServices(['menu']);

            const resultStrains: BeatmapStrains = {
                series: [],
                xaxis: []
            };

            const strains = this.game.calculator.strains(this.beatmapContent, {
                mods: sanitizeMods(currentMods),
                lazer: this.game.client === ClientType.lazer
            });
            if (strains instanceof Error) {
                wLogger.debug(
                    ClientType[this.game.client],
                    this.game.pid,
                    `beatmap updateGraph Strains not ready`,
                    strains
                );
                return;
            }

            let oldStrains: number[] = [];

            let strainsAmount = 0;
            switch (strains.mode) {
                case 0:
                    strainsAmount = strains.aim?.length || 0;
                    break;

                case 1:
                    strainsAmount = strains.color?.length || 0;
                    break;

                case 2:
                    strainsAmount = strains.movement?.length || 0;
                    break;

                case 3:
                    strainsAmount = strains.strains?.length || 0;
                    break;
            }

            const sectionOffsetTime = strains.sectionLength;
            const firstObjectTime =
                this.timings.firstNonSpinnerObj / this.clockRate;
            const lastObjectTime =
                firstObjectTime + strainsAmount * sectionOffsetTime;
            const mp3LengthTime = menu.mp3Length / this.clockRate;

            const LEFT_OFFSET = Math.floor(firstObjectTime / sectionOffsetTime);

            const RIGHT_OFFSET =
                mp3LengthTime >= lastObjectTime
                    ? Math.ceil(
                          (mp3LengthTime - lastObjectTime) / sectionOffsetTime
                      )
                    : 0;

            const updateWithOffset = (
                name: string,
                values: Float64Array | undefined
            ) => {
                if (values instanceof Float64Array !== true) return;
                let data: number[] = [];

                if (Number.isFinite(LEFT_OFFSET) && LEFT_OFFSET > 0) {
                    data = Array(LEFT_OFFSET).fill(-100);
                }

                data = data.concat(Array.from(values));

                if (Number.isFinite(RIGHT_OFFSET) && RIGHT_OFFSET > 0) {
                    data = data.concat(Array(RIGHT_OFFSET).fill(-100));
                }

                resultStrains.series.push({ name, data });
            };

            switch (strains.mode) {
                case 0:
                    updateWithOffset('aim', strains.aim);
                    updateWithOffset('aimNoSliders', strains.aimNoSliders);
                    updateWithOffset('flashlight', strains.flashlight);
                    updateWithOffset('speed', strains.speed);

                    if (strains.aim instanceof Float64Array)
                        oldStrains = Array.from(strains.aim);
                    break;
                case 1:
                    updateWithOffset('color', strains.color);
                    updateWithOffset('rhythm', strains.rhythm);
                    updateWithOffset('stamina', strains.stamina);

                    if (strains.color instanceof Float64Array)
                        oldStrains = Array.from(strains.color);
                    break;
                case 2:
                    updateWithOffset('movement', strains.movement);

                    if (strains.movement instanceof Float64Array)
                        oldStrains = Array.from(strains.movement);
                    break;
                case 3:
                    updateWithOffset('strains', strains.strains);

                    if (strains.strains instanceof Float64Array)
                        oldStrains = Array.from(strains.strains);
                    break;
                default:
                // no-default
            }

            if (Number.isFinite(LEFT_OFFSET) && LEFT_OFFSET > 0) {
                oldStrains = Array(LEFT_OFFSET).fill(0).concat(oldStrains);
            }

            if (Number.isFinite(RIGHT_OFFSET) && RIGHT_OFFSET > 0) {
                oldStrains = oldStrains.concat(Array(RIGHT_OFFSET).fill(0));
            }

            for (let i = 0; i < LEFT_OFFSET; i++) {
                resultStrains.xaxis.push(i * sectionOffsetTime);
            }

            const total =
                resultStrains.series[0].data.length -
                LEFT_OFFSET -
                RIGHT_OFFSET;
            for (let i = 0; i < total; i++) {
                resultStrains.xaxis.push(
                    firstObjectTime + i * sectionOffsetTime
                );
            }

            for (let i = 0; i < RIGHT_OFFSET; i++) {
                resultStrains.xaxis.push(
                    lastObjectTime + i * sectionOffsetTime
                );
            }

            this.strains = oldStrains;
            this.strainsAll = resultStrains;

            strains.free();

            this.game.resetReportCount('beatmapPP updateGraph');
        } catch (exc) {
            this.game.reportError(
                'beatmapPP updateGraph',
                10,
                ClientType[this.game.client],
                this.game.pid,
                `beatmapPP updateGraph`,
                (exc as any).message
            );
            wLogger.debug(
                `%${ClientType[this.game.client]}%`,
                `Error updating graph:`,
                exc
            );
        }
    }

    updateEditorPP() {
        try {
            if (
                !this.beatmap ||
                !this.performanceCalculator ||
                !this.attributes ||
                !this.nativeMods ||
                !this.ruleset ||
                !this.lazerBeatmap
            ) {
                return;
            }

            const { global } = this.game.getServices(['global']);
            const objectIndex = this.lazerBeatmap.hitObjects.findLastIndex(
                (r) => r.startTime <= global.playTime
            );
            if (objectIndex === -1) {
                this.currAttributes.pp = 0;
                this.currAttributes.stars = 0;

                return;
            }

            if (objectIndex - this.previousPassedObjects < 0 || !this.timedLazy)
                this.resetGradual();

            let offset = objectIndex - this.previousPassedObjects;
            if (offset <= 0 || this.isCalculating === true) return;
            this.isCalculating = true;

            let currentDifficulty;
            const t1 = performance.now();
            while (offset > 0) {
                // edge case: it can froze tosu if it starts recalculating huge amount of objects while user exited from gameplay
                if (global.status !== GameState.edit || !this.timedLazy) break;

                currentDifficulty = this.timedLazy.next(
                    this.timedLazy.enumerator
                );

                offset--;
            }
            const t2 = performance.now();
            if (!currentDifficulty) {
                wLogger.debug(
                    ClientType[this.game.client],
                    this.game.pid,
                    `beatmap updateEditorPP no current currentAttributes`
                );

                this.isCalculating = false;
                return;
            }

            const curPerformance = this.performanceCalculator.calculate(
                {
                    ruleset: this.ruleset,
                    legacyScore: undefined,
                    beatmap: this.beatmap,
                    mods: ModsCollection.create(),
                    maxCombo: currentDifficulty.attributes.maxCombo,
                    accuracy: 1,
                    countGreat: objectIndex,
                    countSliderTailHit: currentDifficulty.attributes.sliderCount
                },
                currentDifficulty.attributes
            );

            const t3 = performance.now();
            this.currAttributes.pp = curPerformance.total;
            this.currAttributes.stars = currentDifficulty.attributes.starRating;

            this.previousPassedObjects = objectIndex;
            this.isCalculating = false;

            wLogger.time(
                `%${ClientType[this.game.client]}%`,
                `Calculating editor PP took %${(t3 - t1).toFixed(4)}ms% (${(t2 - t1).toFixed(4)}/${(t3 - t2).toFixed(4)})`
            );

            this.game.resetReportCount('beatmapPP updateEditorPP');
        } catch (exc) {
            this.game.reportError(
                'beatmapPP updateEditorPP',
                10,
                ClientType[this.game.client],
                this.game.pid,
                `beatmapPP updateEditorPP`,
                (exc as any).message
            );
            wLogger.debug(
                `%${ClientType[this.game.client]}%`,
                `Error updating editor PP:`,
                exc
            );
        }
    }

    updateEventsStatus(ms: number, multiply: number) {
        if (!this.lazerBeatmap) return;

        const bpm =
            this.lazerBeatmap.controlPoints.timingPoints
                .toReversed()
                .find((r: TimingPoint) => r.startTime <= ms && r.bpm !== 0)
                ?.bpm ||
            this.lazerBeatmap.controlPoints.timingPoints[0]?.bpm ||
            0.0;

        this.realtimeBPM = bpm * multiply;

        this.isKiai = this.kiais.some((r) => ms >= r.start && ms <= r.end);
        this.isBreak = this.breaks.some((r) => ms >= r.start && ms <= r.end);
    }
}
