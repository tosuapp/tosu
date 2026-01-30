import { ClientType, config, measureTime, wLogger } from '@tosu/common';
import { NativeOsuDifficultyAttributes } from '@tosuapp/osu-native-napi';
import {
    DifficultyCalculatorFactory,
    Mod,
    ModsCollection,
    Beatmap as NativeBeatmap,
    OsuDifficultyCalculator,
    OsuPerformanceCalculator,
    PerformanceCalculatorFactory,
    Ruleset
} from '@tosuapp/osu-native-wrapper';
import fs from 'fs';
import { HitType, Beatmap as ParsedBeatmap, TimingPoint } from 'osu-classes';
import { BeatmapDecoder } from 'osu-parsers';

import { BeatmapStrains } from '@/api/types/v1';
import { AbstractInstance } from '@/instances';
import { AbstractState } from '@/states';
import { fixDecimals, safeJoin } from '@/utils/converters';
import { sanitizeMods } from '@/utils/osuMods';
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

    beatmap?: NativeBeatmap;
    lazerBeatmap?: ParsedBeatmap;

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
            series: [{ name: 'stars', data: [] }],
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

    updatePPAttributes(type: 'curr' | 'fc', attributes: any) {
        try {
            this[`${type}PPAttributes`] = {
                ppAccuracy:
                    attributes?.ppAccuracy ?? attributes?.accuracy ?? 0.0,
                ppAim: attributes?.ppAim ?? attributes?.aim ?? 0.0,
                ppDifficulty:
                    attributes?.ppDifficulty ?? attributes?.difficulty ?? 0.0,
                ppFlashlight:
                    attributes?.ppFlashlight ?? attributes?.flashlight ?? 0.0,
                ppSpeed: attributes?.ppSpeed ?? attributes?.speed ?? 0.0
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
                } catch (exc) {
                    this.beatmap = undefined;
                    wLogger.debug(
                        ClientType[this.game.client],
                        this.game.pid,
                        `beatmapPP updateMapMetadata`,
                        `unable to destroy beatmap`,
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

            this.beatmap = NativeBeatmap.fromText(this.beatmapContent);
            // todo: beatmap conversion

            const beatmapCheckTime = performance.now();
            const totalTime = (beatmapCheckTime - startTime).toFixed(2);
            wLogger.time(
                `[${ClientType[this.game.client]}]`,
                this.game.pid,
                `beatmapPP.updateMapMetadata`,
                `[${totalTime}ms] Spend on opening beatmap`
            );

            this.clockRate = currentMods.rate;

            let calculatedDifficulty: NativeOsuDifficultyAttributes | undefined;

            const calculateDifficultyAndPPAcc = (rulesetId: number) => {
                if (!this.beatmap || !this.beatmapContent) return;

                const ppAcc: {
                    [key: string]: number;
                } = {};

                const mods = sanitizeMods(currentMods.array);
                let nativeMods: ModsCollection | null = null;
                const nativeModsOwned: Mod[] = [];

                const ruleset = Ruleset.fromId(rulesetId);
                try {
                    if (
                        this.game.client !== ClientType.lazer &&
                        !mods.some((m) => m.acronym === 'CL')
                    ) {
                        mods.unshift({ acronym: 'CL' });
                    }

                    if (mods.length > 0) {
                        nativeMods = ModsCollection.create();

                        for (const m of mods) {
                            let mod: Mod;
                            try {
                                mod = Mod.create(m.acronym);
                            } catch {
                                continue;
                            }

                            nativeModsOwned.push(mod);
                            nativeMods.add(mod);
                        }
                    }

                    const difficultyCalc =
                        DifficultyCalculatorFactory.create<OsuDifficultyCalculator>(
                            ruleset,
                            this.beatmap
                        );
                    const performanceCalc = config.calculatePP
                        ? PerformanceCalculatorFactory.create<OsuPerformanceCalculator>(
                              ruleset
                          )
                        : null;

                    try {
                        const difficulty = nativeMods
                            ? difficultyCalc.calculateWithMods(nativeMods)
                            : difficultyCalc.calculate();

                        calculatedDifficulty = difficulty;

                        if (config.calculatePP && performanceCalc) {
                            for (const acc of [
                                100, 99, 98, 97, 96, 95, 94, 93, 92, 91, 90
                            ]) {
                                const perf = performanceCalc.calculate(
                                    {
                                        ruleset,
                                        beatmap: this.beatmap,
                                        mods: nativeMods,
                                        maxCombo: difficulty.maxCombo,
                                        countGreat:
                                            difficulty.hitCircleCount +
                                            difficulty.sliderCount +
                                            difficulty.spinnerCount,
                                        countSliderTailHit:
                                            difficulty.sliderCount,
                                        accuracy: acc / 100
                                    },
                                    difficulty
                                );

                                ppAcc[acc] = fixDecimals(perf.total);
                            }
                        }
                    } finally {
                        performanceCalc?.destroy();
                        difficultyCalc.destroy();
                    }
                } finally {
                    nativeMods?.destroy();
                    for (const mod of nativeModsOwned) {
                        mod.destroy();
                    }

                    ruleset.destroy();
                }

                if (config.calculatePP) {
                    this.ppAcc = ppAcc as any;
                }
            };

            try {
                calculateDifficultyAndPPAcc(currentMode);
            } catch (exc) {
                wLogger.debug(
                    ClientType[this.game.client],
                    this.game.pid,
                    `beatmapPP updateMapMetadata calc`,
                    exc
                );

                if (
                    this.beatmap.native.rulesetId !== currentMode &&
                    Number.isFinite(this.beatmap.native.rulesetId)
                ) {
                    // todo: ruleset conversion
                    try {
                        calculateDifficultyAndPPAcc(
                            this.beatmap.native.rulesetId
                        );
                    } catch (exc2) {
                        wLogger.debug(
                            ClientType[this.game.client],
                            this.game.pid,
                            `beatmapPP updateMapMetadata calc fallback`,
                            exc2
                        );
                    }
                }
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
                    safeJoin(this.lazerBeatmap.events.backgroundPath || '') !==
                        menu.backgroundFilename &&
                    !lazerBypass
                ) {
                    menu.backgroundFilename = safeJoin(
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
                ar: this.beatmap.native.approachRate,
                arConverted: this.beatmap.native.approachRate, // todo
                cs: this.beatmap.native.circleSize,
                csConverted: this.beatmap.native.circleSize, // todo
                hp: this.beatmap.native.drainRate,
                hpConverted: this.beatmap.native.drainRate, // todo
                od: this.beatmap.native.overallDifficulty,
                odConverted: this.beatmap.native.overallDifficulty, // todo
                circles: this.lazerBeatmap.hittable,
                sliders: this.lazerBeatmap.slidable,
                spinners: this.lazerBeatmap.spinnable,
                holds: this.lazerBeatmap.holdable,
                maxCombo: calculatedDifficulty?.maxCombo || 0,
                fullStars: calculatedDifficulty?.starRating || 0,
                stars: calculatedDifficulty?.starRating || 0,
                aim: calculatedDifficulty?.aimDifficulty || 0,
                speed: calculatedDifficulty?.speedDifficulty || 0,
                flashlight: calculatedDifficulty?.flashlightDifficulty || 0,
                sliderFactor: calculatedDifficulty?.sliderFactor || 0,
                // todo
                // stamina: calculatedDifficulty?.staminaDifficulty || 0,
                // rhythm: calculatedDifficulty?.rhythmDifficulty || 0,
                // color: calculatedDifficulty?.colourDifficulty || 0,
                // reading: calculatedDifficulty?.readingDifficulty || 0,
                hitWindow: 0 // todo
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
                ClientType[this.game.client],
                this.game.pid,
                `beatmapPP updateMapMetadata`,
                exc
            );
        }
    }

    @measureTime
    updateGraph(_currentMods: ModsLazer) {
        // todo
    }

    @measureTime
    updateEditorPP() {
        // todo
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

        this.realtimeBPM = Math.round(bpm * multiply);

        this.isKiai = this.kiais.some((r) => ms >= r.start && ms <= r.end);
        this.isBreak = this.breaks.some((r) => ms >= r.start && ms <= r.end);
    }
}
