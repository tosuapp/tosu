export enum BeatmapStatuses {
    graveyard = '-2',
    wip = '-1',
    pending = 0,
    ranked = 1,
    approved = 2,
    qualified = 3,
    loved = 4
}

export enum Modes {
    osu = 0,
    taiko = 1,
    fruits = 2,
    mania = 3
}

export interface ApiV2Answer {
    state: number;
    session: Session;
    settings: Settings;
    profile: Profile;
    beatmap: Beatmap;
    player: Player;
    leaderboard: Leaderboard[];
    performance: Performance;
    resultsScreen: ResultsScreen;
    folders: Folders;
    files: Files;
    directPath: DirectPath;
    tourney: Tourney | undefined;
}

export interface BeatmapTime {
    live: number;
    firstObject: number;
    lastObject: number;
    mp3Length: number;
}

export interface Session {
    playTime: number;
    playCount: number;
}

export interface Settings {
    interfaceVisible: boolean;
    chatVisible: number;
    beatmapHasLeaderboard: boolean;
    leaderboardVisible: boolean;
    replayUIVisible: boolean;
    connectedToBancho: boolean;
    bassDensity: number;
    mode: Mode;
}

export interface Mode {
    number: number;
    name: string;
}

export interface Profile {
    id: number;
    name: string;
    mode: Mode;
    rankedScore: number;
    level: number;
    accuracy: number;
    pp: number;
    playCount: number;
    globalRank: number;
    countryCode: CountryCode;
    backgroundColour: string;
}

export interface CountryCode {
    code: number;
}

export interface Beatmap {
    time: BeatmapTime;
    status: Status;
    checksum: string;
    id: number;
    set: number;
    artist: string;
    artistUnicode: string;
    title: string;
    titleUnicode: string;
    mapper: string;
    version: string;
    stats: Stats;
}

export interface Status {
    number: number;
    name: string;
}

export interface Stats {
    stars: Stars;
    AR: Ar;
    CS: Cs;
    OD: Od;
    HP: Hp;
    bpm: Bpm;
    objects: Objects;
    maxCombo: number;
}

export interface Stars {
    live: number;
    aim: number | undefined;
    speed: number | undefined;
    flashlight: number | undefined;
    sliderFactor: number | undefined;
    stamina: number | undefined;
    rhythm: number | undefined;
    color: number | undefined;
    peak: number | undefined;
    hitWindow: number | undefined;
    total: number;
}

export interface Ar {
    original: number;
    converted: number;
}

export interface Cs {
    original: number;
    converted: number;
}

export interface Od {
    original: number;
    converted: number;
}

export interface Hp {
    original: number;
    converted: number;
}

export interface Bpm {
    common: number;
    min: number;
    max: number;
}

export interface Objects {
    circles: number;
    sliders: number;
    spinners: number;
    holds: number;
    total: number;
}

export interface Player {
    mode: Mode2;
    name: string;
    score: number;
    accuracy: number;
    healthBar: HealthBar;
    hits: Hits;
    hitErrorArray: any[];
    combo: Combo;
    mods: Mods;
    rank: Rank;
    pp: Pp;
}

export interface Mode2 {
    number: number;
    name: string;
}

export interface HealthBar {
    normal: number;
    smooth: number;
}

export interface Hits {
    '0': number;
    '50': number;
    '100': number;
    '300': number;
    geki: number;
    katu: number;
    sliderBreaks: number;
    unstableRate: number;
}

export interface Combo {
    current: number;
    max: number;
}

export interface Mods {
    number: number;
    name: string;
}

export interface Rank {
    current: string;
    maxThisPlay: string;
}

export interface Pp {
    current: number;
    fc: number;
    maxAchievedThisPlay: number;
}

export interface Leaderboard {
    isFailed: boolean;
    position: number;
    team: number;
    name: string;
    score: number;
    accuracy: number;
    hits: Hits2;
    combo: Combo2;
    mods: Mods2;
    rank: string;
}

export interface Hits2 {
    '0': number;
    '50': number;
    '100': number;
    '300': number;
    geki: number;
    katu: number;
}

export interface Combo2 {
    current: number;
    max: number;
}

export interface Mods2 {
    number: number;
    name: string;
}

export interface KeyOverlay {
    k1: K1;
    k2: K2;
    m1: M1;
    m2: M2;
}

export interface K1 {
    isPressed: boolean;
    count: number;
}

export interface K2 {
    isPressed: boolean;
    count: number;
}

export interface M1 {
    isPressed: boolean;
    count: number;
}

export interface M2 {
    isPressed: boolean;
    count: number;
}

export interface Performance {
    accuracy: Accuracy;
    graph: Graph;
}

export interface Accuracy {
    '95': number;
    '96': number;
    '97': number;
    '98': number;
    '99': number;
    '100': number;
}

export interface Graph {
    series: Series[];
    xaxis: number[];
}

export interface Series {
    name: string;
    data: number[];
}

export interface ResultsScreen {
    mode: string;
    score: number;
    name: string;
    hits: Hits3;
    mods: Mods3;
    maxCombo: number;
    rank: string;
    createdAt: string;
}

export interface Hits3 {
    '0': number;
    '50': number;
    '100': number;
    '300': number;
    geki: number;
    katu: number;
    unstableRate: string;
}

export interface Mods3 {
    number: number;
    name: string;
}

export interface Folders {
    game: string;
    skin: string;
    songs: string;
    beatmap: string;
}

export interface Files {
    beatmap: string;
    background: string;
    audio: string;
}

export interface DirectPath {
    beatmapFile: string;
    beatmapBackground: string;
    beatmapAudio: string;
    beatmapFolder: string;
    skinFolder: string;
    collections: string;
    osudb: string;
    scoresdb: string;
}

export interface Tourney {
    scoreVisible: boolean;
    starsVisible: boolean;

    ipcState: number;
    bestOF: number;

    team: {
        left: string;
        right: string;
    };
    points: {
        left: number;
        right: number;
    };
    totalScore: {
        left: number;
        right: number;
    };

    chat: TourneyChatMessages[];
    clients: TourneyClients[];
}

export interface TourneyChatMessages {
    team: string;
    name: string;
    message: string;
    timestamp: string;
}

export interface TourneyClients {
    team: 'left' | 'right';
    user: {
        id: number;
        name: string;
        country: string;
        accuracy: number;
        rankedScore: number;
        playCount: number;
        globalRank: number;
        totalPP: number;
    };
    play: {
        mode: {
            number: number;
            name: string;
        };

        name: string;

        score: number;
        accuracy: number;

        healthBar: {
            normal: number;
            smooth: number;
        };
        hits: {
            300: number;
            geki: number;
            100: number;
            katu: number;
            50: number;
            0: number;
            sliderBreaks: number;
            unstableRate: number;
        };

        hitErrorArray: number[];

        mods: {
            num: number;
            str: string;
        };
        combo: {
            current: number;
            max: number;
        };
        rank: {
            current: string;
            maxThisPlay: string;
        };
        pp: {
            current: number;
            fc: number;
            maxAchievedThisPlay: number;
        };
    };
}

export interface ApiKeypressAnswer extends KeyOverlay {
    bpm: Bpm;
}
