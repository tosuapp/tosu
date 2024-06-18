import { Beatmap, Calculator } from '@kotrikd/rosu-pp';
import { config, wLogger } from '@tosu/common';
import fs from 'fs';
import { Beatmap as ParsedBeatmap } from 'osu-classes';
import { BeatmapDecoder } from 'osu-parsers';
import path from 'path';

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
    beatmap?: Beatmap;
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
            const startTime = performance.now();

            const { menuData, allTimesData } = this.osuInstance.getServices([
                'menuData',
                'allTimesData',
                'beatmapPpData'
            ]);

            const mapPath = path.join(
                allTimesData.SongsFolder,
                menuData.Folder,
                menuData.Path
            );

            try {
                this.beatmapContent = fs.readFileSync(mapPath, 'utf8');
            } catch (error) {
                wLogger.debug(
                    `BPPD(updateMapMetadata) Can't get map: ${mapPath}`
                );
                return;
            }

            this.beatmap = new Beatmap({ content: this.beatmapContent });

            const beatmapCheckTime = performance.now();
            const totalTime = (beatmapCheckTime - startTime).toFixed(2);
            wLogger.debug(
                `BPPD(updateMapMetadata) [${totalTime}ms] Spend on opening beatmap`
            );

            const calc = new Calculator({
                mods: currentMods,
                mode: menuData.MenuGameMode
            });

            const strains = calc.strains(this.beatmap);
            const mapAttributes = calc.mapAttributes(this.beatmap);
            const fcPerformance = calc.performance(this.beatmap);

            const ppAcc = {};
            for (const acc of [100, 99, 98, 97, 96, 95]) {
                const performance = calc.acc(acc).performance(this.beatmap);
                ppAcc[acc] = fixDecimals(performance.pp);
            }

            const calculationTime = performance.now();
            wLogger.debug(
                `BPPD(updateMapMetadata) [${(
                    calculationTime - beatmapCheckTime
                ).toFixed(2)}ms] Spend on attributes & strains calculation`
            );

            const resultStrains: BeatmapStrains = {
                series: [],
                xaxis: []
            };

            let oldStrains: number[] = [];

            let lazerBeatmap: ParsedBeatmap;
            try {
                const decoder = new BeatmapDecoder();

                lazerBeatmap = decoder.decodeFromString(this.beatmapContent, {
                    parseEvents: true,
                    parseTimingPoints: true,

                    parseColours: false,
                    parseDifficulty: false,
                    parseEditor: false,
                    parseGeneral: false,
                    parseStoryboard: false,
                    parseMetadata: false
                });

                const { bpm, bpmMin, bpmMax } = lazerBeatmap;

                if (
                    lazerBeatmap.events.backgroundPath !==
                    menuData.BackgroundFilename
                ) {
                    menuData.BackgroundFilename =
                        lazerBeatmap.events.backgroundPath || '';
                }

                this.updateBPM(
                    bpm * mapAttributes.clockRate,
                    bpmMin * mapAttributes.clockRate,
                    bpmMax * mapAttributes.clockRate
                );

                const firstObj = Math.round(
                    lazerBeatmap.hitObjects.at(0)?.startTime ?? 0
                );
                const full = Math.round(lazerBeatmap.totalLength);

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

            const offset = strains.sectionLength;
            const firstObj = this.timings.firstObj / mapAttributes.clockRate;
            const lastObj = this.timings.full / mapAttributes.clockRate;
            const mp3Length = menuData.MP3Length / mapAttributes.clockRate;

            const beatmapParseTime = performance.now();
            wLogger.debug(
                `BPPD(updateMapMetadata) [${(
                    beatmapParseTime - calculationTime
                ).toFixed(2)}ms] Spend on parsing beatmap`
            );

            const LEFT_OFFSET = Math.floor(firstObj / offset);
            const RIGHT_OFFSET =
                mp3Length >= lastObj
                    ? Math.ceil((mp3Length - lastObj) / offset)
                    : 0;

            const updateWithOffset = (name: string, values: number[]) => {
                let data: number[] = [];

                if (Number.isFinite(LEFT_OFFSET) && LEFT_OFFSET > 0) {
                    data = Array(LEFT_OFFSET).fill(-100);
                }

                data = data.concat(values);

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

                    oldStrains.push(...strains.aim);
                    break;
                case 1:
                    updateWithOffset('color', strains.color);
                    updateWithOffset('rhythm', strains.rhythm);
                    updateWithOffset('stamina', strains.stamina);

                    oldStrains.push(...strains.color);
                    break;
                case 2:
                    updateWithOffset('movement', strains.movement);

                    oldStrains.push(...strains.movement);
                    break;
                case 3:
                    updateWithOffset('strains', strains.strains);

                    oldStrains.push(...strains.strains);
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

            const graphProcessTime = performance.now();
            wLogger.debug(
                `BPPD(updateMapMetadata) [${(
                    graphProcessTime - beatmapParseTime
                ).toFixed(2)}ms] Spend on prcoessing graph strains`
            );

            for (let i = 0; i < LEFT_OFFSET; i++) {
                resultStrains.xaxis.push(i * offset);
            }

            const total =
                resultStrains.series[0].data.length -
                LEFT_OFFSET -
                RIGHT_OFFSET;
            for (let i = 0; i < total; i++) {
                resultStrains.xaxis.push(firstObj + i * offset);
            }

            for (let i = 0; i < RIGHT_OFFSET; i++) {
                resultStrains.xaxis.push(lastObj + i * offset);
            }

            const endTime = performance.now();
            wLogger.debug(
                `BPPD(updateMapMetadata) [${(endTime - startTime).toFixed(
                    2
                )}ms] Total spent time`
            );

            this.updatePPData(oldStrains, resultStrains, ppAcc as never, {
                ar: mapAttributes.ar,
                cs: mapAttributes.cs,
                od: mapAttributes.od,
                hp: mapAttributes.hp,
                circles: lazerBeatmap.hittable,
                sliders: lazerBeatmap.slidable,
                spinners: lazerBeatmap.spinnable,
                holds: lazerBeatmap.holdable,
                maxCombo: fcPerformance.difficulty.maxCombo,
                fullStars: fcPerformance.difficulty.stars,
                stars: fcPerformance.difficulty.stars,
                aim: (fcPerformance.difficulty as any).aim,
                speed: (fcPerformance.difficulty as any).speed,
                flashlight: (fcPerformance.difficulty as any).flashlight,
                sliderFactor: (fcPerformance.difficulty as any).sliderFactor,
                stamina: (fcPerformance.difficulty as any).stamina,
                rhythm: (fcPerformance.difficulty as any).rhythm,
                color: (fcPerformance.difficulty as any).color,
                peak: (fcPerformance.difficulty as any).peak,
                hitWindow: (fcPerformance.difficulty as any).hitWindow
            });

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
            if (!this.beatmap || !this.beatmapContent) {
                return;
            }

            const startTime = performance.now();

            const { allTimesData } = this.osuInstance.getServices([
                'allTimesData'
            ]);

            const decoder = new BeatmapDecoder().decodeFromString(
                this.beatmapContent,
                {
                    parseHitObjects: true,

                    parseColours: false,
                    parseDifficulty: false,
                    parseEditor: false,
                    parseEvents: true,
                    parseGeneral: false,
                    parseMetadata: false,
                    parseStoryboard: false,
                    parseTimingPoints: false
                }
            );

            const beatmapParseTime = performance.now();
            const totalTime = (beatmapParseTime - startTime).toFixed(2);
            wLogger.debug(
                `(updateEditorPP) Spend:${totalTime}ms on beatmap parsing`
            );

            const passedObjects = decoder.hitObjects.filter(
                (r) => r.startTime <= allTimesData.PlayTime
            );

            const curPerformance = new Calculator({
                passedObjects: passedObjects.length
            }).performance(this.beatmap);

            const calculateTime = performance.now();

            this.currAttributes.pp = curPerformance.pp;

            wLogger.debug(
                `(updateEditorPP) Spend:${(
                    calculateTime - beatmapParseTime
                ).toFixed(2)}ms on calculating performance`
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
