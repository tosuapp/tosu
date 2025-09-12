export interface BeatmapStrains {
    series: {
        name: string;
        data: number[];
    }[];
    xaxis: number[];
}

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
        realtime: number;
        common: number;
        min: number;
        max: number;
    };
    circles: number;
    sliders: number;
    spinners: number;
    holds: number;
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
    '94': number;
    '93': number;
    '92': number;
    '91': number;
    '90': number;
    strains: number[];
    strainsAll: BeatmapStrains;
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
    geki: number;
    h100: number;
    katu: number;
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
    state: number;
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

interface TourneyHits
    extends Pick<
        GameplayHits,
        | '300'
        | 'geki'
        | '100'
        | 'katu'
        | '50'
        | '0'
        | 'sliderBreaks'
        | 'unstableRate'
        | 'hitErrorArray'
    > {}

export interface GameplayValues {
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

    _isReplayUiHidden: boolean;
}

export interface ResultsScreenValues {
    mode: number;
    name: string;
    score: number;
    accuracy: number;
    maxCombo: number;
    mods: SelectedMods;
    '300': number;
    geki: number;
    '100': number;
    katu: number;
    '50': number;
    '0': number;
    grade: string;
    createdAt: string;
}

interface TourneyMessage {
    team: string;
    time: string;
    name: string;
    messageBody: string;
}

interface TourneyManagerGameplay {
    score: TourneyScore;
}

interface TourneyBools {
    scoreVisible: boolean;
    starsVisible: boolean;
}

interface TourneyName {
    left: string;
    right: string;
}

interface TourneyStars {
    left: number;
    right: number;
}

interface TourneyScore {
    left: number;
    right: number;
}

interface TourneyManager {
    ipcState: number;
    bestOF: number;
    teamName: TourneyName;
    stars: TourneyStars;
    bools: TourneyBools;
    chat: TourneyMessage[];
    gameplay: TourneyManagerGameplay;
}

interface TourneyGameplay {
    gameMode: number;
    score: number;
    name: string;
    /** actually float */
    accuracy: number;
    hits: TourneyHits;
    combo: GameplayCombo;
    mods: SelectedMods;
    hp: GameplayHP;
}

export interface TourneyIpcClient {
    team: string;
    spectating: TourneyIpcSpec;
    gameplay: TourneyGameplay;
}

interface TourneyIpcSpec {
    name: string;
    country: string;
    userID: number;
    /** actually float */
    accuracy: number;
    rankedScore: number;
    playCount: number;
    globalRank: number;
    totalPP: number;
}

export interface TourneyValues {
    manager: TourneyManager;
    ipcClients: TourneyIpcClient[];
}

export interface UserProfileAnswer {
    rawLoginStatus: number;
    name: string;
    accuracy: number;
    rankedScore: number;
    id: number;
    level: number;
    playCount: number;
    playMode: number;
    rank: number;
    countryCode: number;
    performancePoints: number;
    rawBanchoStatus: number;
    backgroundColour: string;
}

export interface GosuCompatibleApi {
    client: string;
    settings: InSettingsValues;
    menu: InMenuValues;
    gameplay: GameplayValues;
    resultsScreen: ResultsScreenValues;
    userProfile: UserProfileAnswer;
    tourney?: TourneyValues;
}

export type ApiAnswer = GosuCompatibleApi | { error?: string };
