import path from 'path';

import { InstancesManager } from '@/Instances/InstancesManager';
import { LeaderboardPlayer as MemoryLeaderboardPlayer } from '@/Instances/Leaderboard';
import { DataRepo } from '@/Services/repo';
import { getOsuModsString } from '@/Utils/osuMods';
import { OsuMods } from '@/Utils/osuMods.types';

import {
    ApiAnswer,
    LeaderboardPlayer,
    TourneyIpcClient,
    TourneyValues
} from './types';

const defaultLBPlayer = {
    name: '',
    score: 0,
    combo: 0,
    maxCombo: 0,
    mods: 'NM',
    h300: 0,
    h100: 0,
    h50: 0,
    h0: 0,
    team: 0,
    position: 0,
    isPassing: 0
} as LeaderboardPlayer;

const convertMemoryPlayerToResult = (
    memoryPlayer: MemoryLeaderboardPlayer
): LeaderboardPlayer => ({
    name: memoryPlayer.Name,
    score: memoryPlayer.Score,
    combo: memoryPlayer.Combo,
    maxCombo: memoryPlayer.MaxCombo,
    mods: getOsuModsString(memoryPlayer.Mods),
    h300: memoryPlayer.H300,
    h100: memoryPlayer.H100,
    h50: memoryPlayer.H50,
    h0: memoryPlayer.H0,
    team: memoryPlayer.Team,
    position: memoryPlayer.Position,
    isPassing: Number(memoryPlayer.IsPassing)
});

export const buildResult = (
    service: DataRepo,
    instancesManager: InstancesManager
): ApiAnswer => {
    const {
        settings,
        bassDensityData,
        allTimesData,
        menuData,
        gamePlayData,
        resultsScreenData,
        beatmapPpData
    } = service.getServices([
        'settings',
        'bassDensityData',
        'allTimesData',
        'menuData',
        'gamePlayData',
        'resultsScreenData',
        'beatmapPpData'
    ]);

    const currentMods =
        allTimesData.Status === 2 || allTimesData.Status === 7
            ? gamePlayData.Mods
            : allTimesData.MenuMods;

    return {
        settings: {
            showInterface: settings.showInterface,
            folders: {
                game: settings.gameFolder,
                skin: settings.skinFolder,
                songs: settings.songsFolder
            }
        },
        menu: {
            mainMenu: {
                bassDensity: bassDensityData.density
            },
            // TODO: Make enum for osu in-game statuses
            state: allTimesData.Status,
            // TODO: Make enum for osu in-game modes
            gameMode: menuData.MenuGameMode,
            isChatEnabled: Number(Boolean(allTimesData.ChatStatus)),
            bm: {
                time: {
                    firstObj: beatmapPpData.timings.firstObj,
                    current: allTimesData.PlayTime,
                    full: beatmapPpData.timings.full,
                    mp3: menuData.MP3Length
                },
                id: menuData.MapID,
                set: menuData.SetID,
                md5: menuData.MD5,
                // TODO: make ranked status enum
                rankedStatus: menuData.RankedStatus,
                metadata: {
                    artist: menuData.Artist,
                    artistOriginal: menuData.ArtistOriginal,
                    title: menuData.Title,
                    titleOriginal: menuData.TitleOriginal,
                    mapper: menuData.Creator,
                    difficulty: menuData.Difficulty
                },
                stats: {
                    AR: beatmapPpData.calculatedMapAttributes.ar,
                    CS: beatmapPpData.calculatedMapAttributes.cs,
                    OD: beatmapPpData.calculatedMapAttributes.od,
                    HP: beatmapPpData.calculatedMapAttributes.hp,
                    SR: beatmapPpData.currAttributes.stars,
                    BPM: {
                        min: beatmapPpData.minBPM,
                        max: beatmapPpData.maxBPM
                    },
                    maxCombo: beatmapPpData.calculatedMapAttributes.maxCombo,
                    fullSR: beatmapPpData.calculatedMapAttributes.fullStars,
                    memoryAR: menuData.AR,
                    memoryCS: menuData.CS,
                    memoryOD: menuData.OD,
                    memoryHP: menuData.HP
                },
                path: {
                    full: path.join(
                        menuData.Folder,
                        menuData.BackgroundFilename
                    ),
                    folder: menuData.Folder,
                    file: menuData.Path,
                    bg: menuData.BackgroundFilename,
                    audio: menuData.AudioFilename
                }
            },
            mods: {
                num: currentMods,
                str: getOsuModsString(currentMods)
            },
            pp: {
                ...beatmapPpData.ppAcc,
                strains: beatmapPpData.strains
            }
        },
        gameplay: {
            gameMode: gamePlayData.Mode,
            name: gamePlayData.PlayerName,
            score: gamePlayData.Score,
            accuracy: gamePlayData.Accuracy,
            combo: {
                current: gamePlayData.Combo,
                max: gamePlayData.MaxCombo
            },
            hp: {
                normal: gamePlayData.PlayerHP,
                smooth: gamePlayData.PlayerHPSmooth
            },
            hits: {
                '300': gamePlayData.Hit300,
                geki: gamePlayData.HitGeki,
                '100': gamePlayData.Hit100,
                katu: gamePlayData.HitKatu,
                '50': gamePlayData.Hit50,
                '0': gamePlayData.HitMiss,
                sliderBreaks: gamePlayData.HitSB,
                grade: {
                    current: gamePlayData.GradeCurrent,
                    maxThisPlay: gamePlayData.GradeExpected
                },
                unstableRate: gamePlayData.UnstableRate,
                hitErrorArray: gamePlayData.HitErrors
            },
            pp: {
                current: beatmapPpData.currAttributes.pp,
                fc: beatmapPpData.currAttributes.fcPP,
                maxThisPlay: beatmapPpData.currAttributes.maxThisPlayPP
            },
            keyOverlay: {
                k1: {
                    isPressed: gamePlayData.KeyOverlay.K1Pressed,
                    count: gamePlayData.KeyOverlay.K1Count
                },
                k2: {
                    isPressed: gamePlayData.KeyOverlay.K2Pressed,
                    count: gamePlayData.KeyOverlay.K2Count
                },
                m1: {
                    isPressed: gamePlayData.KeyOverlay.M1Pressed,
                    count: gamePlayData.KeyOverlay.M1Count
                },
                m2: {
                    isPressed: gamePlayData.KeyOverlay.M2Pressed,
                    count: gamePlayData.KeyOverlay.M2Count
                }
            },
            leaderboard: {
                hasLeaderboard: Boolean(gamePlayData.Leaderboard),
                isVisible: gamePlayData.Leaderboard
                    ? gamePlayData.Leaderboard.isScoreboardVisible
                    : false,
                ourplayer:
                    gamePlayData.Leaderboard && gamePlayData.Leaderboard.player
                        ? convertMemoryPlayerToResult(
                              gamePlayData.Leaderboard.player
                          )
                        : defaultLBPlayer,
                slots: gamePlayData.Leaderboard
                    ? gamePlayData.Leaderboard.leaderBoard.map((slot) =>
                          convertMemoryPlayerToResult(slot)
                      )
                    : []
            }
        },
        resultsScreen: {
            name: resultsScreenData.PlayerName,
            score: resultsScreenData.Score,
            maxCombo: resultsScreenData.MaxCombo,
            mods: {
                num: resultsScreenData.Mods,
                str: getOsuModsString(resultsScreenData.Mods)
            },
            '300': resultsScreenData.Hit300,
            geki: resultsScreenData.HitGeki,
            '100': resultsScreenData.Hit100,
            katu: resultsScreenData.HitKatu,
            '50': resultsScreenData.Hit50,
            '0': resultsScreenData.HitMiss
        },
        tourney: buildTourneyData(instancesManager)
    };
};

const buildTourneyData = (
    instancesManager: InstancesManager
): TourneyValues | undefined => {
    const osuTourneyManager = Object.values(
        instancesManager.osuInstances
    ).filter((instance) => instance.isTourneyManager);
    if (osuTourneyManager.length < 1) {
        return undefined;
    }

    const osuTourneyClients = Object.values(
        instancesManager.osuInstances
    ).filter((instance) => instance.isTourneySpectator);

    const mappedOsuTourneyClients = osuTourneyClients.map<TourneyIpcClient>(
        (instance, iterator) => {
            const { allTimesData, gamePlayData, tourneyUserProfileData } =
                instance.servicesRepo.getServices([
                    'allTimesData',
                    'gamePlayData',
                    'tourneyUserProfileData'
                ]);

            const currentMods =
                allTimesData.Status === 2 || allTimesData.Status === 7
                    ? gamePlayData.Mods
                    : allTimesData.MenuMods;

            const spectatorTeam =
                iterator < osuTourneyClients.length / 2 ? 'left' : 'right';

            return {
                team: spectatorTeam,
                ipcSpec: '',
                spectating: {
                    name: tourneyUserProfileData.Name,
                    country: tourneyUserProfileData.Country,
                    userID: tourneyUserProfileData.UserID,
                    accuracy: tourneyUserProfileData.Accuracy,
                    rankedScore: tourneyUserProfileData.RankedScore,
                    playCount: tourneyUserProfileData.PlayCount,
                    globalRank: tourneyUserProfileData.GlobalRank,
                    totalPP: tourneyUserProfileData.PP
                },
                gameplay: {
                    gameMode: gamePlayData.Mode,
                    name: gamePlayData.PlayerName,
                    score: gamePlayData.Score,
                    accuracy: gamePlayData.Accuracy,
                    combo: {
                        current: gamePlayData.Combo,
                        max: gamePlayData.MaxCombo
                    },
                    hp: {
                        normal: gamePlayData.PlayerHP,
                        smooth: gamePlayData.PlayerHPSmooth
                    },
                    hits: {
                        '300': gamePlayData.Hit300,
                        geki: gamePlayData.HitGeki,
                        '100': gamePlayData.Hit100,
                        katu: gamePlayData.HitKatu,
                        '50': gamePlayData.Hit50,
                        '0': gamePlayData.HitMiss,
                        sliderBreaks: gamePlayData.HitSB,
                        grade: {
                            current: gamePlayData.GradeCurrent,
                            maxThisPlay: gamePlayData.GradeExpected
                        },
                        unstableRate: gamePlayData.UnstableRate,
                        hitErrorArray: gamePlayData.HitErrors
                    },
                    mods: {
                        num: currentMods,
                        str: getOsuModsString(currentMods)
                    }
                }
            };
        }
    );

    const { tourneyManagerData } =
        osuTourneyManager[0].servicesRepo.getServices(['tourneyManagerData']);

    return {
        manager: {
            ipcState: tourneyManagerData.IPCState,
            bestOF: tourneyManagerData.BestOf,
            teamName: {
                left: tourneyManagerData.FirstTeamName,
                right: tourneyManagerData.SecondTeamName
            },
            stars: {
                left: tourneyManagerData.LeftStars,
                right: tourneyManagerData.RightStars
            },
            bools: {
                scoreVisible: tourneyManagerData.ScoreVisible,
                starsVisible: tourneyManagerData.StarsVisible
            },
            chat: [],
            gameplay: {
                score: {
                    left: tourneyManagerData.FirstTeamScore,
                    right: tourneyManagerData.SecondTeamScore
                }
            }
        },
        ipcClients: [...mappedOsuTourneyClients]
    };
};
