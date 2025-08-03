import rosu, { HitResultPriority } from '@kotrikd/rosu-pp';
import { ClientType, config, measureTime, wLogger } from '@tosu/common';
import fs from 'fs';
import { HitType, Beatmap as ParsedBeatmap, TimingPoint } from 'osu-classes';
import { BeatmapDecoder } from 'osu-parsers';

import { BeatmapStrains } from '@/api/types/v1';
import { AbstractInstance } from '@/instances';
import { AbstractState } from '@/states';
import { cleanPath, fixDecimals } from '@/utils/converters';
import { removeDebuffMods } from '@/utils/osuMods';
import { CalculateMods, ModsLazer } from '@/utils/osuMods.types';

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

    beatmap?: rosu.Beatmap;
    lazerBeatmap?: ParsedBeatmap;
    performanceAttributes?: rosu.PerformanceAttributes;

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

    updatePPAttributes(
        type: 'curr' | 'fc' | 'maxAchievable',
        attributes: rosu.PerformanceAttributes
    ) {
        try {
            if (type !== 'curr' && type !== 'fc' && type !== 'maxAchievable')
                return;

            this[`${type}PPAttributes`] = {
                ppAccuracy: attributes.ppAccuracy || 0.0,
                ppAim: attributes.ppAim || 0.0,
                ppDifficulty: attributes.ppDifficulty || 0.0,
                ppFlashlight: attributes.ppFlashlight || 0.0,
                ppSpeed: attributes.ppSpeed || 0.0
            };
        } catch (exc) {
            wLogger.error(
                ClientType[this.game.client],
                this.game.pid,
                `beatmapPP updatePPAttributes(${type})`,
                (exc as Error).message
            );
            wLogger.debug(
                ClientType[this.game.client],
                this.game.pid,
                `beatmapPP updatePPAttributes(${type})`,
                exc
            );
        }
    }

    updateCurrentAttributes(stars: number, pp: number) {
        const maxAchieved = Math.max(pp, this.currAttributes.maxAchieved);

        if (this.currAttributes.pp.toFixed(2) !== pp.toFixed(2)) {
            wLogger.debug(
                ClientType[this.game.client],
                this.game.pid,
                `beatmapPP updateCurrentAttributes`,
                `maxAchieved -> ${this.currAttributes.maxAchieved.toFixed(2)} | currentPP -> ${pp.toFixed(2)} | stars -> ${stars.toFixed(2)}`
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
                    ClientType[this.game.client],
                    this.game.pid,
                    `beatmapPP updateMapMetadata`,
                    `Skip osu! music theme file`,
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
                    ClientType[this.game.client],
                    this.game.pid,
                    `beatmapPP updateMapMetadata`,
                    `Skip new map creation`,
                    {
                        SongsFolder: global.songsFolder,
                        Folder: menu.folder,
                        Path: menu.filename
                    }
                );
                return;
            }

            const mapPath = cleanPath(
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
                    if (this.beatmap) this.beatmap.free();
                } catch (exc) {
                    this.beatmap = undefined;
                    wLogger.debug(
                        ClientType[this.game.client],
                        this.game.pid,
                        `beatmapPP updateMapMetadata`,
                        `unable to free beatmap`,
                        exc
                    );
                }

                try {
                    if (this.performanceAttributes)
                        this.performanceAttributes.free();
                } catch (exc) {
                    this.performanceAttributes = undefined;
                    wLogger.debug(
                        ClientType[this.game.client],
                        this.game.pid,
                        `beatmapPP updateMapMetadata`,
                        `unable to free PerformanceAttributes`,
                        exc
                    );
                }
            } catch (error) {
                wLogger.debug(
                    ClientType[this.game.client],
                    this.game.pid,
                    `beatmapPP updateMapMetadata`,
                    `Can't get map`,
                    {
                        mapPath,
                        currentMods: currentMods.array,
                        currentMode
                    },
                    (error as Error).stack
                );
                return 'not-ready';
            }

            this.beatmap = new rosu.Beatmap(this.beatmapContent);
            if (this.beatmap.mode === 0 && this.beatmap.mode !== currentMode)
                this.beatmap.convert(currentMode);

            const beatmapCheckTime = performance.now();
            const totalTime = (beatmapCheckTime - startTime).toFixed(2);
            wLogger.time(
                `[${ClientType[this.game.client]}]`,
                this.game.pid,
                `beatmapPP.updateMapMetadata`,
                `[${totalTime}ms] Spend on opening beatmap`
            );

            const commonParams = {
                mods: removeDebuffMods(currentMods.array),
                lazer: this.game.client === ClientType.lazer
            };

            const attributes = new rosu.BeatmapAttributesBuilder({
                isConvert:
                    this.beatmap.mode === 0 &&
                    this.beatmap.mode !== currentMode,
                map: this.beatmap,
                mods: removeDebuffMods(currentMods.array),
                mode: currentMode
            }).build();

            this.performanceAttributes = new rosu.Performance(
                commonParams
            ).calculate(this.beatmap);
            this.clockRate = currentMods.rate;

            if (config.calculatePP) {
                const ppAcc = {};
                for (const acc of [
                    100, 99, 98, 97, 96, 95, 94, 93, 92, 91, 90
                ]) {
                    const calculate = new rosu.Performance({
                        mods: removeDebuffMods(currentMods.array),
                        accuracy: acc,
                        lazer: this.game.client === ClientType.lazer,
                        hitresultPriority: HitResultPriority.Fastest
                    }).calculate(this.performanceAttributes);
                    ppAcc[acc] = fixDecimals(calculate.pp);

                    calculate.free();
                }

                this.ppAcc = ppAcc as any;
            }

            const calculationTime = performance.now();
            wLogger.time(
                `[${ClientType[this.game.client]}]`,
                this.game.pid,
                `beatmapPP.updateMapMetadata`,
                `[${(calculationTime - beatmapCheckTime).toFixed(2)}ms] Spend on attributes & strains calculation`
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
                    cleanPath(this.lazerBeatmap.events.backgroundPath || '') !==
                        menu.backgroundFilename &&
                    !lazerBypass
                ) {
                    menu.backgroundFilename = cleanPath(
                        this.lazerBeatmap.events.backgroundPath || ''
                    );
                }

                this.previewtime = this.lazerBeatmap.general.previewTime;

                this.commonBPM = Math.round(bpm * this.clockRate);
                this.minBPM = Math.round(bpmMin * this.clockRate);
                this.maxBPM = Math.round(bpmMax * this.clockRate);

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
                    if (point.kiai === false && kiais.length > 0) {
                        kiais[kiais.length - 1].end = point.startTime;
                        continue;
                    }

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
                    ClientType[this.game.client],
                    this.game.pid,
                    `beatmapPP updateMapMetadata`,
                    exc
                );
                return;
            }

            const beatmapParseTime = performance.now();
            wLogger.time(
                `[${ClientType[this.game.client]}]`,
                this.game.pid,
                `beatmapPP.updateMapMetadata`,
                `[${(beatmapParseTime - calculationTime).toFixed(2)}ms] Spend on parsing beatmap`
            );

            this.calculatedMapAttributes = {
                ar: this.beatmap.ar,
                arConverted: attributes.ar,
                cs: this.beatmap.cs,
                csConverted: attributes.cs,
                od: this.beatmap.od,
                odConverted: attributes.od,
                hp: this.beatmap.hp,
                hpConverted: attributes.hp,
                circles: this.lazerBeatmap.hittable,
                sliders: this.lazerBeatmap.slidable,
                spinners: this.lazerBeatmap.spinnable,
                holds: this.lazerBeatmap.holdable,
                maxCombo: this.performanceAttributes.difficulty.maxCombo,
                fullStars: this.performanceAttributes.difficulty.stars,
                stars: this.performanceAttributes.difficulty.stars,
                aim: this.performanceAttributes.difficulty.aim,
                speed: this.performanceAttributes.difficulty.speed,
                flashlight: this.performanceAttributes.difficulty.flashlight,
                sliderFactor:
                    this.performanceAttributes.difficulty.sliderFactor,
                stamina: this.performanceAttributes.difficulty.stamina,
                rhythm: this.performanceAttributes.difficulty.rhythm,
                color: this.performanceAttributes.difficulty.color,
                reading: this.performanceAttributes.difficulty.reading,
                hitWindow: this.performanceAttributes.difficulty.greatHitWindow
            };

            attributes.free();

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
                ClientType[this.game.client],
                this.game.pid,
                `beatmapPP updateMapMetadata`,
                exc
            );
        }
    }

    @measureTime
    updateGraph(currentMods: ModsLazer) {
        if (this.beatmap === undefined) return;
        try {
            const { menu } = this.game.getServices(['menu']);

            const resultStrains: BeatmapStrains = {
                series: [],
                xaxis: []
            };

            const difficulty = new rosu.Difficulty({
                mods: removeDebuffMods(currentMods),
                lazer: this.game.client === ClientType.lazer
            });
            const strains = difficulty.strains(this.beatmap);

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
                ClientType[this.game.client],
                this.game.pid,
                `beatmapPP updateGraph`,
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
                !this.lazerBeatmap
            ) {
                return;
            }

            const startTime = performance.now();

            const { global } = this.game.getServices(['global']);

            const beatmapParseTime = performance.now();
            const totalTime = (beatmapParseTime - startTime).toFixed(2);
            wLogger.time(
                `[${ClientType[this.game.client]}]`,
                this.game.pid,
                `beatmapPP.updateEditorPP`,
                `${totalTime}ms Spend on beatmap parsing`
            );

            const passedObjects = this.lazerBeatmap.hitObjects.filter(
                (r) => r.startTime <= global.playTime
            );

            const curPerformance = new rosu.Performance({
                passedObjects: passedObjects.length,
                lazer: this.game.client === ClientType.lazer
            }).calculate(this.performanceAttributes);

            this.currAttributes.pp = curPerformance.pp;
            this.currAttributes.stars =
                passedObjects.length === 0
                    ? 0
                    : curPerformance.difficulty.stars;

            curPerformance.free();

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
                ClientType[this.game.client],
                this.game.pid,
                `beatmapPP updateEditorPP`,
                exc
            );
        }
    }

    updateEventsStatus(ms: number, multiply: number) {
        if (!this.lazerBeatmap) return;

        const bpm =
            this.lazerBeatmap.controlPoints.timingPoints
                // @ts-expect-error
                .toReversed()
                .find((r) => r.startTime <= ms && r.bpm !== 0)?.bpm ||
            this.lazerBeatmap.controlPoints.timingPoints[0]?.bpm ||
            0.0;

        this.realtimeBPM = Math.round(bpm * multiply);

        this.isKiai = this.kiais.some((r) => ms >= r.start && ms <= r.end);
        this.isBreak = this.breaks.some((r) => ms >= r.start && ms <= r.end);
    }
}
