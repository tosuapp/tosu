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
import { netDateBinaryToDate } from '@/utils/converters';
import { getOsuModsNumber } from '@/utils/osuMods';
import { OsuMods } from '@/utils/osuMods.types';
import type { BindingsList, ConfigList } from '@/utils/settings.types';

type LazerPatternData = {
    spectatorClient: number;
};

interface ModAcronym {
    acronym: string;
}

interface ModItem {
    type: number;
}

interface Statistics {
    great: number;
    ok: number;
    meh: number;
    miss: number;
}

interface KeyCounter {
    isPressed: boolean;
    count: number;
}

type ModMapping = {
    EZ: ModItem;
    NF: ModItem;
    HT: ModItem;
    DC: ModItem;
    HR: ModItem;
    SD: ModItem;
    PF: ModItem;
    DT: ModItem;
    NC: ModItem;
    HD: ModItem;
    FL: ModItem;
    BL: ModItem;
    ST: ModItem;
    AC: ModItem;
    TP: ModItem;
    DA: ModItem;
    CL: ModItem;
    RD: ModItem;
    MR: ModItem;
    AL: ModItem;
    SG: ModItem;
    AT: ModItem;
    CN: ModItem;
    RX: ModItem;
    AP: ModItem;
    SO: ModItem;
    TR: ModItem;
    WG: ModItem;
    SI: ModItem;
    GR: ModItem;
    DF: ModItem;
    WU: ModItem;
    WD: ModItem;
    TC: ModItem;
    BR: ModItem;
    AD: ModItem;
    MU: ModItem;
    NS: ModItem;
    MG: ModItem;
    RP: ModItem;
    AS: ModItem;
    FR: ModItem;
    BU: ModItem;
    SY: ModItem;
    DP: ModItem;
    TD: ModItem;
    SV2: ModItem;
};

export class LazerMemory extends AbstractMemory<LazerPatternData> {
    private scanPatterns: ScanPatterns = {
        spectatorClient: {
            pattern:
                '3F 00 00 80 3F 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 80 3F 00 00 80 3F 00 00 80 3F 00 00 80 3F 00 00 80 3F 00 00 80 3F 00 00 80 3F 00 00 80 3F 00 00 80 3F 00 00 80 3F 00 00 80 3F 00 00 80 3F 00 00 80 3F 00 00 80 3F 00 00 80 3F 00 00 80 3F 01 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 ?? 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00',
            offset: -0x16f
        }
    };

    private modsInitialized = false;
    private menuMods: OsuMods = 0;

    private currentScreen: number = 0;

    private replayMode: boolean = false;

    private modMapping: ModMapping = {
        EZ: { type: 0 },
        NF: { type: 0 },
        HT: { type: 0 },
        DC: { type: 0 },
        HR: { type: 0 },
        SD: { type: 0 },
        PF: { type: 0 },
        DT: { type: 0 },
        NC: { type: 0 },
        HD: { type: 0 },
        FL: { type: 0 },
        BL: { type: 0 },
        ST: { type: 0 },
        AC: { type: 0 },
        TP: { type: 0 },
        DA: { type: 0 },
        CL: { type: 0 },
        RD: { type: 0 },
        MR: { type: 0 },
        AL: { type: 0 },
        SG: { type: 0 },
        AT: { type: 0 },
        CN: { type: 0 },
        RX: { type: 0 },
        AP: { type: 0 },
        SO: { type: 0 },
        TR: { type: 0 },
        WG: { type: 0 },
        SI: { type: 0 },
        GR: { type: 0 },
        DF: { type: 0 },
        WU: { type: 0 },
        WD: { type: 0 },
        TC: { type: 0 },
        BR: { type: 0 },
        AD: { type: 0 },
        MU: { type: 0 },
        NS: { type: 0 },
        MG: { type: 0 },
        RP: { type: 0 },
        AS: { type: 0 },
        FR: { type: 0 },
        BU: { type: 0 },
        SY: { type: 0 },
        DP: { type: 0 },
        TD: { type: 0 },
        SV2: { type: 0 }
    };

    private typeToMod: Record<number, string> = {};

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

    private readListItems(list: number): number[] {
        const size = this.process.readInt(list + 0x10);
        const items = this.process.readIntPtr(list + 0x8);

        const result: number[] = [];

        for (let i = 0; i < size; i++) {
            const current = this.process.readIntPtr(items + 0x10 + 0x8 * i);

            result.push(current);
        }

        return result;
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

    private initModMapping() {
        const availableModsDict = this.process.readIntPtr(
            this.process.readIntPtr(this.gameBase() + 0x468) + 0x20
        );
        const entries = this.process.readIntPtr(availableModsDict + 0x10);

        const diffReducingModsList = this.process.readIntPtr(entries + 0x10);
        const diffIncreasingModsList = this.process.readIntPtr(entries + 0x28);
        const conversionModsList = this.process.readIntPtr(entries + 0x40);
        const automationModsList = this.process.readIntPtr(entries + 0x58);
        const funModsList = this.process.readIntPtr(entries + 0x70);
        const systemModsList = this.process.readIntPtr(entries + 0x88);

        const diffReducingMods = this.readModList(diffReducingModsList);
        const diffIncreasingMods = this.readModList(diffIncreasingModsList);
        const conversionMods = this.readModList(conversionModsList);
        const automationMods = this.readModList(automationModsList);
        const funMods = this.readModList(funModsList);
        const systemMods = this.readModList(systemModsList);

        const diffReductionCategory = ['EZ', 'NF', 'HT', 'DC'];
        const diffIncreasingCategory = [
            'HR',
            'SD',
            'PF',
            'DT',
            'NC',
            'HD',
            'FL',
            'BL',
            'ST',
            'AC'
        ];
        const conversionCategory = ['TP', 'DA', 'CL', 'RD', 'MR', 'AL', 'SG'];
        const automationCategory = ['AT', 'CN', 'RX', 'AP', 'SO'];
        const funCategory = [
            'TR',
            'WG',
            'SI',
            'GR',
            'DF',
            'WU',
            'WD',
            'TC',
            'BR',
            'AD',
            'MU',
            'NS',
            'MG',
            'RP',
            'AS',
            'FR',
            'BU',
            'SY',
            'DP'
        ];
        const systemCategory = ['TD', 'SV2'];

        for (let i = 0; i < diffReductionCategory.length; i++) {
            this.modMapping[diffReductionCategory[i]].type =
                diffReducingMods[i];
        }

        for (let i = 0; i < diffIncreasingCategory.length; i++) {
            this.modMapping[diffIncreasingCategory[i]].type =
                diffIncreasingMods[i];
        }

        for (let i = 0; i < conversionCategory.length; i++) {
            this.modMapping[conversionCategory[i]].type = conversionMods[i];
        }

        for (let i = 0; i < automationCategory.length; i++) {
            this.modMapping[automationCategory[i]].type = automationMods[i];
        }

        for (let i = 0; i < funCategory.length; i++) {
            this.modMapping[funCategory[i]].type = funMods[i];
        }

        for (let i = 0; i < systemCategory.length; i++) {
            this.modMapping[systemCategory[i]].type = systemMods[i];
        }

        for (const mod of Object.entries(this.modMapping)) {
            this.typeToMod[mod[1].type] = mod[0];
        }
    }

    private mods(scoreInfo: number): string[] {
        if (!scoreInfo) {
            return [];
        }

        const mods = this.process.readSharpStringPtr(scoreInfo + 0x50);

        if (mods.length === 0) {
            return [];
        }

        const modAcronyms = JSON.parse(mods) as ModAcronym[];

        return modAcronyms.map((x) => x.acronym);
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

    private readStatistics(scoreInfo: number): Statistics | undefined {
        const statistics = this.process.readIntPtr(scoreInfo + 0x78);

        const readFromJson =
            !statistics ||
            (statistics && this.process.readInt(statistics + 0x38) === 4);

        // TODO: support all modes
        if (readFromJson) {
            return JSON.parse(
                this.process.readSharpStringPtr(scoreInfo + 0x58)
            );
        } else {
            const statisticsEntries = this.process.readIntPtr(
                statistics + 0x10
            );

            if (!statisticsEntries) {
                return undefined;
            }

            return {
                miss: this.process.readInt(statisticsEntries + 0x2c),
                meh: this.process.readInt(statisticsEntries + 0x3c),
                ok: this.process.readInt(statisticsEntries + 0x4c),
                great: this.process.readInt(statisticsEntries + 0x6c)
            };
        }
    }

    private readLeaderboardScore(
        scoreInfo: number,
        index: number
    ): LeaderboardPlayer {
        const mods = getOsuModsNumber(this.mods(scoreInfo));

        const realmUser = this.process.readIntPtr(scoreInfo + 0x48);
        const username = this.process.readSharpStringPtr(realmUser + 0x18);

        let statistics = this.readStatistics(scoreInfo);

        if (!statistics) {
            statistics = {
                great: 0,
                ok: 0,
                meh: 0,
                miss: 0
            };
        }

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

    private readScore(
        scoreInfo: number,
        health: number = 0,
        retries: number = 0
    ): IGameplay {
        const statistics = this.readStatistics(scoreInfo);

        if (!statistics) {
            return 'No Statistics';
        }

        const mods = getOsuModsNumber(this.mods(scoreInfo));

        const realmUser = this.process.readIntPtr(scoreInfo + 0x48);
        const ruleset = this.process.readIntPtr(scoreInfo + 0x30);
        const mode = this.process.readInt(ruleset + 0x30);
        const username = this.process.readSharpStringPtr(realmUser + 0x18);

        return {
            retries,
            playerName: username,
            mods,
            mode,
            score: this.process.readLong(scoreInfo + 0x98),
            playerHPSmooth: health,
            playerHP: health,
            accuracy: this.process.readDouble(scoreInfo + 0xa8) * 100,
            hit100: statistics.ok,
            hit300: statistics.great,
            hit50: statistics.meh,
            hitGeki: 0,
            hitKatu: 0,
            hitMiss: statistics.miss,
            combo: this.process.readInt(scoreInfo + 0xcc),
            maxCombo: this.process.readInt(scoreInfo + 0xc4)
        };
    }

    getScanPatterns(): ScanPatterns {
        return this.scanPatterns;
    }

    audioVelocityBase(): IAudioVelocityBase {
        return [];
    }

    user(): IUser {
        return {
            name: 'Guest',
            accuracy: 0,
            rankedScore: 0,
            id: 0,
            level: 0,
            playCount: 0,
            playMode: 0,
            rank: 1,
            countryCode: 0,
            performancePoints: 0,
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
        const scoreInfo = this.process.readIntPtr(this.currentScreen + 0x398);

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
            date
        };
    }

    gameplay(): IGameplay {
        const player = this.player();
        const scoreInfo = this.scoreInfo(player);

        const healthProcessor = this.process.readIntPtr(player + 0x440);
        const healthBindable = this.process.readIntPtr(healthProcessor + 0x230);
        const health = this.process.readDouble(healthBindable + 0x30); // 0..1

        return this.readScore(
            scoreInfo,
            health,
            this.process.readInt(player + 0x38c)
        );
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

        if (mode !== 0) {
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
            M1Pressed: false,
            M1Count: 0,
            M2Pressed: false,
            M2Count: 0
        };
    }

    hitErrors(): IHitErrors {
        return [];
    }

    global(): IGlobal {
        if (!this.modsInitialized) {
            this.initModMapping();
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

            const modAcronyms: string[] = [];

            for (let i = 0; i < selectedModsItems.length; i++) {
                const type = this.process.readIntPtr(selectedModsItems[i]);

                const mod = this.typeToMod[type];

                if (mod) {
                    modAcronyms.push(mod);
                }
            }

            this.menuMods = getOsuModsNumber(modAcronyms);
        }

        const filesFolder = path.join(this.basePath(), 'files');
        const isPlaying = this.player() !== 0;
        const isResultScreen = this.checkIfResultScreen(this.currentScreen);

        let status = 0;

        if (isPlaying) {
            status = 2;
        } else if (isResultScreen) {
            status = 7;
        }

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
            time: this.currentTime()
        };
    }

    menu(previousChecksum: string): IMenu {
        const beatmap = this.currentBeatmap();
        const checksum = this.process.readSharpStringPtr(beatmap.info + 0x58);

        if (checksum === previousChecksum) {
            return '';
        }

        const rulesetInfo = this.process.readIntPtr(beatmap.info + 0x20);
        const metadata = this.process.readIntPtr(beatmap.info + 0x30);
        const difficulty = this.process.readIntPtr(beatmap.info + 0x28);
        const hash = this.process.readSharpStringPtr(beatmap.info + 0x50);
        const author = this.process.readIntPtr(metadata + 0x38);

        const files = this.getBeatmapFiles(beatmap.setInfo);

        const audioFilename =
            files[this.process.readSharpStringPtr(metadata + 0x50)];
        const backgroundFilename =
            files[this.process.readSharpStringPtr(metadata + 0x58)];

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
            difficulty: this.process.readSharpStringPtr(metadata + 0x18),
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

        return this.process.readDouble(sourceTrack + 0x48);
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
