export type ApiAnswer = scAPI | { error?: string };

export interface scAPI {
    osuIsRunning: number;
    chatIsEnabled: number;
    ingameInterfaceIsEnabled: number;
    isBreakTime: number;

    banchoUsername: string;
    banchoId: number;
    banchoIsConnected: number;
    banchoCountry: string;
    banchoStatus: number;

    artistUnicode: string;
    artistRoman: string;

    titleRoman: string;
    titleUnicode: string;

    mapArtistTitleUnicode: string;
    mapArtistTitle: string;

    diffName: string;
    mapDiff: string;

    creator: string;

    liveStarRating: number;
    mStars: number;

    mAR: number;
    ar: number;

    mOD: number;
    od: number;

    cs: number;
    mCS: number;

    hp: number;
    mHP: number;

    currentBpm: number;
    bpm: number;

    mainBpm: number;
    maxBpm: number;
    minBpm: number;

    mMainBpm: number;
    mMaxBpm: number;
    mMinBpm: number;

    mBpm: string;

    md5: string;

    gameMode: string;
    mode: number;

    time: number;
    previewtime: number;
    totaltime: number;
    timeLeft: string;
    drainingtime: number;
    totalAudioTime: number;
    firstHitObjectTime: number;

    mapid: number;
    mapsetid: number;
    mapStrains: { [key: string]: number };
    mapBreaks: {
        startTime: number;
        endTime: number;
        hasEffect: boolean;
    }[];
    mapKiaiPoints: {
        startTime: number;
        duration: number;
    }[];
    mapPosition: string;
    mapTimingPoints: {
        startTime: number;
        bpm?: number;
        beatLength: number;
    }[];

    sliders: number;
    circles: number;
    spinners: number;
    maxCombo: number;

    mp3Name: string;
    osuFileName: string;
    backgroundImageFileName: string;

    osuFileLocation: string;
    backgroundImageLocation: string;

    retries: number;

    username: string;

    score: number;

    playerHp: number;
    playerHpSmooth: number;

    combo: number;
    currentMaxCombo: number;

    keyOverlay: string;

    geki: number;
    c300: number;
    katsu: number;
    c100: number;
    c50: number;
    miss: number;
    sliderBreaks: number;

    acc: number;
    unstableRate: number;
    convertedUnstableRate: number;

    grade: number;
    maxGrade: number;

    hitErrors: number[];

    modsEnum: number;
    mods: string;

    ppIfMapEndsNow: number;
    ppIfRestFced: number;

    leaderBoardMainPlayer: string;
    leaderBoardPlayers: string;

    rankedStatus: number;
    songSelectionRankingType: number;
    rawStatus: number;

    dir: string;
    dl: string;

    osu_90PP: number;
    osu_95PP: number;
    osu_96PP: number;
    osu_97PP: number;
    osu_98PP: number;
    osu_99PP: number;
    osu_99_9PP: number;
    osu_SSPP: number;

    osu_m90PP: number;
    osu_m95PP: number;
    osu_m96PP: number;
    osu_m97PP: number;
    osu_m98PP: number;
    osu_m99PP: number;
    osu_m99_9PP: number;
    osu_mSSPP: number;

    accPpIfMapEndsNow: number;
    aimPpIfMapEndsNow: number;
    speedPpIfMapEndsNow: number;
    strainPpIfMapEndsNow: number;
    noChokePp: number;

    skinPath: string;
    skin: string;

    songSelectionScores: string;
    songSelectionMainPlayerScore: string;

    songSelectionTotalScores: number;
    status: number;

    mania_m1_000_000PP: number;
    mania_1_000_000PP: number;

    simulatedPp: number;

    plays: number;
    tags: string;
    source: string;

    starsNomod: number;
    comboLeft: number;

    localTime: number;
    localTimeISO: string;

    sl: number;
    sv: number;
    threadid: number;
    test: string;
}
