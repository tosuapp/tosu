import {
    CountryCodes,
    GameState,
    GradeEnum,
    Rulesets,
    config,
    formatMilliseconds
} from '@tosu/common';
import path from 'path';

import { InstanceManager } from '@/instances/manager';
import { fixDecimals } from '@/utils/converters';

import { ApiAnswer } from '../types/sc';

export const buildResult = (instanceManager: InstanceManager): ApiAnswer => {
    const osuInstance = instanceManager.getInstance(
        instanceManager.focusedClient
    );
    if (!osuInstance) {
        return { error: 'not_ready' };
    }

    const { settings, global, menu, gameplay, resultScreen, beatmapPP, user } =
        osuInstance.getServices([
            'settings',
            'global',
            'menu',
            'gameplay',
            'resultScreen',
            'beatmapPP',
            'user'
        ]);

    const currentMods =
        global.status === GameState.play
            ? gameplay.mods
            : global.status === GameState.resultScreen
              ? resultScreen.mods
              : global.menuMods;

    const currentMode =
        global.status === GameState.play
            ? gameplay.mode
            : global.status === GameState.resultScreen
              ? resultScreen.mode
              : menu.gamemode;

    return {
        osuIsRunning: 1,
        chatIsEnabled: global.chatStatus > 0 ? 1 : 0,
        ingameInterfaceIsEnabled: global.showInterface ? 1 : 0,
        isBreakTime: 0, // TODO

        banchoIsConnected: user.rawLoginStatus === 65793 ? 1 : 0,
        banchoId: user.id,
        banchoUsername: user.name,
        banchoStatus: user.rawLoginStatus,
        banchoCountry: CountryCodes[user.countryCode]?.toUpperCase() || '',

        artistRoman: menu.artist,
        artistUnicode: menu.artistOriginal,

        titleRoman: menu.title,
        titleUnicode: menu.titleOriginal,

        mapArtistTitle: `${menu.artist} - ${menu.title}`,
        mapArtistTitleUnicode: `${menu.artistOriginal} - ${menu.titleOriginal}`,

        diffName: menu.difficulty,
        mapDiff: `[${menu.difficulty}]`,

        creator: menu.creator,

        liveStarRating: fixDecimals(beatmapPP.currAttributes.stars),
        mStars: fixDecimals(beatmapPP.calculatedMapAttributes.fullStars),

        ar: fixDecimals(beatmapPP.calculatedMapAttributes.ar),
        mAR: fixDecimals(beatmapPP.calculatedMapAttributes.arConverted),

        od: fixDecimals(beatmapPP.calculatedMapAttributes.od),
        mOD: fixDecimals(beatmapPP.calculatedMapAttributes.odConverted),

        cs: fixDecimals(beatmapPP.calculatedMapAttributes.cs),
        mCS: fixDecimals(beatmapPP.calculatedMapAttributes.csConverted),

        hp: fixDecimals(beatmapPP.calculatedMapAttributes.hp),
        mHP: fixDecimals(beatmapPP.calculatedMapAttributes.hpConverted),

        currentBpm: Math.round(beatmapPP.realtimeBPM),
        bpm: Math.round(beatmapPP.commonBPM),

        mainBpm: Math.round(beatmapPP.commonBPM),
        maxBpm: Math.round(beatmapPP.maxBPM),
        minBpm: Math.round(beatmapPP.minBPM),

        mMainBpm: Math.round(beatmapPP.commonBPM),
        mMaxBpm: Math.round(beatmapPP.maxBPM),
        mMinBpm: Math.round(beatmapPP.minBPM),

        mBpm:
            beatmapPP.minBPM === beatmapPP.maxBPM
                ? beatmapPP.maxBPM.toString()
                : `${Math.round(beatmapPP.minBPM)}-${Math.round(beatmapPP.maxBPM)} (${Math.round(beatmapPP.commonBPM)})`,

        md5: menu.checksum,

        gameMode: Rulesets[currentMode],
        mode: currentMode,

        time: global.playTime / 1000,
        previewtime: beatmapPP.previewtime,
        totaltime: beatmapPP.timings.full,
        timeLeft: formatMilliseconds(beatmapPP.timings.full - global.playTime), // convert to osu format
        drainingtime: beatmapPP.timings.full - beatmapPP.timings.firstObj,
        totalAudioTime: menu.mp3Length,
        firstHitObjectTime: beatmapPP.timings.firstObj,

        mapid: menu.mapID,
        mapsetid: menu.setID,
        mapStrains: beatmapPP.strainsAll.xaxis.reduce((acc, v, ind) => {
            const value = beatmapPP.strainsAll.series[0].data[ind];
            acc[v] = value <= 0 ? 0 : value;
            return acc;
        }, {}),
        mapBreaks: beatmapPP.breaks.map((r) => ({
            startTime: r.start,
            endTime: r.end,
            hasEffect: r.hasEffect
        })),
        mapKiaiPoints: [], // TODO: add
        mapPosition: formatMilliseconds(global.playTime), // convert to osu format
        mapTimingPoints: beatmapPP.timingPoints.map((r) => ({
            startTime: r.group?.startTime || 0,
            beatLength: r.beatLength
        })),

        sliders: beatmapPP.calculatedMapAttributes.sliders,
        circles: beatmapPP.calculatedMapAttributes.circles,
        spinners: beatmapPP.calculatedMapAttributes.spinners,
        maxCombo: beatmapPP.calculatedMapAttributes.maxCombo,

        mp3Name: menu.audioFilename,
        osuFileName: menu.filename,
        backgroundImageFileName: menu.backgroundFilename,

        osuFileLocation: path.join(menu.folder || '', menu.filename || ''),
        backgroundImageLocation: path.join(
            menu.folder || '',
            menu.backgroundFilename || ''
        ),

        retries: gameplay.retries,
        username: gameplay.playerName,

        score: gameplay.score,

        playerHp: gameplay.playerHP,
        playerHpSmooth: gameplay.playerHPSmooth,

        combo: gameplay.combo,
        currentMaxCombo: gameplay.maxCombo,

        keyOverlay: JSON.stringify({
            Enabled: config.enableKeyOverlay,
            K1Pressed: gameplay.keyOverlay.K1Pressed,
            K1Count: gameplay.keyOverlay.K1Count,
            K2Pressed: gameplay.keyOverlay.K2Pressed,
            K2Count: gameplay.keyOverlay.K2Count,
            M1Pressed: gameplay.keyOverlay.M1Pressed,
            M1Count: gameplay.keyOverlay.M1Count,
            M2Pressed: gameplay.keyOverlay.M2Pressed,
            M2Count: gameplay.keyOverlay.M2Count
        }),

        geki: gameplay.hitGeki,
        c300: gameplay.hit300,
        katsu: gameplay.hitKatu,
        c100: gameplay.hit100,
        c50: gameplay.hit50,
        miss: gameplay.hitMiss,
        sliderBreaks: gameplay.hitSB,

        acc: fixDecimals(gameplay.accuracy),
        unstableRate: fixDecimals(gameplay.unstableRate * currentMods.rate),
        convertedUnstableRate: fixDecimals(gameplay.unstableRate),

        grade: GradeEnum[gameplay.gradeCurrent],
        maxGrade: GradeEnum[gameplay.gradeExpected],

        hitErrors: gameplay.hitErrors,

        mods: currentMods.name,
        modsEnum: currentMods.number,

        ppIfMapEndsNow: fixDecimals(beatmapPP.currAttributes.pp),
        ppIfRestFced: fixDecimals(beatmapPP.currAttributes.fcPP),

        leaderBoardMainPlayer: JSON.stringify({
            IsLeaderboardVisible: gameplay.isLeaderboardVisible,
            Username: gameplay.leaderboardPlayer.name,
            Score: gameplay.leaderboardPlayer.score,
            Combo: gameplay.leaderboardPlayer.combo,
            MaxCombo: gameplay.leaderboardPlayer.maxCombo,
            Mods: {
                ModsXor1: -1,
                ModsXor2: -1,
                Value: gameplay.leaderboardPlayer.mods.number
            },
            Hit300: gameplay.leaderboardPlayer.h300,
            Hit100: gameplay.leaderboardPlayer.h100,
            Hit50: gameplay.leaderboardPlayer.h50,
            HitMiss: gameplay.leaderboardPlayer.h0,
            Team: gameplay.leaderboardPlayer.team,
            Position: gameplay.leaderboardPlayer.position,
            IsPassing: gameplay.leaderboardPlayer.isPassing
        }),

        leaderBoardPlayers: JSON.stringify(
            gameplay.leaderboardScores.map((score) => ({
                Username: score.name,
                Score: score.score,
                Combo: score.combo,
                MaxCombo: score.maxCombo,
                Mods: {
                    ModsXor1: -1,
                    ModsXor2: -1,
                    Value: score.mods.number
                },
                Hit300: score.h300,
                Hit100: score.h100,
                Hit50: score.h50,
                HitMiss: score.h0,
                Team: score.team,
                Position: score.position,
                IsPassing: score.isPassing
            }))
        ),
        rankedStatus: menu.rankedStatus,
        songSelectionRankingType: settings.leaderboardType,
        rawStatus: global.status,

        dir: menu.folder,
        dl: `https://osu.ppy.sh/b/${menu.mapID}`,

        osu_90PP: fixDecimals(beatmapPP.ppAcc[90]),
        osu_95PP: fixDecimals(beatmapPP.ppAcc[95]),
        osu_96PP: fixDecimals(beatmapPP.ppAcc[96]),
        osu_97PP: fixDecimals(beatmapPP.ppAcc[97]),
        osu_98PP: fixDecimals(beatmapPP.ppAcc[98]),
        osu_99PP: fixDecimals(beatmapPP.ppAcc[99]),
        osu_SSPP: fixDecimals(beatmapPP.ppAcc[100]),
        osu_m90PP: fixDecimals(beatmapPP.ppAcc[90]),
        osu_m95PP: fixDecimals(beatmapPP.ppAcc[95]),
        osu_m96PP: fixDecimals(beatmapPP.ppAcc[96]),
        osu_m97PP: fixDecimals(beatmapPP.ppAcc[97]),
        osu_m98PP: fixDecimals(beatmapPP.ppAcc[98]),
        osu_m99PP: fixDecimals(beatmapPP.ppAcc[99]),
        osu_mSSPP: fixDecimals(beatmapPP.ppAcc[100]),

        accPpIfMapEndsNow: fixDecimals(beatmapPP.currPPAttributes.ppAccuracy),
        aimPpIfMapEndsNow: fixDecimals(beatmapPP.currPPAttributes.ppAim),
        speedPpIfMapEndsNow: fixDecimals(beatmapPP.currPPAttributes.ppSpeed),
        strainPpIfMapEndsNow: fixDecimals(
            beatmapPP.currPPAttributes.ppDifficulty
        ),
        noChokePp: fixDecimals(beatmapPP.currAttributes.fcPP), // TODO: idk if it's correct

        skin: global.skinFolder,
        skinPath: global.skinFolder,

        // todo or skip
        songSelectionScores: '[]',
        songSelectionMainPlayerScore: '{}',

        songSelectionTotalScores: -1,
        status: global.status,

        osu_99_9PP: -1,
        osu_m99_9PP: -1,
        mania_1_000_000PP: -1,
        mania_m1_000_000PP: -1,
        simulatedPp: -1,

        plays: 0,
        tags: '',
        source: '',

        starsNomod: -1,
        comboLeft: -1, // TODO: we dont have that

        localTime: 0,
        localTimeISO: '0',

        sl: -1,
        sv: -1,
        threadid: 0,
        test: ''
    };
};
