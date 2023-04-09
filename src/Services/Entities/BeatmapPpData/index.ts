import { BeatmapDecoder } from 'osu-parsers';
import path from 'path';
import { Beatmap, Calculator } from 'rosu-pp';

import { DataRepo } from '@/Services/repo';
import { config } from '@/config';
import { wLogger } from '@/logger';

import { AbstractEntity } from '../types';

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
        ppAcc: BeatmapPPAcc,
        mapAttributes: BeatmapPPAttributes
    ) {
        this.strains = strains;
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
        const { menuData, settings } = this.services.getServices([
            'menuData',
            'settings'
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

        const calc = new Calculator();

        const currAttrs = calc.mods(currentMods);
        const strains = currAttrs.strains(beatmap);
        const mapAttributes = currAttrs.acc(100).mapAttributes(beatmap);
        const fcPerformance = currAttrs.acc(100).performance(beatmap);

        const ppAcc = {};

        for (const acc of [100, 99, 98, 97, 96, 95]) {
            const performance = currAttrs.acc(acc).performance(beatmap);
            ppAcc[acc] = performance.pp;
        }

        const resultStrains: number[] = [];
        switch (strains.mode) {
            case 0:
                resultStrains.push(...strains.aimNoSliders);
                break;
            case 1:
                resultStrains.push(...strains.color);
                break;
            case 2:
                resultStrains.push(...strains.movement);
                break;
            case 3:
                resultStrains.push(...strains.strains);
                break;
            default:
            // no-default
        }

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

        this.updatePPData(resultStrains, ppAcc as never, {
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
