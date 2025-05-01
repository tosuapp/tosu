import {
    CountryCodes,
    GameState,
    LazerHitResults,
    LazerSettings,
    Rulesets,
    ScoringMode,
    wLogger
} from '@tosu/common';
import path from 'path';

import { AbstractMemory } from '@/memory';
import type {
    IAudioVelocityBase,
    IBindingValue,
    IConfigValue,
    IGameplay,
    IGlobal,
    IGlobalPrecise,
    IHitErrors,
    IKeyOverlay,
    ILazerSpectator,
    ILazerSpectatorEntry,
    ILeaderboard,
    IMP3Length,
    IMenu,
    IOffsets,
    IResultScreen,
    ISettingsPointers,
    ITourney,
    ITourneyChat,
    ITourneyUser,
    IUser,
    ScanPatterns
} from '@/memory/types';
import type { ITourneyManagerChatItem } from '@/states/tourney';
import { LeaderboardPlayer, Statistics } from '@/states/types';
import { netDateBinaryToDate, numberFromDecimal } from '@/utils/converters';
import {
    MultiplayerTeamType,
    MultiplayerUserState
} from '@/utils/multiplayer.types';
import { calculateMods, defaultCalculatedMods } from '@/utils/osuMods';
import {
    CalculateMods,
    Mod,
    ModsAcronyms,
    ModsCategories
} from '@/utils/osuMods.types';
import type { BindingsList, ConfigList } from '@/utils/settings.types';

type LazerPatternData = {
    sessionIdleTracker: number;
};

interface KeyCounter {
    isPressed: boolean;
    count: number;
}

export class LazerMemory extends AbstractMemory<LazerPatternData> {
    private scanPatterns: ScanPatterns = {
        sessionIdleTracker: {
            pattern: '00 00 00 00 80 4F 12 41', // aka 300000 in double
            offset: -0x208
        }
    };

    private static MAX_SCORE = 1000000;

    private menuMods: CalculateMods = Object.assign({}, defaultCalculatedMods);

    private currentScreen: number = 0;

    private replayMode: boolean = false;

    private modMappings: Map<string, string> = new Map();

    private isPlayerLoading: boolean = false;

    private gameBaseAddress: number;

    patterns: LazerPatternData = {
        sessionIdleTracker: 0
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

    private updateGameBaseAddress() {
        const oldAddress = this.gameBaseAddress;

        const sessionIdleTracker = this.getPattern('sessionIdleTracker');

        // this is why we like lazer more than stable (we can get everything from one place)
        this.gameBaseAddress = this.process.readIntPtr(
            this.process.readIntPtr(
                this.process.readIntPtr(
                    this.process.readIntPtr(
                        this.process.readIntPtr(
                            this.process.readIntPtr(
                                this.process.readIntPtr(
                                    this.process.readIntPtr(
                                        sessionIdleTracker + 0x90
                                    ) + 0x90
                                ) + 0x90
                            ) + 0x90
                        ) + 0x90
                    ) + 0x90
                ) + 0x90
            ) + 0x340
        );

        wLogger.debug(
            'lazer',
            this.pid,
            'updateGameBaseAddress',
            `${oldAddress?.toString(16)} => ${this.gameBaseAddress.toString(16)}`
        );
    }

    private checkIfGameBase(address: number): boolean {
        try {
            const vtable = this.process.readIntPtr(address);

            if (!vtable) {
                return false;
            }

            // might potentially change
            return this.process.readLong(vtable) === 7696598171648;
        } catch {
            return false;
        }
    }

    private gameBase() {
        if (!this.gameBaseAddress) {
            this.updateGameBaseAddress();
        }

        // Check if gamebase instance is valid
        if (!this.checkIfGameBase(this.gameBaseAddress)) {
            wLogger.debug('lazer', this.pid, 'GameBase has been reset');

            const scanPattern = this.scanPatterns.sessionIdleTracker;
            this.setPattern(
                'sessionIdleTracker',
                this.process.scanSync(scanPattern.pattern) + scanPattern.offset!
            );

            this.updateGameBaseAddress();
        }

        return this.gameBaseAddress;
    }

    private localConfig() {
        return this.process.readIntPtr(this.gameBase() + 0x3d8);
    }

    private configStore() {
        return this.process.readIntPtr(this.localConfig() + 0x20);
    }

    private screenStack() {
        return this.process.readIntPtr(this.gameBase() + 0x600);
    }

    // checks <game>k__BackingField
    private checkIfPlayer(address: number) {
        return this.process.readIntPtr(address + 0x400) === this.gameBase();
    }

    // Checks <leaderboardManager>k__BackingField and <StatisticsPanel>k__BackingField (to GameBase::<Storage>k__BackingField)
    private checkIfResultScreen(address: number) {
        return (
            this.process.readIntPtr(address + 0x408) ===
                this.process.readIntPtr(this.gameBase() + 0x490) &&
            this.process.readIntPtr(address + 0x348) !==
                this.process.readIntPtr(this.gameBase() + 0x450)
        );
    }

    // checks <game>k__BackingField
    private checkIfSongSelect(address: number) {
        return this.process.readIntPtr(address + 0x3c0) === this.gameBase();
    }

    // checks <logo>k__BackingField and osuLogo
    private checkIfPlayerLoader(address: number) {
        return (
            this.process.readIntPtr(address + 0x380) ===
            this.process.readIntPtr(address + 0x478)
        );
    }

    // Checks <api>k__BackingField and <realm>k__BackingField
    private checkIfEditor(address: number) {
        return (
            this.process.readIntPtr(address + 0x448) ===
                this.process.readIntPtr(this.gameBase() + 0x438) &&
            this.process.readIntPtr(address + 0x3c0) ===
                this.process.readIntPtr(this.gameBase() + 0x4b8)
        );
    }

    // Checks <API>k__BackingField and <client>k__BackingField
    private checkIfMultiSelect(address: number) {
        const multiplayerClient = this.multiplayerClient();
        const isConnectedBindable = this.process.readIntPtr(
            multiplayerClient + 0x2d8
        );

        const isConnected =
            this.process.readByte(isConnectedBindable + 0x40) === 1;

        if (!isConnected) {
            return false;
        }

        const currentRoom = this.process.readIntPtr(multiplayerClient + 0x288);

        return (
            !currentRoom &&
            this.process.readIntPtr(address + 0x3c0) ===
                this.process.readIntPtr(this.gameBase() + 0x438) &&
            this.process.readIntPtr(address + 0x3d0) ===
                this.process.readIntPtr(this.gameBase() + 0x4b0)
        );
    }

    private checkIfMulti() {
        const multiplayerClient = this.multiplayerClient();
        const isConnectedBindable = this.process.readIntPtr(
            multiplayerClient + 0x2d8
        );

        const isConnected =
            this.process.readByte(isConnectedBindable + 0x40) === 1;

        if (!isConnected) {
            return false;
        }

        const currentRoom = this.process.readIntPtr(multiplayerClient + 0x288);

        return currentRoom;
    }

    // <logo>k__BackingField / <spectatorClient>k__BackingField / <multiplayerClient>k__BackingField
    private checkIfMultiSpectator(address: number) {
        return (
            this.process.readIntPtr(address + 0x380) ===
                this.process.readIntPtr(this.gameBase() + 0x638) &&
            this.process.readIntPtr(address + 0x3b0) ===
                this.process.readIntPtr(this.gameBase() + 0x4a8) &&
            this.process.readIntPtr(address + 0x400) ===
                this.process.readIntPtr(this.gameBase() + 0x4b0)
        );
    }

    private multiplayerClient() {
        return this.process.readIntPtr(this.gameBase() + 0x4b0);
    }

    private getCurrentScreen() {
        const screenStack = this.screenStack();

        const stack = this.process.readIntPtr(screenStack + 0x320);
        const count = this.process.readInt(stack + 0x10);

        const items = this.process.readIntPtr(stack + 0x8);
        return this.process.readIntPtr(items + 0x10 + 0x8 * (count - 1));
    }

    private osuConfig() {
        const configStore = this.configStore();
        const entries = this.process.readIntPtr(configStore + 0x10);
        const count = this.process.readInt(configStore + 0x38);

        const config: Record<number, any> = {};

        for (let i = 0; i < count; i++) {
            const current = entries + 0x10 + 0x18 * i;

            const key = this.process.readInt(current + 0x10) as LazerSettings;
            const bindable = this.process.readIntPtr(current);

            const valueAddress = bindable + 0x40;

            switch (key) {
                case LazerSettings.ScoreDisplayMode:
                    config[key] = this.process.readInt(valueAddress);
                    break;
                default:
                    continue;
            }
        }

        return config;
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
        return this.process.readIntPtr(player + 0x480);
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
        let isArray = false;

        // another hacky check :D
        // 0x10 is _items in List and length in array
        if (this.process.readInt(list + 0x10) > 10000000) {
            isArray = true;
        }

        const size = this.process.readInt(list + (isArray ? 0x8 : 0x10));
        const items = isArray ? list : this.process.readIntPtr(list + 0x8);

        return this.readItems(items, size, inlined, structSize);
    }

    private isMultiMod(type: number): boolean {
        return (
            this.process.readInt(type) === 0x1000000 &&
            this.process.readInt(type + 0x3) === 8193
        );
    }

    private readModList(list: number): number[] {
        const items = this.readListItems(list);

        const types: number[] = [];

        for (let i = 0; i < items.length; i++) {
            const current = items[i];

            const isMultiMod = this.isMultiMod(
                this.process.readIntPtr(current)
            );

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
        const count = this.process.readInt(availableModsDict + 0x38);

        return this.readItems(entries, count, false, 0x18);
    }

    private initModMapping(gamemode: number) {
        if (!ModsCategories[gamemode]) {
            wLogger.warn(
                'lazer',
                this.pid,
                'initModMapping',
                `Unknown mods gamemode: ${gamemode}`
            );
            return;
        }

        const currentModMapping = this.readModMapping();

        const modsList = {
            diffReductionCategory: this.readModList(currentModMapping[0]),
            diffIncreasingCategory: this.readModList(currentModMapping[1]),
            conversionCategory: this.readModList(currentModMapping[2]),
            automationCategory: this.readModList(currentModMapping[3]),
            funCategory: this.readModList(currentModMapping[4]),
            systemCategory: this.readModList(currentModMapping[5])
        };

        for (const [category, mods] of Object.entries(
            ModsCategories[gamemode as 0]
        )) {
            for (let i = 0; i < mods.length; i++) {
                const mod = mods[i];
                this.modMappings.set(
                    `${gamemode}-${modsList[category][i]}`,
                    mod
                );
            }
        }

        this.modMappings.set(gamemode.toString(), '');
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

        let mods = calculateMods(modAcronyms, true);
        if (mods instanceof Error)
            mods = Object.assign({}, defaultCalculatedMods);

        return mods;
    }

    private beatmapClock() {
        return this.process.readIntPtr(this.gameBase() + 0x4d0);
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

        return path.join(hash[0], hash.substring(0, 2), hash);
    }

    private readStatisticsDict(statisticsDict: number) {
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

        if (!statisticsDict) {
            return statistics;
        }

        const statisticsCount = this.process.readInt(statisticsDict + 0x38);

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

            statistics[LazerHitResults[key]] = value;
        }

        return statistics;
    }

    private readStatistics(scoreInfo: number): Statistics {
        const statisticsDict = this.process.readIntPtr(scoreInfo + 0x78);

        return this.readStatisticsDict(statisticsDict);
    }

    private readMaximumStatistics(scoreInfo: number): Statistics {
        const statisticsDict = this.process.readIntPtr(scoreInfo + 0x80);

        return this.readStatisticsDict(statisticsDict);
    }

    private readLeaderboardScore(
        scoreInfo: number,
        index: number
    ): LeaderboardPlayer {
        const mods = this.mods(scoreInfo);

        const realmUser = this.process.readIntPtr(scoreInfo + 0x48);
        const username = this.process.readSharpStringPtr(realmUser + 0x18);
        const userId = this.process.readInt(realmUser + 0x28);

        const statistics = this.readStatistics(scoreInfo);

        return {
            userId,
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

    private isScorableHitResult(result: LazerHitResults) {
        switch (result) {
            case LazerHitResults.legacyComboIncrease:
                return true;

            case LazerHitResults.comboBreak:
                return true;

            case LazerHitResults.sliderTailHit:
                return true;

            default:
                return (
                    result >= LazerHitResults.miss &&
                    result < LazerHitResults.ignoreMiss
                );
        }
    }

    private isTickHitResult(result: LazerHitResults) {
        switch (result) {
            case LazerHitResults.largeTickHit:
            case LazerHitResults.largeTickMiss:
            case LazerHitResults.smallTickHit:
            case LazerHitResults.smallTickMiss:
            case LazerHitResults.sliderTailHit:
                return true;

            default:
                return false;
        }
    }

    private isBonusHitResult(result: LazerHitResults) {
        switch (result) {
            case LazerHitResults.smallBonus:
            case LazerHitResults.largeBonus:
                return true;

            default:
                return false;
        }
    }

    private isBasicHitResult(result: LazerHitResults) {
        switch (result) {
            case LazerHitResults.legacyComboIncrease:
                return false;
            case LazerHitResults.comboBreak:
                return false;
            default:
                return (
                    this.isScorableHitResult(result) &&
                    !this.isTickHitResult(result) &&
                    !this.isBonusHitResult(result)
                );
        }
    }

    private getObjectCountFromMaxStatistics(statistics: Statistics): number {
        let total = 0;

        const entries = Object.entries(statistics);
        for (let i = 0; i < entries.length; i++) {
            const kvp = entries[i];

            const key = LazerHitResults[kvp[0]];
            const value = kvp[1] as number;

            if (this.isBasicHitResult(key)) {
                total += value;
            }
        }

        return total;
    }

    private getDisplayScore(
        mode: number,
        standardisedTotalScore: number,
        objectCount: number
    ) {
        switch (mode) {
            case Rulesets.osu:
                return Math.round(
                    ((Math.pow(objectCount, 2) * 32.57 + 100000) *
                        standardisedTotalScore) /
                        LazerMemory.MAX_SCORE
                );

            case Rulesets.taiko:
                return Math.round(
                    ((objectCount * 1109 + 100000) * standardisedTotalScore) /
                        LazerMemory.MAX_SCORE
                );

            case Rulesets.fruits:
                return Math.round(
                    Math.pow(
                        (standardisedTotalScore / LazerMemory.MAX_SCORE) *
                            objectCount,
                        2
                    ) *
                        21.62 +
                        standardisedTotalScore / 10
                );

            case Rulesets.mania:
            default:
                return standardisedTotalScore;
        }
    }

    private readScore(
        scoreInfo: number,
        health: number = 0,
        retries: number = 0,
        combo?: number
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

        const player = this.player();
        if (!combo && player) {
            const scoreProcessor = this.process.readIntPtr(player + 0x448);

            const comboBindable = this.process.readIntPtr(
                scoreProcessor + 0x250
            );

            combo = this.process.readInt(comboBindable + 0x40);
        }

        if (!combo) {
            combo = 0;
        }

        let score = this.process.readLong(scoreInfo + 0x98);
        const config = this.osuConfig();

        if (config[LazerSettings.ScoreDisplayMode] === ScoringMode.classic) {
            const objectCount = this.getObjectCountFromMaxStatistics(
                this.readMaximumStatistics(scoreInfo)
            );

            score = this.getDisplayScore(mode, score, objectCount);
        }

        return {
            retries,
            playerName: username,
            mods,
            mode,
            score,
            playerHPSmooth: health,
            playerHP: health,
            accuracy: this.process.readDouble(scoreInfo + 0xa8) * 100,
            hitGeki: statistics.perfect,
            hit300: statistics.great,
            hitKatu: statistics.good,
            hit100: statistics.ok,
            hit50: statistics.meh,
            hitMiss: statistics.miss,
            sliderEndHits: statistics.sliderTailHit,
            smallTickHits: statistics.largeTickHit,
            largeTickHits: statistics.smallTickHit,
            combo,
            maxCombo: this.process.readInt(scoreInfo + 0xc4)
        };
    }

    getScanPatterns(): ScanPatterns {
        return this.scanPatterns;
    }

    audioVelocityBase(): IAudioVelocityBase {
        return [];
    }

    readUser(user: number) {
        const userId = this.process.readInt(user + 0xe8);

        if (userId === 0) {
            return {
                id: 0,
                name: 'Guest',
                accuracy: 0,
                rankedScore: 0,
                level: 0,
                playCount: 0,
                playMode: 0,
                rank: 0,
                countryCode: 0,
                performancePoints: 0,
                rawBanchoStatus: 0,
                backgroundColour: 0xffffffff,
                rawLoginStatus: 0
            };
        }

        const statistics = this.process.readIntPtr(user + 0xa0);

        let pp = 0;
        let accuracy = 0;
        let rankedScore = 0;
        let level = 0;
        let playCount = 0;
        let rank = 0;

        if (statistics) {
            const ppDecimal = statistics + 0x68 + 0x8;

            // TODO: read ulong instead long
            pp = numberFromDecimal(
                this.process.readLong(ppDecimal + 0x8),
                this.process.readUInt(ppDecimal + 0x4),
                this.process.readInt(ppDecimal)
            );

            accuracy = this.process.readDouble(statistics + 0x28);
            rankedScore = this.process.readLong(statistics + 0x20);
            level = this.process.readInt(statistics + 0x4c);
            playCount = this.process.readInt(statistics + 0x38);
            rank = this.process.readInt(statistics + 0x54 + 0x4);
        }

        let gamemode = Rulesets[this.process.readSharpStringPtr(user + 0x88)];

        if (gamemode === undefined) {
            gamemode = -1;
        }

        return {
            id: userId,
            name: this.process.readSharpStringPtr(user + 0x8),
            accuracy,
            rankedScore,
            level,
            playCount,
            playMode: gamemode,
            rank,
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

    user(): IUser {
        const api = this.process.readIntPtr(this.gameBase() + 0x438);
        const userBindable = this.process.readIntPtr(api + 0x250);
        const user = this.process.readIntPtr(userBindable + 0x20);

        return this.readUser(user);
    }

    settingsPointers(): ISettingsPointers {
        throw new Error('Lazer:settingsPointers not implemented.');
    }

    configOffsets(_address: number, _list: ConfigList): IOffsets {
        throw new Error('Lazer:configOffsets not implemented.');
    }

    bindingsOffsets(_address: number, _list: BindingsList): IOffsets {
        throw new Error('Lazer:bindingsOffsets not implemented.');
    }

    configValue(
        _address: number,
        _position: number,
        _list: ConfigList
    ): IConfigValue {
        throw new Error('Lazer:configValue not implemented.');
    }

    bindingValue(_address: number, _position: number): IBindingValue {
        throw new Error('Lazer:bindingValue not implemented.');
    }

    buildResultScreen(
        scoreInfo: number,
        onlineId: number = -1,
        date: string = new Date().toISOString()
    ): IResultScreen {
        const score = this.readScore(scoreInfo);

        if (score instanceof Error) throw score;
        if (typeof score === 'string') {
            return 'not-ready';
        }

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
            smallTickHits: score.smallTickHits,
            largeTickHits: score.largeTickHits,
            date
        };
    }

    resultScreen(): IResultScreen {
        const selectedScoreBindable = this.process.readIntPtr(
            this.currentScreen + 0x398
        );

        const scoreInfo = this.process.readIntPtr(selectedScoreBindable + 0x20);

        const onlineId = Math.max(
            this.process.readLong(this.currentScreen + 0xb0),
            this.process.readLong(this.currentScreen + 0xb8)
        );

        const scoreDate = scoreInfo + 0x100;

        return this.buildResultScreen(
            scoreInfo,
            onlineId,
            netDateBinaryToDate(
                this.process.readInt(scoreDate + 0x4),
                this.process.readInt(scoreDate)
            ).toISOString()
        );
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
            this.process.readInt(player + 0x394)
        );
    }

    private readKeyTrigger(trigger: number): KeyCounter {
        const activationCountBindable = this.process.readIntPtr(
            trigger + 0x208
        );
        const activationCount = this.process.readInt(
            activationCountBindable + 0x40
        );

        const isActive = this.process.readByte(trigger + 0x1f4) === 1;

        return {
            isPressed: isActive,
            count: activationCount
        };
    }

    keyOverlay(mode: number): IKeyOverlay {
        try {
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
            const hudOverlay = this.process.readIntPtr(player + 0x460);

            const inputController = this.process.readIntPtr(hudOverlay + 0x348);

            const triggersBindable = this.process.readIntPtr(
                inputController + 0x200
            );

            const triggerCollection = this.process.readIntPtr(
                triggersBindable + 0x18
            );

            const triggers = this.readListItems(triggerCollection);

            if (triggers.length === 0) {
                return {
                    K1Pressed: false,
                    K1Count: 0,
                    K2Pressed: false,
                    K2Count: 0,
                    M1Pressed: false,
                    M1Count: 0,
                    M2Pressed: false,
                    M2Count: 0
                };
            }

            // available keys:
            // 0 - k1/m1, 1 - k2/m2, 2 - smoke
            const keyCounters: KeyCounter[] = [];

            for (let i = 0; i < triggers.length; i++) {
                keyCounters.push(this.readKeyTrigger(triggers[i]));
            }

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
        } catch (error) {
            return error as Error;
        }
    }

    private isResultHit(result: number): boolean {
        switch (result) {
            case LazerHitResults.none:
            case LazerHitResults.ignoreMiss:
            case LazerHitResults.miss:
            case LazerHitResults.smallTickMiss:
            case LazerHitResults.largeTickMiss:
            case LazerHitResults.smallBonus:
            case LazerHitResults.largeBonus:
            case LazerHitResults.comboBreak:
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
        const scoreProcessor = this.process.readIntPtr(player + 0x448);
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

    private readMod(acronym: ModsAcronyms, modObject: number): Mod {
        const mod: Mod = {
            acronym: acronym as any
        };

        switch (mod.acronym) {
            case 'EZ': {
                if (this.selectedGamemode === 1) break;

                mod.settings = {
                    retries: this.process.readInt(modObject + 0x20)
                };

                break;
            }
            case 'HT': {
                const speedChangeBindable = this.process.readIntPtr(
                    modObject + 0x10
                );
                const adjustPitchBindable = this.process.readIntPtr(
                    modObject + 0x18
                );

                mod.settings = {
                    speed_change: this.process.readDouble(
                        speedChangeBindable + 0x40
                    ),
                    adjust_pitch:
                        this.process.readByte(adjustPitchBindable + 0x40) === 1
                };

                break;
            }
            case 'DC': {
                const speedChangeBindable = this.process.readIntPtr(
                    modObject + 0x10
                );

                mod.settings = {
                    speed_change: this.process.readDouble(
                        speedChangeBindable + 0x40
                    )
                };

                break;
            }
            case 'SD': {
                const restartBindable = this.process.readIntPtr(
                    modObject + 0x10
                );

                mod.settings = {
                    restart: this.process.readByte(restartBindable + 0x40) === 1
                };

                break;
            }
            case 'PF': {
                const restartBindable = this.process.readIntPtr(
                    modObject + 0x10
                );

                mod.settings = {
                    restart: this.process.readByte(restartBindable + 0x40) === 1
                };

                break;
            }
            case 'DT': {
                const speedChangeBindable = this.process.readIntPtr(
                    modObject + 0x10
                );

                const adjustPitchBindable = this.process.readIntPtr(
                    modObject + 0x18
                );

                mod.settings = {
                    speed_change: this.process.readDouble(
                        speedChangeBindable + 0x40
                    ),
                    adjust_pitch:
                        this.process.readByte(adjustPitchBindable + 0x40) === 1
                };

                break;
            }
            case 'NC': {
                const speedChangeBindable = this.process.readIntPtr(
                    modObject + 0x10
                );

                mod.settings = {
                    speed_change: this.process.readDouble(
                        speedChangeBindable + 0x40
                    )
                };

                break;
            }
            case 'HD': {
                if ([1, 2, 3].includes(this.selectedGamemode)) break;
                const onlyFadeApproachCirclesBindable = this.process.readIntPtr(
                    modObject + 0x20
                );

                mod.settings = {
                    only_fade_approach_circles:
                        this.process.readByte(
                            onlyFadeApproachCirclesBindable + 0x40
                        ) === 1
                };
                break;
            }
            case 'FL': {
                const settings: any = {};
                const followDelayBindable = this.process.readIntPtr(
                    modObject + 0x18
                );

                const sizeMultiplierBindable = this.process.readIntPtr(
                    modObject + 0x20
                );

                const comboBasedBindable = this.process.readIntPtr(
                    modObject + 0x28
                );

                if (this.selectedGamemode === 0) {
                    settings.follow_delay = this.process.readDouble(
                        followDelayBindable + 0x40
                    );

                    settings.combo_based_size =
                        this.process.readByte(comboBasedBindable + 0x40) === 1;

                    settings.size_multiplier = this.process.readFloat(
                        sizeMultiplierBindable + 0x40
                    );
                } else if ([1, 2, 3].includes(this.selectedGamemode)) {
                    settings.size_multiplier = this.process.readFloat(
                        followDelayBindable + 0x40
                    );

                    settings.combo_based_size =
                        this.process.readByte(sizeMultiplierBindable + 0x40) ===
                        1;
                }

                mod.settings = settings;
                break;
            }
            case 'AC': {
                const restartBindable = this.process.readIntPtr(
                    modObject + 0x10
                );

                const minimumAccuracyBindable = this.process.readIntPtr(
                    modObject + 0x20
                );

                const accuracyJudgeModeBindable = this.process.readIntPtr(
                    modObject + 0x28
                );

                mod.settings = {
                    minimum_accuracy: this.process.readDouble(
                        minimumAccuracyBindable + 0x40
                    ),
                    accuracy_judge_mode: this.process
                        .readInt(accuracyJudgeModeBindable + 0x40)
                        .toString(),
                    restart: this.process.readByte(restartBindable + 0x40) === 1
                };
                break;
            }
            case 'TP': {
                const seedBindable = this.process.readIntPtr(modObject + 0x20);
                const metronomeBindable = this.process.readIntPtr(
                    modObject + 0x28
                );
                const valueNullable = seedBindable + 0x44 + 0x4;

                mod.settings = {
                    seed: this.process.readInt(valueNullable),
                    metronome:
                        this.process.readByte(metronomeBindable + 0x40) === 1
                };
                break;
            }
            case 'DA': {
                const settings: any = {};

                const drainRateBindable = this.process.readIntPtr(
                    modObject + 0x10
                );
                const overallDifficultyBindable = this.process.readIntPtr(
                    modObject + 0x18
                );
                const extendedLimitsBindable = this.process.readIntPtr(
                    modObject + 0x20
                );
                const circleSizeBindable = this.process.readIntPtr(
                    modObject + 0x28
                );
                const approachRateBindable = this.process.readIntPtr(
                    modObject + 0x30
                );

                const drainRateCurrentBindable = this.process.readIntPtr(
                    drainRateBindable + 0x60
                );

                const overallDifficultyCurrentBindable =
                    this.process.readIntPtr(overallDifficultyBindable + 0x60);

                if (
                    this.selectedGamemode === 0 ||
                    this.selectedGamemode === 2
                ) {
                    const circleSizeCurrentBindable = this.process.readIntPtr(
                        circleSizeBindable + 0x60
                    );
                    const approachRateCurrentBindable = this.process.readIntPtr(
                        approachRateBindable + 0x60
                    );

                    settings.approach_rate = this.process.readFloat(
                        approachRateCurrentBindable + 0x40
                    );

                    settings.circle_size = this.process.readFloat(
                        circleSizeCurrentBindable + 0x40
                    );

                    if (this.selectedGamemode === 2) {
                        const hardRockOffsetsBindable = this.process.readIntPtr(
                            modObject + 0x38
                        );

                        settings.hard_rock_offsets =
                            this.process.readByte(
                                hardRockOffsetsBindable + 0x40
                            ) === 1;
                    }
                } else if (this.selectedGamemode === 1) {
                    const circleSizeCurrentBindable = this.process.readIntPtr(
                        circleSizeBindable + 0x60
                    );
                    settings.scroll_speed = this.process.readFloat(
                        circleSizeCurrentBindable + 0x40
                    );
                }

                settings.drain_rate = this.process.readFloat(
                    drainRateCurrentBindable + 0x40
                );
                settings.overall_difficulty = this.process.readFloat(
                    overallDifficultyCurrentBindable + 0x40
                );

                settings.extended_limits =
                    this.process.readByte(extendedLimitsBindable + 0x40) === 1;

                mod.settings = settings;
                break;
            }
            case 'CL': {
                if (this.selectedGamemode === 1) break;
                const noSliderHeadAccuracyBindable = this.process.readIntPtr(
                    modObject + 0x10
                );
                const classicNoteLockBindable = this.process.readIntPtr(
                    modObject + 0x18
                );
                const alwaysPlayTailSampleBindable = this.process.readIntPtr(
                    modObject + 0x20
                );
                const fadeHitCircleEarlyBindable = this.process.readIntPtr(
                    modObject + 0x28
                );
                const classicHealthBindable = this.process.readIntPtr(
                    modObject + 0x30
                );

                mod.settings = {
                    no_slider_head_accuracy:
                        this.process.readByte(
                            noSliderHeadAccuracyBindable + 0x40
                        ) === 1,
                    classic_note_lock:
                        this.process.readByte(
                            classicNoteLockBindable + 0x40
                        ) === 1,
                    always_play_tail_sample:
                        this.process.readByte(
                            alwaysPlayTailSampleBindable + 0x40
                        ) === 1,
                    fade_hit_circle_early:
                        this.process.readByte(
                            fadeHitCircleEarlyBindable + 0x40
                        ) === 1,
                    classic_health:
                        this.process.readByte(classicHealthBindable + 0x40) ===
                        1
                };
                break;
            }
            case 'RD': {
                const settings: any = {};
                const seedBindable = this.process.readIntPtr(modObject + 0x10);
                const angleSharpnessBindable = this.process.readIntPtr(
                    modObject + 0x18
                );
                const valueNullable = seedBindable + 0x44 + 0x4;
                if (![3, 1].includes(this.selectedGamemode)) {
                    settings.angle_sharpness = this.process.readFloat(
                        angleSharpnessBindable + 0x40
                    );
                }

                settings.seed = this.process.readInt(valueNullable);
                mod.settings = settings;
                break;
            }
            case 'MR': {
                if ([2, 3].includes(this.selectedGamemode)) break;
                const reflectionBindable = this.process.readIntPtr(
                    modObject + 0x10
                );
                mod.settings = {
                    reflection: this.process.readInt(reflectionBindable + 0x40)
                };
                break;
            }
            case 'WG': {
                const strengthBindable = this.process.readIntPtr(
                    modObject + 0x20
                );

                mod.settings = {
                    strength: this.process.readDouble(strengthBindable + 0x40)
                };
                break;
            }
            case 'GR': {
                const startScaleBindable = this.process.readIntPtr(
                    modObject + 0x20
                );

                mod.settings = {
                    start_scale: this.process.readFloat(
                        startScaleBindable + 0x40
                    )
                };
                break;
            }
            case 'DF': {
                const startScaleBindable = this.process.readIntPtr(
                    modObject + 0x20
                );

                mod.settings = {
                    start_scale: this.process.readFloat(
                        startScaleBindable + 0x40
                    )
                };

                break;
            }
            case 'WU': {
                const initialRateBindable = this.process.readIntPtr(
                    modObject + 0x30
                );

                const finalRateBindable = this.process.readIntPtr(
                    modObject + 0x38
                );

                const adjustPitchBindable = this.process.readIntPtr(
                    modObject + 0x40
                );

                mod.settings = {
                    initial_rate: this.process.readDouble(
                        initialRateBindable + 0x40
                    ),
                    final_rate: this.process.readDouble(
                        finalRateBindable + 0x40
                    ),
                    adjust_pitch:
                        this.process.readByte(adjustPitchBindable + 0x40) === 1
                };
                break;
            }
            case 'WD': {
                const initialRateBindable = this.process.readIntPtr(
                    modObject + 0x30
                );

                const finalRateBindable = this.process.readIntPtr(
                    modObject + 0x38
                );

                const adjustPitchBindable = this.process.readIntPtr(
                    modObject + 0x40
                );

                mod.settings = {
                    initial_rate: this.process.readDouble(
                        initialRateBindable + 0x40
                    ),
                    final_rate: this.process.readDouble(
                        finalRateBindable + 0x40
                    ),
                    adjust_pitch:
                        this.process.readByte(adjustPitchBindable + 0x40) === 1
                };
                break;
            }
            case 'BR': {
                const spinSpeedBindable = this.process.readIntPtr(
                    modObject + 0x10
                );

                const directionBindable = this.process.readIntPtr(
                    modObject + 0x18
                );

                mod.settings = {
                    spin_speed: this.process.readDouble(
                        spinSpeedBindable + 0x40
                    ),
                    direction: this.process.readInt(directionBindable + 0x40)
                };
                break;
            }
            case 'AD': {
                const scaleBindable = this.process.readIntPtr(modObject + 0x10);
                const styleBindable = this.process.readIntPtr(modObject + 0x18);

                mod.settings = {
                    scale: this.process.readFloat(scaleBindable + 0x40),
                    style: this.process.readInt(styleBindable + 0x40)
                };
                break;
            }
            case 'MU': {
                const inverseMutingBindable = this.process.readIntPtr(
                    modObject + 0x28
                );

                const enableMetronomeBindable = this.process.readIntPtr(
                    modObject + 0x30
                );

                const muteComboCountBindable = this.process.readIntPtr(
                    modObject + 0x38
                );

                const affectsHitSoundsBindable = this.process.readIntPtr(
                    modObject + 0x40
                );

                mod.settings = {
                    inverse_muting:
                        this.process.readByte(inverseMutingBindable + 0x40) ===
                        1,
                    enable_metronome:
                        this.process.readByte(
                            enableMetronomeBindable + 0x40
                        ) === 1,
                    mute_combo_count: this.process.readInt(
                        muteComboCountBindable + 0x40
                    ),
                    affects_hit_sounds:
                        this.process.readByte(
                            affectsHitSoundsBindable + 0x40
                        ) === 1
                };
                break;
            }
            case 'NS': {
                const offset = this.selectedGamemode === 2 ? 0x28 : 0x30;

                const hiddenComboCountBindable = this.process.readIntPtr(
                    modObject + offset
                );

                mod.settings = {
                    hidden_combo_count: this.process.readInt(
                        hiddenComboCountBindable + 0x40
                    )
                };
                break;
            }
            case 'MG': {
                const attractionStrengthBindable = this.process.readIntPtr(
                    modObject + 0x10
                );

                mod.settings = {
                    attraction_strength: this.process.readFloat(
                        attractionStrengthBindable + 0x40
                    )
                };
                break;
            }
            case 'RP': {
                const repulsionStrengthBindable = this.process.readIntPtr(
                    modObject + 0x10
                );

                mod.settings = {
                    repulsion_strength: this.process.readFloat(
                        repulsionStrengthBindable + 0x40
                    )
                };

                break;
            }
            case 'AS': {
                const initialRateBindable = this.process.readIntPtr(
                    modObject + 0x10
                );

                const adjustPitchBindable = this.process.readIntPtr(
                    modObject + 0x18
                );

                mod.settings = {
                    initial_rate: this.process.readDouble(
                        initialRateBindable + 0x40
                    ),
                    adjust_pitch:
                        this.process.readByte(adjustPitchBindable + 0x40) === 1
                };
                break;
            }
            case 'DP': {
                const maxDepthBindable = this.process.readIntPtr(
                    modObject + 0x20
                );

                const showApproachRateBindable = this.process.readIntPtr(
                    modObject + 0x28
                );

                mod.settings = {
                    max_depth: this.process.readFloat(maxDepthBindable + 0x40),
                    show_approach_circles:
                        this.process.readByte(
                            showApproachRateBindable + 0x40
                        ) === 1
                };
                break;
            }
            case 'CO': {
                const coverageBindable = this.process.readIntPtr(
                    modObject + 0x20
                );

                const directionBindable = this.process.readIntPtr(
                    modObject + 0x28
                );

                mod.settings = {
                    coverage: this.process.readFloat(coverageBindable + 0x40),
                    direction: this.process.readInt(directionBindable + 0x40)
                };
                break;
            }
        }

        return mod;
    }

    private readGamemode() {
        const rulesetBindable = this.process.readIntPtr(
            this.gameBase() + 0x458
        );
        const rulesetInfo = this.process.readIntPtr(rulesetBindable + 0x20);

        const gamemode = this.process.readInt(rulesetInfo + 0x30);
        return gamemode;
    }

    private selectedGamemode = 0;

    global(): IGlobal {
        const gamemode = this.readGamemode();
        if (this.selectedGamemode !== gamemode)
            this.selectedGamemode = gamemode;

        if (!this.modMappings.has(gamemode.toString())) {
            try {
                this.initModMapping(gamemode);
            } catch (exc) {
                wLogger.error(
                    'lazer',
                    this.pid,
                    'global',
                    'mods',
                    (exc as Error).message
                );
                wLogger.debug('lazer', this.pid, 'global', 'mods', exc);
            }
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

            const modList: Mod[] = [];

            for (let i = 0; i < selectedModsItems.length; i++) {
                const type = this.process.readIntPtr(selectedModsItems[i]);

                const acronym = this.modMappings.get(`${gamemode}-${type}`);

                if (acronym) {
                    modList.push(
                        this.readMod(acronym as any, selectedModsItems[i])
                    );
                }
            }

            let mods = calculateMods(modList, true);
            if (mods instanceof Error)
                mods = Object.assign({}, defaultCalculatedMods);

            this.menuMods = mods;
        }

        const filesFolder = path.join(this.basePath(), 'files');
        const isPlaying = this.player() !== 0;
        const isResultScreen = this.checkIfResultScreen(this.currentScreen);
        const isSongSelect = this.checkIfSongSelect(this.currentScreen);
        const isPlayerLoader = this.checkIfPlayerLoader(this.currentScreen);
        const isEditor = this.checkIfEditor(this.currentScreen);
        const isMultiSelect = this.checkIfMultiSelect(this.currentScreen);
        const isMulti = this.checkIfMulti();

        let isMultiSpectating = false;

        let status = 0;

        if (isPlaying || isPlayerLoader) {
            status = GameState.play;
        } else if (isSongSelect) {
            status = GameState.selectPlay;
        } else if (isResultScreen) {
            status = GameState.resultScreen;
        } else if (isEditor) {
            status = GameState.edit;
        } else if (isMultiSelect) {
            status = GameState.selectMulti;
        } else if (isMulti) {
            const multiplayerClient = this.multiplayerClient();

            const currentRoom = this.process.readIntPtr(
                multiplayerClient + 0x288
            );

            if (currentRoom) {
                status = GameState.lobby;

                isMultiSpectating = this.checkIfMultiSpectator(
                    this.currentScreen
                );
            }
        }

        this.isPlayerLoading = isPlayerLoader;

        if (isPlaying) {
            const dependencies = this.process.readIntPtr(this.player() + 0x490);
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
            isMultiSpectating,
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

    menu(previousChecksum: string): IMenu {
        const beatmap = this.currentBeatmap();
        const checksum = this.process.readSharpStringPtr(beatmap.info + 0x58);

        const gamemode = this.readGamemode();
        const rankedStatus = Number(
            this.lazerToStableStatus[this.process.readInt(beatmap.info + 0x88)]
        );
        if (checksum === previousChecksum) {
            return {
                type: 'checksum',
                gamemode,
                rankedStatus
            };
        }

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
            type: 'update',
            gamemode,
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
            mapID: this.process.readInt(beatmap.info + 0x8c),
            setID: this.process.readInt(beatmap.setInfo + 0x30),
            rankedStatus,
            objectCount: this.process.readInt(beatmap.info + 0x94)
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

    tourneyChat(_messages: ITourneyManagerChatItem[]): ITourneyChat {
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

        // TODO: update once I bother todo it :)
        // const leaderboardScores = this.process.readIntPtr(
        //     player + (this.replayMode ? 0x4e8 : 0x520)
        // );

        // const items = this.readListItems(
        //     this.process.readIntPtr(leaderboardScores + 0x18)
        // );

        // const scores: LeaderboardPlayer[] = [];

        // for (let i = 0; i < items.length; i++) {
        //     scores.push(this.readLeaderboardScore(items[i], i));
        // }

        return [true, personalScore, []];
    }

    readSpectatingData(): ILazerSpectator {
        const multiSpectatorScreen = this.currentScreen;

        const spectatingClients: ILazerSpectatorEntry[] = [];

        const gameplayStates = this.process.readIntPtr(
            multiSpectatorScreen + 0x3e0
        );
        const gameplayStatesEntries = this.process.readIntPtr(
            gameplayStates + 0x10
        );
        const gameplayStatesCount = this.process.readInt(gameplayStates + 0x38);

        const userStates: Record<
            number,
            { team: MultiplayerTeamType; state: MultiplayerUserState }
        > = {};

        const multiplayerClient = this.multiplayerClient();

        const room = this.process.readIntPtr(multiplayerClient + 0x288);

        const multiplayerUsers = this.process.readIntPtr(room + 0x10);
        const multiplayerUsersItems = this.process.readIntPtr(
            multiplayerUsers + 0x8
        );
        const multiplayerUsersCount = this.process.readInt(
            multiplayerUsers + 0x10
        );

        for (let i = 0; i < multiplayerUsersCount; i++) {
            const current = this.process.readIntPtr(
                multiplayerUsersItems + 0x10 + 0x8 * i
            );

            const userId = this.process.readInt(current + 0x28);
            const matchState = this.process.readIntPtr(current + 0x18);

            let team: MultiplayerTeamType = 'none';

            if (matchState) {
                const teamId = this.process.readInt(matchState + 0x8);
                team = teamId === 0 ? 'red' : 'blue';
            }

            const state = this.process.readInt(current + 0x2c);

            userStates[userId] = {
                team,
                state
            };
        }

        for (let i = 0; i < gameplayStatesCount; i++) {
            const current = gameplayStatesEntries + 0x10 + 0x18 * i;

            const state = this.process.readIntPtr(current);

            if (!state) {
                continue;
            }

            const score = this.process.readIntPtr(state + 0x8);
            const scoreInfo = this.process.readIntPtr(score + 0x8);
            const gameplayScore = this.readScore(scoreInfo);

            const apiUser = this.process.readIntPtr(scoreInfo + 0x68);
            const user = this.readUser(apiUser);

            if (gameplayScore instanceof Error) {
                throw gameplayScore;
            }

            if (typeof gameplayScore === 'string') {
                return undefined;
            }

            const userState = userStates[user.id];

            spectatingClients.push({
                team: userState.team,
                user,
                score: gameplayScore,
                resultScreen:
                    userState.state === MultiplayerUserState.Results
                        ? this.buildResultScreen(scoreInfo)
                        : undefined
            });
        }

        // const multiplayerClient = this.multiplayerClient();

        // const room = this.process.readIntPtr(multiplayerClient + 0x288);

        // const roomId = this.process.readInt(room + 0x38);
        // const channelId = this.process.readInt(room + 0x44);

        return { chat: [], spectatingClients };
    }
}
