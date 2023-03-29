export interface InSettingsValues {
    showInterface: boolean;
    folders: {
        game: string;
        skin: string;
        songs: string;
    };
}

interface BeatmapPaths {
    full: string;
    folder: string;
    file: string;
    bg: string;
    audio: string;
}

interface BeatmapStats {
    AR: number;
    CS: number;
    OD: number;
    HP: number;
    SR: number;
    BPM: {
        min: number;
        max: number;
    };
    maxCombo: number;
    fullSR: number;
    memoryAR: number;
    memoryCS: number;
    memoryOD: number;
    memoryHP: number;
}
interface BeatmapMetadata {
    artist: string;
    artistOriginal: string;
    title: string;
    titleOriginal: string;
    mapper: string;
    difficulty: string;
}
interface BeatmapTimings {
    firstObj: number;
    current: number;
    full: number;
    mp3: number;
}
interface Beatmap {
    time: BeatmapTimings;
    id: number;
    set: number;
    md5: string;
    // TODO: make ranked status enum
    rankedStatus: number;
    metadata: BeatmapMetadata;
    stats: BeatmapStats;
    path: BeatmapPaths;
}

interface SelectedMods {
    num: number;
    str: string;
}

interface PP {
    '100': number;
    '99': number;
    '98': number;
    '97': number;
    '96': number;
    '95': number;
    strains: number[];
}

interface GameplayPP {
    current: number;
    fc: number;
    maxThisPlay: number;
}

export interface LeaderboardPlayer {
    name: string;
    score: number;
    combo: number;
    maxCombo: number;
    mods: string;
    h300: number;
    h100: number;
    h50: number;
    h0: number;
    team: number;
    position: number;
    isPassing: number;
}

interface Leaderboard {
    hasLeaderboard: boolean;
    isVisible: boolean;
    ourplayer: LeaderboardPlayer;
    slots: LeaderboardPlayer[];
}

interface KeyOverlay {
    k1: KeyOverlayButton;
    k2: KeyOverlayButton;
    m1: KeyOverlayButton;
    m2: KeyOverlayButton;
}

interface KeyOverlayButton {
    isPressed: boolean;
    count: number;
}

/**
 * Most of in-game menu values, such as selected beatmap, game status, current pp for map, etc...
 */
export interface InMenuValues {
    mainMenu: {
        /**
         * Actually a float!
         */
        bassDensity: number;
    };
    // TODO: Make enum for osu in-game statuses
    state: number;
    // TODO: Make enum for osu in-game modes
    gameMode: number;
    isChatEnabled: number;
    bm: Beatmap;
    mods: SelectedMods;
    pp: PP;
}

interface GameplayGrade {
    current: string;
    maxThisPlay: string;
}

interface GameplayCombo {
    current: number;
    max: number;
}

interface GameplayHP {
    normal: number;
    smooth: number;
}

interface GameplayHits {
    '300': number;
    geki: number;
    '100': number;
    katu: number;
    '50': number;
    '0': number;
    sliderBreaks: number;
    grade: GameplayGrade;
    unstableRate: number;
    hitErrorArray: number[];
}

export interface GameplayValues {
    // TODO: Make enum for osu in-game modes
    gameMode: number;
    name: string;
    score: number;
    accuracy: number;
    combo: GameplayCombo;
    hp: GameplayHP;
    hits: GameplayHits;
    pp: GameplayPP;
    keyOverlay: KeyOverlay;
    leaderboard: Leaderboard;
}

export interface ResultsScreenValues {
    name: string;
    score: number;
    maxCombo: number;
    mods: SelectedMods;
    '300': number;
    geki: number;
    '100': number;
    katu: number;
    '50': number;
    '0': number;
}

export interface TourneyValues {}

export interface ApiAnswer {
    settings: InSettingsValues;
    menu: InMenuValues;
    gameplay: GameplayValues;
    resultsScreen: ResultsScreenValues;
    // TODO: not implemented yet
    tourney?: TourneyValues;
}
