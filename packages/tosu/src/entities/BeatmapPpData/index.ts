import { Beatmap, Calculator } from '@kotrikd/rosu-pp';
import { Beatmap as ParsedBeatmap } from 'osu-classes';
import { BeatmapDecoder } from 'osu-parsers';
import path from 'path';

import { BeatmapStrains } from '@/api/types';
import { config } from '@/config';
import { DataRepo } from '@/entities/DataRepoList';
import { wLogger } from '@/logger';

import { AbstractEntity } from '../AbstractEntity';

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
    strains: number[];
    strainsAll: BeatmapStrains;
    commonBPM: number;
    minBPM: number;
    maxBPM: number;
    ppAcc: BeatmapPPAcc;
    calculatedMapAttributes: BeatmapPPAttributes;
    currAttributes: BeatmapPPCurrentAttributes;
    timings: BeatmapPPTimings;

    constructor(services: DataRepo) {
        super(services);

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
            '100': 0.0,
            '99': 0.0,
            '98': 0.0,
            '97': 0.0,
            '96': 0.0,
            '95': 0.0
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
            stars: 0.0
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
        wLogger.debug(
            `maxPP -> ${this.currAttributes.maxThisPlayPP} pp -> ${pp} stars -> ${stars}`
        );
        const maxThisPlayPP =
            pp > this.currAttributes.maxThisPlayPP
                ? pp
                : this.currAttributes.maxThisPlayPP;

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
            fcPP: fcPP
        };
    }

    updateBPM(commonBPM: number, minBPM: number, maxBPM: number) {
        this.commonBPM = commonBPM;
        this.minBPM = minBPM;
        this.maxBPM = maxBPM;
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

    async updateMapMetadata(currentMods: number) {
        const start_time = performance.now();

        const { menuData, settings } = this.services.getServices([
            'menuData',
            'settings',
            'beatmapPpData'
        ]);

        const mapPath = path.join(
            settings.songsFolder,
            menuData.Folder,
            menuData.Path
        );
        let beatmap: Beatmap;
        try {
            beatmap = new Beatmap({
                path: mapPath,
                ar: menuData.AR,
                od: menuData.OD,
                cs: menuData.CS,
                hp: menuData.HP
            });
        } catch (_) {
            wLogger.debug("can't get map");
            return;
        }

        const beatmap_check_time = performance.now();
        wLogger.debug(
            `(updateMapMetadata) Spend:${(
                beatmap_check_time - start_time
            ).toFixed(2)}ms on opening beatmap`
        );

        const calc = new Calculator();

        const currAttrs = calc.mods(currentMods).mode(menuData.MenuGameMode);
        const strains = currAttrs.strains(beatmap);
        const mapAttributes = currAttrs.acc(100).mapAttributes(beatmap);
        const fcPerformance = currAttrs.acc(100).performance(beatmap);

        const ppAcc = {};

        for (const acc of [100, 99, 98, 97, 96, 95]) {
            const performance = currAttrs.acc(acc).performance(beatmap);
            ppAcc[acc] = performance.pp;
        }

        const calculation_time = performance.now();
        wLogger.debug(
            `(updateMapMetadata) Spend:${(
                calculation_time - beatmap_check_time
            ).toFixed(2)}ms on attributes & starins calculation`
        );

        const resultStrains: BeatmapStrains = {
            series: [],
            xaxis: []
        };

        let oldStrains: number[] = [];

        const offset: number = strains.sectionLength;

        let lazerBeatmap: ParsedBeatmap;

        try {
            const decoder = new BeatmapDecoder();

            lazerBeatmap = await decoder.decodeFromPath(mapPath, {
                parseColours: false,
                parseDifficulty: false,
                parseEditor: false,
                parseEvents: false,
                parseGeneral: false,
                parseMetadata: false
            });

            const { bpm, bpmMin, bpmMax } = lazerBeatmap;

            this.updateBPM(bpm, bpmMin, bpmMax);

            const firstObj = Math.round(
                lazerBeatmap.hitObjects.at(0)?.startTime ?? 0
            );
            const full = Math.round(lazerBeatmap.totalLength);

            this.updateTimings(firstObj, full);
        } catch (e) {
            console.error(e);
            wLogger.error(
                "Something happend, when we're tried to parse beatmap"
            );
            return;
        }

        const beatmap_parse_time = performance.now();
        wLogger.debug(
            `(updateMapMetadata) Spend:${(
                beatmap_parse_time - calculation_time
            ).toFixed(2)}ms on parsing beatmap`
        );

        const LEFT_OFFSET = Math.floor(this.timings.firstObj / offset);
        const RIGHT_OFFSET =
            menuData.MP3Length > this.timings.full
                ? Math.ceil((menuData.MP3Length - this.timings.full) / offset)
                : 0;

        const updateWithOffset = (name: string, values: number[]) => {
            let data: number[] = [];

            if (Number.isFinite(LEFT_OFFSET) && LEFT_OFFSET > 0)
                data = Array(LEFT_OFFSET).fill(-100);
            data = data.concat(values);
            if (Number.isFinite(RIGHT_OFFSET) && RIGHT_OFFSET > 0)
                data = data.concat(Array(RIGHT_OFFSET).fill(-100));

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

        const graph_process_time = performance.now();
        wLogger.debug(
            `(updateMapMetadata) Spend:${(
                graph_process_time - beatmap_parse_time
            ).toFixed(2)}ms on prcoessing graph strains`
        );

        for (let i = 0; i < LEFT_OFFSET; i++) {
            resultStrains.xaxis.push(i * offset);
        }

        const amount = Math.ceil(this.timings.full / offset);
        for (let i = 0; i < amount; i++) {
            resultStrains.xaxis.push(this.timings.firstObj + i * offset);
        }

        for (let i = 0; i < RIGHT_OFFSET; i++) {
            resultStrains.xaxis.push(this.timings.full + i * offset);
        }

        const end_time = performance.now();
        wLogger.debug(
            `(updateMapMetadata) Total elapsed time: ${(
                end_time - start_time
            ).toFixed(2)}ms`
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
            stars: fcPerformance.difficulty.stars
        });
    }
}
