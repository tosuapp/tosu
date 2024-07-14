import { config, wLogger } from '@tosu/common';
import fs from 'fs';
import { Beatmap as ParsedBeatmap } from 'osu-classes';
import { BeatmapDecoder } from 'osu-parsers';
import path from 'path';
import rosu from 'rosu-pp-js';

import { BeatmapStrains } from '@/api/types/v1';
import { AbstractEntity } from '@/entities/AbstractEntity';
import { OsuInstance } from '@/objects/instanceManager/osuInstance';
import { fixDecimals } from '@/utils/converters';

interface BeatmapPPAcc {
    '100': number;
    '99': number;
    '98': number;
    '97': number;
    '96': number;
    '95': number;
}

interface BeatmapPPAttributes {
    ar: number;
    cs: number;
    hp: number;
    od: number;
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
    peak?: number | undefined;
    hitWindow?: number | undefined;
}

interface BeatmapPPCurrentAttributes {
    stars: number;
    pp: number;
    fcPP: number;
    maxThisPlayPP: number;
}

interface BeatmapPPTimings {
    firstObj: number;
    full: number;
}

export class BeatmapPPData extends AbstractEntity {
    beatmap?: rosu.Beatmap;
    lazerBeatmap?: ParsedBeatmap;
    PerformanceAttributes?: rosu.PerformanceAttributes;

    Mode: number;
    beatmapContent?: string;
    strains: number[];
    strainsAll: BeatmapStrains;
    commonBPM: number;
    minBPM: number;
    maxBPM: number;
    ppAcc: BeatmapPPAcc;
    calculatedMapAttributes: BeatmapPPAttributes;
    currAttributes: BeatmapPPCurrentAttributes;
    timings: BeatmapPPTimings;

    constructor(osuInstance: OsuInstance) {
        super(osuInstance);

        this.init();
    }

    init() {
        this.strains = [];
        this.strainsAll = {
            series: [],
            xaxis: []
        };
        this.Mode = 0;
        this.commonBPM = 0.0;
        this.minBPM = 0.0;
        this.maxBPM = 0.0;
        this.ppAcc = {
            100: 0.0,
            99: 0.0,
            98: 0.0,
            97: 0.0,
            96: 0.0,
            95: 0.0
        };
        this.calculatedMapAttributes = {
            ar: 0.0,
            cs: 0.0,
            hp: 0.0,
            od: 0.0,
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
            peak: 0.0,
            hitWindow: 0.0
        };
        this.currAttributes = {
            stars: 0.0,
            pp: 0.0,
            maxThisPlayPP: 0.0,
            fcPP: 0.0
        };
        this.timings = {
            firstObj: 0,
            full: 0
        };
    }

    updatePPData(
        strains: number[],
        strainsAll: BeatmapStrains,
        ppAcc: BeatmapPPAcc,
        mapAttributes: BeatmapPPAttributes
    ) {
        this.strains = strains;
        this.strainsAll = strainsAll;
        if (config.calculatePP) {
            this.ppAcc = ppAcc;
        }
        this.calculatedMapAttributes = mapAttributes;
    }

    updateCurrentAttributes(stars: number, pp: number) {
        if (this.currAttributes.pp.toFixed(2) !== pp.toFixed(2)) {
            wLogger.debug(
                `BPPD(updateCurrentAttributes) maxPP -> ${this.currAttributes.maxThisPlayPP.toFixed(
                    2
                )} pp -> ${pp.toFixed(2)} stars -> ${stars.toFixed(2)}`
            );
        }
        const maxThisPlayPP = Math.max(pp, this.currAttributes.maxThisPlayPP);

        this.currAttributes = {
            ...this.currAttributes,
            stars,
            pp,
            maxThisPlayPP
        };
    }

    updateFcPP(fcPP: number) {
        this.currAttributes = {
            ...this.currAttributes,
            fcPP
        };
    }

    updateBPM(commonBPM: number, minBPM: number, maxBPM: number) {
        this.commonBPM = Math.round(commonBPM);
        this.minBPM = Math.round(minBPM);
        this.maxBPM = Math.round(maxBPM);
    }

    updateTimings(firstObj: number, full: number) {
        this.timings = {
            firstObj,
            full
        };
    }

    resetCurrentAttributes() {
        this.currAttributes = {
            stars: 0.0,
            pp: 0.0,
            maxThisPlayPP: 0.0,
            fcPP: 0.0
        };
    }

    getCurrentBeatmap() {
        return this.beatmap;
    }

    updateMapMetadata(currentMods: number) {
        try {
            const s1 = performance.now();
            const { menuData, allTimesData } = this.osuInstance.getServices([
                'menuData',
                'allTimesData'
            ]);

            const mapPath = path.join(
                allTimesData.SongsFolder,
                menuData.Folder,
                menuData.Path
            );

            const s2 = performance.now();
            try {
                this.beatmapContent = fs.readFileSync(mapPath, 'utf8');

                if (this.beatmap) this.beatmap.free();
                if (this.PerformanceAttributes)
                    this.PerformanceAttributes.free();
            } catch (error) {
                wLogger.debug(
                    `BPPD(updateMapMetadata) Can't get map: ${mapPath}`
                );
                return;
            }

            const s3 = performance.now();
            this.beatmap = new rosu.Beatmap(this.beatmapContent);

            const s4 = performance.now();
            wLogger.debug(
                `BPPD(updateMapMetadata) [${(s4 - s2).toFixed(2)}ms] Spend on opening beatmap`
            );

            const s5 = performance.now();
            const difficulty = new rosu.Difficulty({ mods: currentMods });

            const s6 = performance.now();
            const attributes = new rosu.BeatmapAttributesBuilder({
                map: this.beatmap,
                mods: currentMods,
                mode: menuData.MenuGameMode
            }).build();

            const s7 = performance.now();
            const strains = difficulty.strains(this.beatmap);

            const s8 = performance.now();
            const fcPerformance = new rosu.Performance({
                mods: currentMods
            }).calculate(this.beatmap);

            this.PerformanceAttributes = fcPerformance;

            const ppAcc = {};
            const s9 = performance.now();
            for (const acc of [100, 99, 98, 97, 96, 95]) {
                const calculate = new rosu.Performance({
                    mods: currentMods,
                    accuracy: acc
                }).calculate(fcPerformance);
                ppAcc[acc] = fixDecimals(calculate.pp);

                calculate.free();
            }

            const s10 = performance.now();
            wLogger.debug(
                `BPPD(updateMapMetadata) [${(s10 - s5).toFixed(2)}ms] Spend on attributes & strains calculation`
            );

            const resultStrains: BeatmapStrains = {
                series: [],
                xaxis: []
            };

            let oldStrains: number[] = [];

            const s11 = performance.now();
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
                        parseGeneral: false,
                        parseStoryboard: false,
                        parseMetadata: false
                    }
                );

                const { bpm, bpmMin, bpmMax } = this.lazerBeatmap;

                if (
                    this.lazerBeatmap.events.backgroundPath !==
                    menuData.BackgroundFilename
                ) {
                    menuData.BackgroundFilename =
                        this.lazerBeatmap.events.backgroundPath || '';
                }

                this.updateBPM(
                    bpm * attributes.clockRate,
                    bpmMin * attributes.clockRate,
                    bpmMax * attributes.clockRate
                );

                const firstObj = Math.round(
                    this.lazerBeatmap.hitObjects.at(0)?.startTime ?? 0
                );
                const full = Math.round(this.lazerBeatmap.totalLength);

                this.updateTimings(firstObj, full);

                this.resetReportCount('BPPD(updateMapMetadataTimings)');
            } catch (exc) {
                this.reportError(
                    'BPPD(updateMapMetadataTimings)',
                    10,
                    `BPPD(updateMapMetadataTimings) ${(exc as any).message}`
                );
                wLogger.debug(exc);
                return;
            }

            const s12 = performance.now();
            wLogger.debug(
                `BPPD(updateMapMetadata) [${(s12 - s11).toFixed(2)}ms] Spend on parsing beatmap`
            );

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
                this.timings.firstObj / attributes.clockRate;
            const lastObjectTime =
                firstObjectTime + strainsAmount * sectionOffsetTime;
            const mp3LengthTime = menuData.MP3Length / attributes.clockRate;

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

            const s13 = performance.now();
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

            const s14 = performance.now();
            if (Number.isFinite(LEFT_OFFSET) && LEFT_OFFSET > 0) {
                oldStrains = Array(LEFT_OFFSET).fill(0).concat(oldStrains);
            }

            if (Number.isFinite(RIGHT_OFFSET) && RIGHT_OFFSET > 0) {
                oldStrains = oldStrains.concat(Array(RIGHT_OFFSET).fill(0));
            }

            const s15 = performance.now();
            wLogger.debug(
                `BPPD(updateMapMetadata) [${(s15 - s13).toFixed(2)}ms] Spend on prcoessing graph strains`
            );

            const s16 = performance.now();
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

            const s17 = performance.now();
            this.updatePPData(oldStrains, resultStrains, ppAcc as never, {
                ar: attributes.ar,
                cs: attributes.cs,
                od: attributes.od,
                hp: attributes.hp,
                circles: this.lazerBeatmap.hittable,
                sliders: this.lazerBeatmap.slidable,
                spinners: this.lazerBeatmap.spinnable,
                holds: this.lazerBeatmap.holdable,
                maxCombo: fcPerformance.difficulty.maxCombo,
                fullStars: fcPerformance.difficulty.stars,
                stars: fcPerformance.difficulty.stars,
                aim: fcPerformance.difficulty.aim,
                speed: fcPerformance.difficulty.speed,
                flashlight: fcPerformance.difficulty.flashlight,
                sliderFactor: fcPerformance.difficulty.sliderFactor,
                stamina: fcPerformance.difficulty.stamina,
                rhythm: fcPerformance.difficulty.rhythm,
                color: fcPerformance.difficulty.color,
                peak: fcPerformance.difficulty.peak,
                hitWindow: fcPerformance.difficulty.hitWindow
            });

            this.Mode = strains.mode;

            difficulty.free();
            attributes.free();
            strains.free();

            const s18 = performance.now();
            wLogger.debug(
                `BPPD(updateMapMetadata) [${(s17 - s1).toFixed(2)}ms] Total spent time`
            );

            wLogger.timings(
                'BeatmapPPData/updateMapMetadata',
                {
                    total: s18 - s1,
                    init: s2 - s1,
                    readFile: s3 - s2,
                    rosuBeatmap: s4 - s3,
                    difficulty: s6 - s5,
                    attributes: s7 - s6,
                    strains: s8 - s7,
                    fc: s9 - s8,
                    ppAcc: s10 - s9,
                    decode: s12 - s11,
                    graph: s14 - s13,
                    oldGraph: s15 - s14,
                    offset: s17 - s16,
                    set: s18 - s17
                },
                performance.now()
            );

            this.resetReportCount('BPPD(updateMapMetadata)');
        } catch (exc) {
            this.reportError(
                'BPPD(updateMapMetadata)',
                10,
                `BPPD(updateMapMetadata) ${(exc as any).message}`
            );
            wLogger.debug(exc);
        }
    }

    updateEditorPP() {
        try {
            if (
                !this.beatmap ||
                !this.beatmapContent ||
                !this.PerformanceAttributes ||
                !this.lazerBeatmap
            ) {
                return;
            }

            const s1 = performance.now();
            const { allTimesData } = this.osuInstance.getServices([
                'allTimesData'
            ]);

            const s2 = performance.now();
            const passedObjects = this.lazerBeatmap.hitObjects.filter(
                (r) => r.startTime <= allTimesData.PlayTime
            );

            const s3 = performance.now();
            const curPerformance = new rosu.Performance({
                passedObjects: passedObjects.length
            }).calculate(this.PerformanceAttributes);

            this.currAttributes.pp = curPerformance.pp;
            this.currAttributes.stars =
                passedObjects.length === 0
                    ? 0
                    : curPerformance.difficulty.stars;

            const s4 = performance.now();
            curPerformance.free();

            const s5 = performance.now();
            wLogger.debug(
                `(updateEditorPP) Spend:${(s4 - s3).toFixed(2)}ms on calculating performance`
            );

            wLogger.timings(
                'BeatmapPPData/updateEditorPP',
                {
                    total: s5 - s1,
                    get: s2 - s1,
                    filter: s3 - s2,
                    calc: s4 - s3,
                    free: s5 - s4
                },
                performance.now()
            );

            this.resetReportCount('BPPD(updateEditorPP)');
        } catch (exc) {
            this.reportError(
                'BPPD(updateEditorPP)',
                10,
                `BPPD(updateEditorPP) ${(exc as any).message}`
            );
            wLogger.debug(exc);
        }
    }
}
