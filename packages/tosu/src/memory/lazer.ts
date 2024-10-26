import { CountryCodes } from '@tosu/common';
import path from 'path';

import { AbstractMemory, ScanPatterns } from '@/memory';
import type {
    IAudioVelocityBase,
    IBindingValue,
    IConfigValue,
    IGameplay,
    IGlobal,
    IGlobalPrecise,
    IHitErrors,
    IKeyOverlay,
    ILeaderboard,
    IMP3Length,
    IMenu,
    IOffsets,
    IResultScreen,
    ISettingsPointers,
    ITourney,
    ITourneyChat,
    ITourneyUser,
    IUser
} from '@/memory/types';
import { LeaderboardPlayer } from '@/states/gameplay';
import type { ITourneyManagerChatItem } from '@/states/tourney';
import { netDateBinaryToDate, numberFromDecimal } from '@/utils/converters';
import { calculateMods, defaultCalculatedMods } from '@/utils/osuMods';
import { CalculateMods, Mod, ModsCategories } from '@/utils/osuMods.types';
import type { BindingsList, ConfigList } from '@/utils/settings.types';

enum HitResult {
    none = 0,
    miss = 1,
    meh = 2,
    ok = 3,
    good = 4,
    great = 5,
    perfect = 6,
    smallTickMiss = 7,
    smallTickHit = 8,
    largeTickMiss = 9,
    largeTickHit = 10,
    smallBonus = 11,
    largeBonus = 12,
    ignoreMiss = 13,
    ignoreHit = 14,
    comboBreak = 15,
    sliderTailHit = 16,
    legacyComboIncrease = 99
}

enum RulesetName {
    osu,
    taiko,
    catch,
    mania
}

interface Statistics {
    miss: number;
    meh: number;
    ok: number;
    good: number;
    great: number;
    perfect: number;
    smallTickMiss: number;
    smallTickHit: number;
    largeTickMiss: number;
    largeTickHit: number;
    smallBonus: number;
    largeBonus: number;
    ignoreMiss: number;
    ignoreHit: number;
    comboBreak: number;
    sliderTailHit: number;
    legacyComboIncrease: number;
}

type LazerPatternData = {
    spectatorClient: number;
};

interface KeyCounter {
    isPressed: boolean;
    count: number;
}

export class LazerMemory extends AbstractMemory<LazerPatternData> {
    private scanPatterns: ScanPatterns = {
        spectatorClient: {
            pattern:
                '3F 00 00 80 3F 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 80 3F 00 00 80 3F 00 00 80 3F 00 00 80 3F 00 00 80 3F 00 00 80 3F 00 00 80 3F 00 00 80 3F 00 00 80 3F 00 00 80 3F 00 00 80 3F 00 00 80 3F 00 00 80 3F 00 00 80 3F 00 00 80 3F 00 00 80 3F 01 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 ?? 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00',
            offset: -0x16f
        }
    };

    private modsInitialized = false;
    private menuMods: CalculateMods = Object.assign({}, defaultCalculatedMods);

    private currentScreen: number = 0;

    private replayMode: boolean = false;

    private modMappings: Map<number, Map<number, string>> = new Map();

    private isPlayerLoading: boolean = false;

    private gameBaseAddress: number;

    patterns: LazerPatternData = {
        spectatorClient: 0
    };

    private lazerToStableStatus = {
        '-4': 1, // Locally modified
        '-3': 1, // None
        '-2': 2, // Graveyard
        '-1': 2, // WIP
        0: 2,
        1: 4,
        2: 5,
        3: 6,
        4: 7
    };

    private gameBase() {
        if (!this.gameBaseAddress) {
            const spectatorClient = this.getPattern('spectatorClient');

            this.gameBaseAddress = this.process.readIntPtr(
                this.process.readIntPtr(spectatorClient + 0x90) + 0x90
            );
        }

        return this.gameBaseAddress;
    }

    private screenStack() {
        return this.process.readIntPtr(this.gameBase() + 0x5f0);
    }

    private checkIfPlayer(address: number) {
        return this.process.readIntPtr(address + 0x3f8) === this.gameBase();
    }

    private checkIfResultScreen(address: number) {
        return (
            this.process.readIntPtr(address + 0x3b8) ===
                this.process.readIntPtr(this.gameBase() + 0x438) &&
            this.process.readIntPtr(address + 0x3c0) !==
                this.process.readIntPtr(this.gameBase() + 0x440)
        );
    }

    private checkIfSongSelect(address: number) {
        return this.process.readIntPtr(address + 0x3b0) === this.gameBase();
    }

    private checkIfPlayerLoader(address: number) {
        return (
            this.process.readIntPtr(address + 0x378) ===
            this.process.readIntPtr(address + 0x468)
        );
    }

    private getCurrentScreen() {
        const screenStack = this.screenStack();

        const stack = this.process.readIntPtr(screenStack + 0x320);
        const count = this.process.readInt(stack + 0x10);

        const items = this.process.readIntPtr(stack + 0x8);
        return this.process.readIntPtr(items + 0x10 + 0x8 * (count - 1));
    }

    private player() {
        if (this.currentScreen && this.checkIfPlayer(this.currentScreen)) {
            return this.currentScreen;
        }

        return 0;
    }

    private currentScore(player: number) {
        if (!player) {
            return 0;
        }
        return this.process.readIntPtr(player + 0x470);
    }

    private scoreInfo(player: number) {
        const currentScore = this.currentScore(player);

        if (!currentScore) {
            return 0;
        }

        return this.process.readIntPtr(currentScore + 0x8);
    }

    private readArray(array: number): number[] {
        const size = this.process.readInt(array + 0x8);

        const result: number[] = [];

        for (let i = 0; i < size; i++) {
            const current = this.process.readIntPtr(array + 0x10 + 0x8 * i);

            result.push(current);
        }

        return result;
    }

    private readItems(
        items: number,
        size: number,
        inlined: boolean = false,
        structSize: number = 8
    ): number[] {
        const result: number[] = [];

        for (let i = 0; i < size; i++) {
            const current = inlined
                ? items + 0x10 + structSize * i
                : this.process.readIntPtr(items + 0x10 + structSize * i);

            result.push(current);
        }

        return result;
    }

    private readListItems(
        list: number,
        inlined: boolean = false,
        structSize: number = 8
    ): number[] {
        const size = this.process.readInt(list + 0x10);
        const items = this.process.readIntPtr(list + 0x8);

        return this.readItems(items, size, inlined, structSize);
    }

    private readModList(list: number): number[] {
        const items = this.readListItems(list);

        const types: number[] = [];

        for (let i = 0; i < items.length; i++) {
            const current = items[i];

            const mods = this.process.readIntPtr(current + 0x10);

            const isMultiMod =
                mods > 1000 && this.process.readInt(mods + 0x8) === 2;

            if (isMultiMod) {
                const modsList = this.process.readIntPtr(current + 0x10);
                const mods = this.readArray(modsList);

                for (let i = 0; i < mods.length; i++) {
                    types.push(this.process.readIntPtr(mods[i]));
                }
            } else {
                types.push(this.process.readIntPtr(current));
            }
        }

        return types;
    }

    private readModMapping() {
        const availableModsDict = this.process.readIntPtr(
            this.process.readIntPtr(this.gameBase() + 0x468) + 0x20
        );

        const entries = this.process.readIntPtr(availableModsDict + 0x10);
        const count = this.process.readIntPtr(availableModsDict + 0x38);

        return this.readItems(entries, count, true, 0x18);
    }

    private initModMapping() {
        const currentModMapping = this.readModMapping();

        const modsList = {
            diffReductionCategory: this.readModList(currentModMapping[0]),
            diffIncreasingCategory: this.readModList(currentModMapping[1]),
            conversionCategory: this.readModList(currentModMapping[2]),
            automationCategory: this.readModList(currentModMapping[3]),
            funCategory: this.readModList(currentModMapping[4]),
            systemCategory: this.readModList(currentModMapping[5])
        };

        const modMapping = new Map<number, string>();

        for (const [category, mods] of Object.entries(ModsCategories)) {
            for (let i = 0; i < mods.length; i++) {
                const mod = mods[i];
                modMapping.set(modsList[category][i], mod);
            }
        }

        this.modMappings.set(0, modMapping);
    }

    private mods(scoreInfo: number): CalculateMods {
        if (!scoreInfo) {
            return Object.assign({}, defaultCalculatedMods);
        }

        const jsonString = this.process.readSharpStringPtr(scoreInfo + 0x50);
        if (jsonString.length === 0) {
            return Object.assign({}, defaultCalculatedMods);
        }

        const modAcronyms = JSON.parse(jsonString) as Mod[];

        let mods = calculateMods(modAcronyms);
        if (mods instanceof Error)
            mods = Object.assign({}, defaultCalculatedMods);

        return mods;
    }

    private beatmapClock() {
        return this.process.readIntPtr(this.gameBase() + 0x4c8);
    }

    private finalClockSource() {
        return this.process.readIntPtr(this.beatmapClock() + 0x210);
    }

    private currentTime() {
        return this.process.readDouble(this.finalClockSource() + 0x30);
    }

    private basePath() {
        const storage = this.process.readIntPtr(this.gameBase() + 0x440);
        const underlyingStorage = this.process.readIntPtr(storage + 0x10);

        return this.process.readSharpStringPtr(underlyingStorage + 0x8);
    }

    private currentBeatmap() {
        const bindable = this.process.readIntPtr(this.gameBase() + 0x450);
        const workingBeatmap = this.process.readIntPtr(bindable + 0x20);
        const beatmapInfo = this.process.readIntPtr(workingBeatmap + 0x8);
        const beatmapSetInfo = this.process.readIntPtr(workingBeatmap + 0x10);

        return { info: beatmapInfo, setInfo: beatmapSetInfo };
    }

    private getBeatmapFiles(beatmapSetInfo: number): Record<string, string> {
        const result = {};

        const files = this.process.readIntPtr(beatmapSetInfo + 0x20);
        const size = this.process.readInt(files + 0x10);
        const items = this.process.readIntPtr(files + 0x8);

        for (let i = 0; i < size; i++) {
            const current = this.process.readIntPtr(items + 0x10 + 0x8 * i);

            const realmFile = this.process.readIntPtr(current + 0x18);

            const hash = this.process.readSharpStringPtr(realmFile + 0x18);
            const fileName = this.process.readSharpStringPtr(current + 0x20);

            result[fileName] = hash;
        }

        return result;
    }

    private toLazerPath(hash: string) {
        if (!hash) {
            return '';
        }

        return `${hash[0]}\\${hash.substring(0, 2)}\\${hash}`;
    }

    private readStatistics(scoreInfo: number): Statistics {
        const statisticsDict = this.process.readIntPtr(scoreInfo + 0x78);
        const statisticsJson = this.process.readSharpStringPtr(
            scoreInfo + 0x58
        );

        const statistics: Statistics = {
            miss: 0,
            meh: 0,
            ok: 0,
            good: 0,
            great: 0,
            perfect: 0,
            smallTickMiss: 0,
            smallTickHit: 0,
            largeTickMiss: 0,
            largeTickHit: 0,
            smallBonus: 0,
            largeBonus: 0,
            ignoreMiss: 0,
            ignoreHit: 0,
            comboBreak: 0,
            sliderTailHit: 0,
            legacyComboIncrease: 0
        };

        const statisticsCount = this.process.readInt(statisticsDict + 0x38);

        // TODO: support all modes
        if (statisticsJson.length > 0 && statisticsCount === 4) {
            const parsedStatistics: Statistics = JSON.parse(statisticsJson);

            statistics.miss = parsedStatistics.miss;
            statistics.meh = parsedStatistics.meh;
            statistics.ok = parsedStatistics.ok;
            statistics.great = parsedStatistics.great;
        } else {
            const statisticsEntries = this.process.readIntPtr(
                statisticsDict + 0x10
            );

            if (!statisticsEntries) {
                return statistics;
            }

            const items = this.readItems(
                statisticsEntries,
                statisticsCount,
                true,
                0x10
            );

            for (const item of items) {
                const key = this.process.readInt(item + 0x8);
                if (key === 0) {
                    continue;
                }

                const value = this.process.readInt(item + 0xc);

                statistics[HitResult[key]] = value;
            }
        }

        return statistics;
    }

    private readLeaderboardScore(
        scoreInfo: number,
        index: number
    ): LeaderboardPlayer {
        const mods = this.mods(scoreInfo);

        const realmUser = this.process.readIntPtr(scoreInfo + 0x48);
        const username = this.process.readSharpStringPtr(realmUser + 0x18);

        const statistics = this.readStatistics(scoreInfo);

        return {
            name: username,
            mods,
            score: this.process.readLong(scoreInfo + 0x98),
            h300: statistics.great,
            h100: statistics.ok,
            h50: statistics.meh,
            h0: statistics.miss,
            combo: this.process.readInt(scoreInfo + 0xcc),
            maxCombo: this.process.readInt(scoreInfo + 0xc4),
            team: 0,
            isPassing: true,
            position: index + 1
        };
    }

    private readChildrenLazyList(container: number) {
        const children = this.process.readIntPtr(container + 0x310);
        const source = this.process.readIntPtr(children + 0x8);
        const list = this.process.readIntPtr(source + 0x8);

        return this.readListItems(list);
    }

    private readChildren(container: number) {
        const children = this.process.readIntPtr(container + 0x310);
        const list = this.process.readIntPtr(children + 0x8);

        return this.readListItems(list);
    }

    private readComponents(container: number): number[] {
        const content = this.process.readIntPtr(container + 0x338);

        return this.readChildren(content);
    }

    private isKeyOverlay(address: number, controller: number) {
        return this.process.readIntPtr(address + 0x348) === controller;
    }

    private findKeyOverlay(components: number[], controller: number) {
        let keyOverlay = 0;

        for (let i = 0; i < components.length; i++) {
            if (this.isKeyOverlay(components[i], controller)) {
                keyOverlay = components[i];

                break;
            }
        }

        return keyOverlay;
    }

    private isPPCounter(address: number, processor: number) {
        return this.process.readIntPtr(address + 0x340) === processor;
    }

    private findPPCounter(components: number[], processor: number) {
        let keyOverlay = 0;

        for (let i = 0; i < components.length; i++) {
            if (this.isPPCounter(components[i], processor)) {
                keyOverlay = components[i];

                break;
            }
        }

        return keyOverlay;
    }

    private readScore(
        scoreInfo: number,
        health: number = 0,
        retries: number = 0
    ): IGameplay {
        const statistics = this.readStatistics(scoreInfo);

        const mods = this.mods(scoreInfo);

        const realmUser = this.process.readIntPtr(scoreInfo + 0x48);
        const ruleset = this.process.readIntPtr(scoreInfo + 0x30);
        const mode = this.process.readInt(ruleset + 0x30);

        let username = this.process.readSharpStringPtr(realmUser + 0x18);

        if (username === 'Autoplay') username = 'osu!';
        if (username === 'osu!salad') username = 'salad!';
        if (username === 'osu!topus') username = 'osu!topus!';

        let pp = 0;

        const player = this.player();
        if (player) {
            const scoreProcessor = this.process.readIntPtr(player + 0x438);

            const hudOverlay = this.process.readIntPtr(player + 0x450);
            const mainComponents = this.readComponents(
                this.process.readIntPtr(hudOverlay + 0x3b8)
            );

            const ppCounter = this.findPPCounter(
                mainComponents,
                scoreProcessor
            );

            if (ppCounter) {
                pp = this.process.readInt(ppCounter + 0x324);
            }
        }

        return {
            retries,
            playerName: username,
            mods,
            mode,
            score: this.process.readLong(scoreInfo + 0x98),
            playerHPSmooth: health,
            playerHP: health,
            accuracy: this.process.readDouble(scoreInfo + 0xa8) * 100,
            hitGeki: statistics.perfect,
            hit300: statistics.great,
            hitKatu: statistics.good,
            hit100: statistics.ok,
            hit50: statistics.meh,
            hitMiss: statistics.miss,
            sliderEndHits: statistics.sliderTailHit || statistics.smallTickHit,
            sliderTickHits: statistics.largeTickHit,
            combo: this.process.readInt(scoreInfo + 0xcc),
            maxCombo: this.process.readInt(scoreInfo + 0xc4),
            pp
        };
    }

    getScanPatterns(): ScanPatterns {
        return this.scanPatterns;
    }

    audioVelocityBase(): IAudioVelocityBase {
        return [];
    }

    user(): IUser {
        const api = this.process.readIntPtr(this.gameBase() + 0x438);
        const userBindable = this.process.readIntPtr(api + 0x258);
        const user = this.process.readIntPtr(userBindable + 0x20);

        const statistics = this.process.readIntPtr(user + 0xa8);

        const ppDecimal = statistics + 0x60 + 0x8;

        // TODO: read ulong instead long
        const pp = numberFromDecimal(
            this.process.readLong(ppDecimal + 0x8),
            this.process.readUInt(ppDecimal + 0x4),
            this.process.readInt(ppDecimal)
        );

        let gamemode =
            RulesetName[this.process.readSharpStringPtr(user + 0x90)];

        if (gamemode === undefined) {
            gamemode = -1;
        }

        return {
            id: this.process.readInt(user + 0xf0),
            name: this.process.readSharpStringPtr(user + 0x8),
            accuracy: this.process.readDouble(statistics + 0x20),
            rankedScore: this.process.readLong(statistics + 0x18),
            level: this.process.readInt(statistics + 0x44),
            playCount: this.process.readInt(statistics + 0x30),
            playMode: gamemode,
            rank: this.process.readInt(statistics + 0x4c + 0x4),
            countryCode:
                CountryCodes[
                    this.process.readSharpStringPtr(user + 0x20).toLowerCase()
                ],
            performancePoints: pp,
            rawBanchoStatus: 0,
            backgroundColour: 0xffffffff,
            rawLoginStatus: 0
        };
    }

    settingsPointers(): ISettingsPointers {
        throw new Error('Lazer:settingsPointers not implemented.');
    }

    configOffsets(address: number, list: ConfigList): IOffsets {
        console.log(address, list);

        throw new Error('Lazer:configOffsets not implemented.');
    }

    bindingsOffsets(address: number, list: BindingsList): IOffsets {
        console.log(address, list);

        throw new Error('Lazer:bindingsOffsets not implemented.');
    }

    configValue(
        address: number,
        position: number,
        list: ConfigList
    ): IConfigValue {
        console.log(address, position, list);
        throw new Error('Lazer:configValue not implemented.');
    }

    bindingValue(address: number, position: number): IBindingValue {
        console.log(address, position);
        throw new Error('Lazer:bindingValue not implemented.');
    }

    resultScreen(): IResultScreen {
        const selectedScoreBindable = this.process.readIntPtr(
            this.currentScreen + 0x390
        );

        const scoreInfo = this.process.readIntPtr(selectedScoreBindable + 0x20);

        const score = this.readScore(scoreInfo);

        if (score instanceof Error) throw score;
        if (typeof score === 'string') {
            return 'not-ready';
        }

        const onlineId = Math.max(
            this.process.readLong(this.currentScreen + 0xb0),
            this.process.readLong(this.currentScreen + 0xb8)
        );

        const scoreDate = scoreInfo + 0x100;

        const date = netDateBinaryToDate(
            this.process.readInt(scoreDate + 0x4),
            this.process.readInt(scoreDate)
        ).toISOString();

        return {
            onlineId,
            playerName: score.playerName,
            mods: score.mods,
            mode: score.mode,
            maxCombo: score.maxCombo,
            score: score.score,
            hit100: score.hit100,
            hit300: score.hit300,
            hit50: score.hit50,
            hitGeki: score.hitGeki,
            hitKatu: score.hitKatu,
            hitMiss: score.hitMiss,
            sliderEndHits: score.sliderEndHits,
            sliderTickHits: score.sliderTickHits,
            date
        };
    }

    gameplay(): IGameplay {
        if (this.isPlayerLoading) {
            return 'not-ready';
        }

        const player = this.player();
        const scoreInfo = this.scoreInfo(player);

        const healthProcessor = this.process.readIntPtr(player + 0x440);

        const healthBindable = this.process.readIntPtr(healthProcessor + 0x230);
        const health = this.process.readDouble(healthBindable + 0x40); // 0..1

        return this.readScore(
            scoreInfo,
            health * 200,
            this.process.readInt(player + 0x38c)
        );
    }

    private readKeyCounter(keyCounter: number): KeyCounter {
        const isActiveBindable = this.process.readIntPtr(keyCounter + 0x330);
        const isActive = this.process.readByte(isActiveBindable + 0x40) === 1;

        const trigger = this.process.readIntPtr(keyCounter + 0x328);
        const activationCountBindable = this.process.readIntPtr(
            trigger + 0x208
        );
        const activationCount = this.process.readInt(
            activationCountBindable + 0x40
        );

        return {
            isPressed: isActive,
            count: activationCount
        };
    }

    private readKeyFlow(keyFlow: number): KeyCounter[] {
        const keyCounters = this.readChildrenLazyList(keyFlow);

        const result: KeyCounter[] = [];

        for (const counter of keyCounters) {
            result.push(this.readKeyCounter(counter));
        }

        return result;
    }

    keyOverlay(mode: number): IKeyOverlay {
        const emptyKeyOverlay: IKeyOverlay = {
            K1Pressed: false,
            K1Count: 0,
            K2Pressed: false,
            K2Count: 0,
            M1Pressed: false,
            M1Count: 0,
            M2Pressed: false,
            M2Count: 0
        };

        if (mode !== 0 || this.isPlayerLoading) {
            return emptyKeyOverlay;
        }

        const player = this.player();
        const hudOverlay = this.process.readIntPtr(player + 0x450);
        const inputController = this.process.readIntPtr(hudOverlay + 0x348);
        const rulesetComponents = this.readComponents(
            this.process.readIntPtr(hudOverlay + 0x3c0)
        );

        // try to look for legacy key overlay in ruleset components
        let keyOverlay = this.findKeyOverlay(
            rulesetComponents,
            inputController
        );

        // in case we don't have legacy key overlay displayed
        // let's try to look for other key overlays in main components
        if (!keyOverlay) {
            const mainComponents = this.readComponents(
                this.process.readIntPtr(hudOverlay + 0x3b8)
            );

            keyOverlay = this.findKeyOverlay(mainComponents, inputController);
        }

        // there's no key overlay currently being displayed
        if (!keyOverlay) {
            return emptyKeyOverlay;
        }

        const keyFlow = this.process.readIntPtr(keyOverlay + 0x350);

        // available keys:
        // 0 - k1/m1, 1 - k2/m2, 2 - smoke
        const keyCounters = this.readKeyFlow(keyFlow);

        return {
            K1Pressed: keyCounters[0].isPressed,
            K1Count: keyCounters[0].count,
            K2Pressed: keyCounters[1].isPressed,
            K2Count: keyCounters[1].count,
            M1Pressed: keyCounters[2].isPressed,
            M1Count: keyCounters[2].count,
            M2Pressed: false,
            M2Count: 0
        };
    }

    private isResultHit(result: number): boolean {
        switch (result) {
            case HitResult.none:
            case HitResult.ignoreMiss:
            case HitResult.miss:
            case HitResult.smallTickMiss:
            case HitResult.largeTickMiss:
            case HitResult.smallBonus:
            case HitResult.largeBonus:
            case HitResult.comboBreak:
                return false;

            default:
                return true;
        }
    }

    private isHitCircle(object: number): boolean {
        // These might potentially change
        const sliderHeadCircleBaseSize = 0xe8;
        const hitCircleBaseSize = 0xe0;

        const type = this.process.readIntPtr(object);
        const baseSize = this.process.readInt(type + 0x4);

        if (
            baseSize !== sliderHeadCircleBaseSize &&
            baseSize !== hitCircleBaseSize
        ) {
            return false;
        }

        return true;
    }

    private readHitEvent(address: number): number | undefined {
        const hitObject = this.process.readIntPtr(address);
        if (!hitObject) {
            return undefined;
        }

        if (!this.isHitCircle(hitObject)) {
            return undefined;
        }

        const hitResult = this.process.readInt(address + 0x18);
        if (!this.isResultHit(hitResult)) {
            return undefined;
        }

        const timeOffset = this.process.readDouble(address + 0x10);
        return timeOffset;
    }

    private hitEvents(): number[] {
        const player = this.player();
        const scoreProcessor = this.process.readIntPtr(player + 0x438);
        const hitEventsList = this.process.readIntPtr(scoreProcessor + 0x288);
        const hitEvents = this.readListItems(hitEventsList, true, 0x40);

        const result: number[] = [];
        for (let i = 0; i < hitEvents.length; i++) {
            const hitEvent = this.readHitEvent(hitEvents[i]);
            if (hitEvent === undefined) {
                continue;
            }

            result.push(hitEvent);
        }

        return result;
    }

    hitErrors(): IHitErrors {
        if (this.isPlayerLoading) {
            return [];
        }

        return this.hitEvents();
    }

    global(): IGlobal {
        if (!this.modsInitialized) {
            this.initModMapping();

            this.modsInitialized = true;
        }

        this.currentScreen = this.getCurrentScreen();

        const selectedModsBindable = this.process.readIntPtr(
            this.gameBase() + 0x460
        );

        const selectedModsIsDisabled =
            this.process.readByte(selectedModsBindable + 0x50) === 1;

        if (!selectedModsIsDisabled) {
            const selectedMods = this.process.readIntPtr(
                selectedModsBindable + 0x20
            );

            const selectedModsItems = this.readListItems(selectedMods);

            const modAcronyms: { acronym: any }[] = [];

            for (let i = 0; i < selectedModsItems.length; i++) {
                const type = this.process.readIntPtr(selectedModsItems[i]);

                const modMapping = this.modMappings.get(this.lastGamemode);
                const mod = modMapping?.get(type);
                if (mod) {
                    modAcronyms.push({ acronym: mod });
                }
            }

            let mods = calculateMods(modAcronyms);
            if (mods instanceof Error)
                mods = Object.assign({}, defaultCalculatedMods);

            this.menuMods = mods;
        }

        const filesFolder = path.join(this.basePath(), 'files');
        const isPlaying = this.player() !== 0;
        const isResultScreen = this.checkIfResultScreen(this.currentScreen);
        const isSongSelect = this.checkIfSongSelect(this.currentScreen);
        const isPlayerLoader = this.checkIfPlayerLoader(this.currentScreen);

        let status = 0;

        if (isPlaying || isPlayerLoader) {
            status = 2;
        } else if (isSongSelect) {
            status = 5;
        } else if (isResultScreen) {
            status = 7;
        }

        this.isPlayerLoading = isPlayerLoader;

        if (isPlaying) {
            const dependencies = this.process.readIntPtr(this.player() + 0x480);
            const cache = this.process.readIntPtr(dependencies + 0x8);
            const entries = this.process.readIntPtr(cache + 0x10);
            const drawableRuleset = this.process.readIntPtr(entries + 0x10);

            this.replayMode =
                this.process.readIntPtr(drawableRuleset + 0x328) !== 0;
        }

        return {
            isWatchingReplay: this.replayMode,
            isReplayUiHidden: false,
            showInterface: false,
            chatStatus: 0,
            status,
            gameTime: 0,
            menuMods: this.menuMods,
            skinFolder: filesFolder,
            memorySongsFolder: filesFolder
        };
    }

    globalPrecise(): IGlobalPrecise {
        return {
            time: Math.round(this.currentTime())
        };
    }

    private lastGamemode = 0;

    menu(previousChecksum: string): IMenu {
        const beatmap = this.currentBeatmap();
        const checksum = this.process.readSharpStringPtr(beatmap.info + 0x58);

        const rulesetBindable = this.process.readIntPtr(
            this.gameBase() + 0x458
        );
        const rulesetInfo = this.process.readIntPtr(rulesetBindable + 0x20);

        const gamemode = this.process.readInt(rulesetInfo + 0x30);
        if (checksum === previousChecksum && gamemode === this.lastGamemode) {
            return '';
        }

        this.lastGamemode = gamemode;

        const metadata = this.process.readIntPtr(beatmap.info + 0x30);
        const difficulty = this.process.readIntPtr(beatmap.info + 0x28);
        const hash = this.process.readSharpStringPtr(beatmap.info + 0x50);
        const author = this.process.readIntPtr(metadata + 0x38);

        const files = this.getBeatmapFiles(beatmap.setInfo);

        const audioFilename =
            files[this.process.readSharpStringPtr(metadata + 0x50)];
        const backgroundFilename =
            files[this.process.readSharpStringPtr(metadata + 0x58)];

        const difficultyName = this.process.readSharpStringPtr(
            beatmap.info + 0x18
        );

        return {
            gamemode: this.process.readInt(rulesetInfo + 0x30),
            checksum,
            filename: this.toLazerPath(hash),
            plays: 0,
            title: this.process.readSharpStringPtr(metadata + 0x18),
            titleOriginal: this.process.readSharpStringPtr(metadata + 0x20),
            artist: this.process.readSharpStringPtr(metadata + 0x28),
            artistOriginal: this.process.readSharpStringPtr(metadata + 0x30),
            ar: this.process.readFloat(difficulty + 0x34),
            cs: this.process.readFloat(difficulty + 0x2c),
            hp: this.process.readFloat(difficulty + 0x28),
            od: this.process.readFloat(difficulty + 0x30),
            audioFilename: this.toLazerPath(audioFilename),
            backgroundFilename: this.toLazerPath(backgroundFilename),
            folder: '',
            creator: this.process.readSharpStringPtr(author + 0x18),
            difficulty: difficultyName,
            mapID: this.process.readInt(beatmap.info + 0xac),
            setID: this.process.readInt(beatmap.setInfo + 0x30),
            rankedStatus: Number(
                this.lazerToStableStatus[
                    this.process.readInt(beatmap.info + 0xa8)
                ]
            ),
            objectCount: this.process.readInt(beatmap.info + 0xb4)
        };
    }

    mp3Length(): IMP3Length {
        const beatmapClock = this.beatmapClock();
        const decoupledTrack = this.process.readIntPtr(beatmapClock + 0x228);
        const sourceTrack = this.process.readIntPtr(decoupledTrack + 0x18);

        return Math.round(this.process.readDouble(sourceTrack + 0x48));
    }

    tourney(): ITourney {
        throw new Error('Lazer:tourney not implemented.');
    }

    tourneyChat(messages: ITourneyManagerChatItem[]): ITourneyChat {
        console.log(messages);

        throw new Error('Lazer:tourneyChat not implemented.');
    }

    tourneyUser(): ITourneyUser {
        throw new Error('Lazer:tourneyUser not implemented.');
    }

    /*
     * Doesn't work for ReplayPlayer
     * @see https://github.com/ppy/osu/issues/27609
     */
    leaderboard(): ILeaderboard {
        const player = this.player();

        const personalScore = this.readLeaderboardScore(
            this.scoreInfo(player),
            -1
        );

        const leaderboardScores = this.process.readIntPtr(
            player + (this.replayMode ? 0x4e0 : 0x520)
        );

        const items = this.readListItems(
            this.process.readIntPtr(leaderboardScores + 0x18)
        );

        const scores: LeaderboardPlayer[] = [];

        for (let i = 0; i < items.length; i++) {
            scores.push(this.readLeaderboardScore(items[i], i));
        }

        return [true, personalScore, scores];
    }
}
