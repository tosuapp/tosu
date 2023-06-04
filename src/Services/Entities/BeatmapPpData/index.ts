import { BeatmapDecoder } from 'osu-parsers';
import path from 'path';
import { Beatmap, Calculator } from 'rosu-pp';

import { DataRepo } from '@/Services/repo';
import { config } from '@/config';
import { wLogger } from '@/logger';

import { AbstractEntity } from '../types';
import { BeatmapStrains } from '@/Api/Utils/types';

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
            xaxis: [],
        };
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

    updateBPM(minBPM: number, maxBPM: number) {
        this.minBPM = minBPM;
        this.maxBPM = maxBPM;
    }

    updateTimings(firstObj: number, full: number) {
        this.timings = {
            firstObj,
            full
        };
    }

    async updateMapMetadata(currentMods: number) {
        const start = performance.now();

        const { menuData, settings, beatmapPpData } = this.services.getServices([
            'menuData',
            'settings',
            'beatmapPpData',
        ]);

        const mapPath = path.join(
            settings.songsFolder,
            menuData.Folder,
            menuData.Path
        );
        let beatmap;
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

        const end_check = performance.now();

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

        const end_calc = performance.now();

        const resultStrains: BeatmapStrains = {
            series: [],
            xaxis: [],
        };
        let oldStrains: number[] = [];

        const offset: number = strains.sectionLength;
        try {
            const decoder = new BeatmapDecoder();
            const lazerBeatmap = await decoder.decodeFromPath(mapPath);
            this.updateBPM(lazerBeatmap.bpmMin, lazerBeatmap.bpmMax);

            const firstObj =
                lazerBeatmap.hitObjects.length > 0
                    ? Math.round(lazerBeatmap.hitObjects.at(0)!.startTime)
                    : 0;
            const full = Math.round(lazerBeatmap.totalLength);

            this.updateTimings(firstObj, full);
        } catch (e) {
            console.error(e);
            wLogger.error(
                "Something happend, when we're tried to parse beatmap"
            );
        }

        const end_parse = performance.now();

        const LEFT_OFFSET = Math.floor(beatmapPpData.timings.firstObj / offset);
        const RIGHT_OFFSET =
            menuData.MP3Length > beatmapPpData.timings.full
                ? Math.ceil((menuData.MP3Length - beatmapPpData.timings.full) / offset)
                : 0;



        console.log(LEFT_OFFSET, RIGHT_OFFSET);


        const updateWithOffset = (name: string, values: number[]) => {
            let data: number[] = [];


            if (Number.isFinite(LEFT_OFFSET) && LEFT_OFFSET > 0) data = Array(LEFT_OFFSET).fill(-100);
            data = data.concat(values);
            if (Number.isFinite(RIGHT_OFFSET) && RIGHT_OFFSET > 0) data = data.concat(Array(RIGHT_OFFSET).fill(-100));


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

        if (Number.isFinite(LEFT_OFFSET) && LEFT_OFFSET > 0)
            oldStrains = Array(LEFT_OFFSET).fill(0).concat(oldStrains);
        if (Number.isFinite(RIGHT_OFFSET) && RIGHT_OFFSET > 0)
            oldStrains = oldStrains.concat(Array(RIGHT_OFFSET).fill(0));

        const end_graph = performance.now();


        for (let i = 0; i < LEFT_OFFSET; i++) {
            resultStrains.xaxis.push(i * offset);
        };

        const amount = Math.ceil(beatmapPpData.timings.full / offset);
        for (let i = 0; i < amount; i++) {
            resultStrains.xaxis.push(beatmapPpData.timings.firstObj + (i * offset));
        };

        for (let i = 0; i < RIGHT_OFFSET; i++) {
            resultStrains.xaxis.push(beatmapPpData.timings.full + (i * offset));
        };

        const end_time = performance.now();

        console.log((end_check - start).toFixed(2) + 'ms', 'spend on check conditions');
        console.log((end_calc - end_check).toFixed(2) + 'ms', 'spend on calc pp and strains');
        console.log((end_parse - end_calc).toFixed(2) + 'ms', 'spend on parse beatmap');
        console.log((end_graph - end_parse).toFixed(2) + 'ms', 'spend on graph sorting');
        console.log((end_time - end_graph).toFixed(2) + 'ms', 'spend on time calculation');
        console.log('\n\n');




        this.updatePPData(oldStrains, resultStrains, ppAcc as never, {
            ar: mapAttributes.ar,
            cs: mapAttributes.cs,
            od: mapAttributes.od,
            hp: mapAttributes.hp,
            maxCombo: fcPerformance.difficulty.maxCombo,
            fullStars: fcPerformance.difficulty.stars,
            stars: fcPerformance.difficulty.stars
        });
    }
}
