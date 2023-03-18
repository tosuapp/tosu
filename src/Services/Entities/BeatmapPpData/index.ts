import { DataRepo } from "@/Services/repo";

interface BeatmapPPAcc {
    "100": number;
    "99": number;
    "98": number;
    "97": number;
    "96": number;
    "95": number;
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

export class BeatmapPPData {
    services: DataRepo

    strains: number[] = [];
    minBPM: number = 0.00;
    maxBPM: number = 0.00;
    ppAcc: BeatmapPPAcc = {
        "100": 0.00,
        "99": 0.00,
        "98": 0.00,
        "97": 0.00,
        "96": 0.00,
        "95": 0.00
    };
    calculatedMapAttributes: BeatmapPPAttributes = {
        ar: 0.00,
        cs: 0.00,
        hp: 0.00,
        od: 0.00,
        maxCombo: 0,
        fullStars: 0.00,
        stars: 0.00
    }
    currAttributes: BeatmapPPCurrentAttributes = {
        stars: 0.00,
        pp: 0.00,
        maxThisPlayPP: 0.00,
        fcPP: 0.00
    }
    timings: BeatmapPPTimings = {
        firstObj: 0,
        full: 0,
    }

    constructor(services: DataRepo) {
        this.services = services;
    }

    updateState(strains: number[], ppAcc: BeatmapPPAcc, mapAttributes: BeatmapPPAttributes) {
        this.strains = strains;
        this.ppAcc = ppAcc;
        this.calculatedMapAttributes = mapAttributes
    }

    updateCurrentAttributes(stars: number, pp: number) {
        const maxThisPlayPP = pp > this.currAttributes.pp ? pp : this.currAttributes.pp;

        this.currAttributes = {
            ...this.currAttributes,
            stars,
            pp,
            maxThisPlayPP
        }
    }

    updateFcPP(fcPP: number) {
        this.currAttributes = {
            ...this.currAttributes,
            fcPP: fcPP
        }
    }

    updateBPM(minBPM: number, maxBPM: number) {
        this.minBPM = minBPM;
        this.maxBPM = maxBPM;
    }

    updateTimings(firstObj: number, full: number) {
        this.timings = {
            firstObj,
            full
        }
    }
}