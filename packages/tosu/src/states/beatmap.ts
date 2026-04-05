import { ClientType, config, measureTime, wLogger } from '@tosu/common';
import {
    Beatmap,
    type DifficultyAttrs,
    HitWindows,
    type PerformanceAttrsData,
    type ScoreGenerator,
    type ScoreInfoData,
    type StrainsData
} from '@tosu/pp';
import fs from 'fs';
import { HitType, Beatmap as ParsedBeatmap, TimingPoint } from 'osu-classes';
import { BeatmapDecoder } from 'osu-parsers';

import { BeatmapStrains } from '@/api/types/v1';
import { AbstractInstance } from '@/instances';
import { AbstractState } from '@/states';
import { fixDecimals, safeJoin } from '@/utils/converters';
import { sanitizeMods } from '@/utils/osuMods';
import { CalculateMods } from '@/utils/osuMods.types';

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
    isKiai: boolean;
    isBreak: boolean;

    beatmap?: Beatmap;
    lazerBeatmap?: ParsedBeatmap;
    difficultyAttributes?: DifficultyAttrs;
    diffStrains?: StrainsData;
    scoreGenerator?: ScoreGenerator;
    maxScore?: ScoreInfoData;
    performanceAttributes?: PerformanceAttrsData;

    mode: number;
    clockRate: number = 1;
    previewtime: number = 0;
    beatmapContent?: string;
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
    }

    updatePPAttributes(type: 'curr' | 'fc', attributes: PerformanceAttrsData) {
        try {
            this[`${type}PPAttributes`] = {
                ppAccuracy: attributes.accuracy || 0.0,
                ppAim: attributes.aim || 0.0,
                ppDifficulty: attributes.ppDifficulty || 0.0,
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

            this.beatmap = Beatmap.parse(this.beatmapContent);
            if (this.beatmap.mode === 0 && this.beatmap.mode !== currentMode) {
                const converted = this.beatmap.convert(currentMode);
                if (!converted) {
                    wLogger.debug(
                        `%${ClientType[this.game.client]}%`,
                        `Failed to convert beatmap to mode: ${currentMode}`
                    );
                    return 'not-ready';
                }

                this.beatmap = converted;
            }

            const beatmapCheckTime = performance.now();
            const totalTime = (beatmapCheckTime - startTime).toFixed(2);
            wLogger.time(
                `%${ClientType[this.game.client]}%`,
                `Beatmap took %${totalTime}ms%`
            );

            const mods = sanitizeMods(currentMods.array).map((r) => r.acronym);
            if (this.game.client !== ClientType.lazer) {
                // Add classic mod if client is not on lazer.
                mods.push('CL');
            }

            const gradual =
                this.beatmap.createGradualDifficultyCalculator(mods);
            gradual.skipToEnd();
            this.difficultyAttributes = gradual.createDifficultyAttrs();
            this.diffStrains = gradual.getCurrentStrains();
            const difficulty = this.difficultyAttributes.getData();

            // TODO:: gamemodes except std calculate accuracy without using provided one, needs workaround
            this.scoreGenerator = this.beatmap.createScoreGenerator(mods);
            this.maxScore = this.scoreGenerator.createPerfectScore();

            this.performanceAttributes = this.beatmap.calculatePerformance(
                this.difficultyAttributes,
                this.maxScore
            );
            this.clockRate = currentMods.rate;

            if (config.calculatePP) {
                const ppAcc: {
                    [key: string]: number;
                } = {};
                for (const acc of [
                    100, 99, 98, 97, 96, 95, 94, 93, 92, 91, 90
                ]) {
                    const data = this.beatmap.calculatePerformance(
                        this.difficultyAttributes,
                        {
                            ...this.maxScore,
                            accuracy: acc / 100
                        }
                    );

                    ppAcc[acc] = fixDecimals(data.pp);
                }
                this.ppAcc = ppAcc as any;
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
                        parseMetadata: true
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

            const originalDifficulty = this.beatmap.getBeatmapDifficulty([]);
            const convertedDifficulty = this.beatmap.getBeatmapDifficulty(mods);
            this.calculatedMapAttributes = {
                ar: originalDifficulty.approachRate,
                arConverted: convertedDifficulty.approachRate,
                cs: originalDifficulty.circleSize,
                csConverted: convertedDifficulty.circleSize,
                od: originalDifficulty.overallDifficulty,
                odConverted: convertedDifficulty.overallDifficulty,
                hp: originalDifficulty.drainRate,
                hpConverted: convertedDifficulty.drainRate,
                circles: this.lazerBeatmap.hittable,
                sliders: this.lazerBeatmap.slidable,
                spinners: this.lazerBeatmap.spinnable,
                holds: this.lazerBeatmap.holdable,
                maxCombo: difficulty.maxCombo,
                fullStars: difficulty.stars,
                stars: difficulty.stars,
                aim: difficulty.aim,
                speed: difficulty.speed,
                flashlight: difficulty.flashlight,
                sliderFactor: difficulty.sliderFactor,
                stamina: difficulty.stamina,
                rhythm: difficulty.rhythm,
                color: difficulty.color,
                reading: difficulty.reading,
                hitWindow: HitWindows.getGreatHitWindow(
                    this.beatmap.mode,
                    convertedDifficulty.overallDifficulty
                )
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
    updateGraph() {
        if (this.diffStrains === undefined || this.beatmap === undefined)
            return;
        try {
            const { menu } = this.game.getServices(['menu']);

            const resultStrains: BeatmapStrains = {
                series: [],
                xaxis: []
            };

            let oldStrains: number[] = [];

            let strainsAmount = 0;
            switch (this.beatmap.mode) {
                case 0:
                    strainsAmount = this.diffStrains.aim.length || 0;
                    break;

                case 1:
                    strainsAmount = this.diffStrains.color.length || 0;
                    break;

                case 2:
                    strainsAmount = this.diffStrains.movement.length || 0;
                    break;

                case 3:
                    strainsAmount = this.diffStrains.strains.length || 0;
                    break;
            }

            // Current lazer impl hardcodes each sections to 400
            const sectionOffsetTime = 400;
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

            switch (this.beatmap.mode) {
                case 0:
                    updateWithOffset('aim', this.diffStrains.aim);
                    // TODO:: remove aimNoSliders
                    updateWithOffset('aimNoSliders', new Float64Array());
                    updateWithOffset('flashlight', this.diffStrains.flashlight);
                    updateWithOffset('speed', this.diffStrains.speed);

                    oldStrains = Array.from(this.diffStrains.aim);
                    break;
                case 1:
                    updateWithOffset('color', this.diffStrains.color);
                    updateWithOffset('rhythm', this.diffStrains.rhythm);
                    updateWithOffset('stamina', this.diffStrains.stamina);

                    oldStrains = Array.from(this.diffStrains.color);
                    break;
                case 2:
                    updateWithOffset('movement', this.diffStrains.movement);

                    oldStrains = Array.from(this.diffStrains.movement);
                    break;
                case 3:
                    updateWithOffset('strains', this.diffStrains.strains);

                    oldStrains = Array.from(this.diffStrains.strains);
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

    @measureTime
    updateEditorPP() {
        try {
            if (
                !this.beatmap ||
                !this.beatmapContent ||
                !this.performanceAttributes ||
                !this.scoreGenerator ||
                !this.lazerBeatmap
            ) {
                return;
            }

            const startTime = performance.now();

            const { global } = this.game.getServices(['global']);

            const beatmapParseTime = performance.now();
            const totalTime = (beatmapParseTime - startTime).toFixed(2);
            wLogger.time(
                `%${ClientType[this.game.client]}%`,
                `Beatmap parsing for editor PP took %${totalTime}ms%`
            );

            const passedObjects = this.lazerBeatmap.hitObjects.findLastIndex(
                (r) => r.startTime <= global.playTime
            );

            const mods = this.game.client !== ClientType.lazer ? ['CL'] : [];
            const diffCalc =
                this.beatmap.createGradualDifficultyCalculator(mods);
            diffCalc.skip(passedObjects);

            const diffAttrs = diffCalc.createDifficultyAttrs();
            const diffData = diffAttrs.getData();
            const curPerformance = this.beatmap.calculatePerformance(
                diffAttrs,
                this.scoreGenerator.createPartialPerfectScore(passedObjects + 1)
            );

            this.currAttributes.pp = curPerformance.pp;
            this.currAttributes.stars =
                passedObjects === 0 ? 0 : diffData.stars;

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
