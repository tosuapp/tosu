import path from 'path';

import {
    ApiAnswer,
    LeaderboardPlayer,
    TourneyIpcClient,
    TourneyValues
} from '@/api/types/v1';
import { LeaderboardPlayer as MemoryLeaderboardPlayer } from '@/entities/GamePlayData/Leaderboard';
import { InstanceManager } from '@/objects/instanceManager/instanceManager';
import { calculateAccuracy } from '@/utils/calculators';
import { fixDecimals } from '@/utils/converters';
import { getOsuModsString } from '@/utils/osuMods';

const defaultLBPlayer = {
    name: '',
    score: 0,
    combo: 0,
    maxCombo: 0,
    mods: '',
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

export const buildResult = (instanceManager: InstanceManager): ApiAnswer => {
    const osuInstance = instanceManager.getInstance();
    if (!osuInstance) {
        return { error: 'not_ready' };
    }

    const {
        bassDensityData,
        allTimesData,
        menuData,
        gamePlayData,
        resultsScreenData,
        beatmapPpData,
        userProfile
    } = osuInstance.getServices([
        'bassDensityData',
        'allTimesData',
        'menuData',
        'gamePlayData',
        'resultsScreenData',
        'beatmapPpData',
        'userProfile'
    ]);

    const currentMods =
        allTimesData.Status === 2 || allTimesData.Status === 7
            ? gamePlayData.Mods
            : allTimesData.MenuMods;

    const resultScreenHits = {
        300: resultsScreenData.Hit300,
        geki: resultsScreenData.HitGeki,
        100: resultsScreenData.Hit100,
        katu: resultsScreenData.HitKatu,
        50: resultsScreenData.Hit50,
        0: resultsScreenData.HitMiss
    };

    return {
        settings: {
            showInterface: allTimesData.ShowInterface,
            folders: {
                game: allTimesData.GameFolder,
                skin: allTimesData.SkinFolder,
                songs: allTimesData.SongsFolder
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
                    AR: fixDecimals(beatmapPpData.calculatedMapAttributes.ar),
                    CS: fixDecimals(beatmapPpData.calculatedMapAttributes.cs),
                    OD: fixDecimals(beatmapPpData.calculatedMapAttributes.od),
                    HP: fixDecimals(beatmapPpData.calculatedMapAttributes.hp),
                    SR: fixDecimals(beatmapPpData.currAttributes.stars),
                    BPM: {
                        common: fixDecimals(beatmapPpData.commonBPM),
                        min: fixDecimals(beatmapPpData.minBPM),
                        max: fixDecimals(beatmapPpData.maxBPM)
                    },
                    circles: beatmapPpData.calculatedMapAttributes.circles,
                    sliders: beatmapPpData.calculatedMapAttributes.sliders,
                    spinners: beatmapPpData.calculatedMapAttributes.spinners,
                    holds: beatmapPpData.calculatedMapAttributes.holds,
                    maxCombo: beatmapPpData.calculatedMapAttributes.maxCombo,
                    fullSR: fixDecimals(
                        beatmapPpData.calculatedMapAttributes.fullStars
                    ),
                    memoryAR: fixDecimals(menuData.AR),
                    memoryCS: fixDecimals(menuData.CS),
                    memoryOD: fixDecimals(menuData.OD),
                    memoryHP: fixDecimals(menuData.HP)
                },
                path: {
                    full: path.join(
                        menuData.Folder || '',
                        menuData.BackgroundFilename || ''
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
                strains: beatmapPpData.strains,
                strainsAll: beatmapPpData.strainsAll
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
                300: gamePlayData.Hit300,
                geki: gamePlayData.HitGeki,
                100: gamePlayData.Hit100,
                katu: gamePlayData.HitKatu,
                50: gamePlayData.Hit50,
                0: gamePlayData.HitMiss,
                sliderBreaks: gamePlayData.HitSB,
                grade: {
                    current: gamePlayData.GradeCurrent,
                    maxThisPlay: gamePlayData.GradeExpected
                },
                unstableRate: gamePlayData.UnstableRate,
                hitErrorArray: gamePlayData.HitErrors
            },
            pp: {
                current: fixDecimals(beatmapPpData.currAttributes.pp),
                fc: fixDecimals(beatmapPpData.currAttributes.fcPP),
                maxThisPlay: fixDecimals(
                    beatmapPpData.currAttributes.maxThisPlayPP
                )
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
            },
            _isReplayUiHidden: gamePlayData.isReplayUiHidden
        },
        resultsScreen: {
            mode: gamePlayData.Mode,
            name: resultsScreenData.PlayerName,
            score: resultsScreenData.Score,
            accuracy: calculateAccuracy({
                hits: resultScreenHits,
                mode: gamePlayData.Mode
            }),
            maxCombo: resultsScreenData.MaxCombo,
            mods: {
                num: resultsScreenData.Mods,
                str: getOsuModsString(resultsScreenData.Mods)
            },
            300: resultsScreenData.Hit300,
            geki: resultsScreenData.HitGeki,
            100: resultsScreenData.Hit100,
            katu: resultsScreenData.HitKatu,
            50: resultsScreenData.Hit50,
            0: resultsScreenData.HitMiss,
            grade: resultsScreenData.Grade,
            createdAt: resultsScreenData.Date
        },
        userProfile: {
            rawLoginStatus: userProfile.rawLoginStatus,
            name: userProfile.name,
            accuracy: userProfile.accuracy,
            rankedScore: userProfile.rankedScore,
            id: userProfile.id,
            level: userProfile.level,
            playCount: userProfile.playCount,
            playMode: userProfile.playMode,
            rank: userProfile.rank,
            countryCode: userProfile.countryCode,
            performancePoints: userProfile.performancePoints,
            rawBanchoStatus: userProfile.rawBanchoStatus,
            backgroundColour: userProfile.backgroundColour?.toString(16)
        },
        tourney: buildTourneyData(instanceManager)
    };
};

const buildTourneyData = (
    instanceManager: InstanceManager
): TourneyValues | undefined => {
    const osuTourneyManager = Object.values(
        instanceManager.osuInstances
    ).filter((instance) => instance.isTourneyManager);
    if (osuTourneyManager.length < 1) {
        return undefined;
    }

    const osuTourneyClients = Object.values(
        instanceManager.osuInstances
    ).filter((instance) => instance.isTourneySpectator);

    const mappedOsuTourneyClients = osuTourneyClients
        .sort((a, b) => a.ipcId - b.ipcId)
        .map<TourneyIpcClient>((instance, iterator) => {
            const { allTimesData, gamePlayData, tourneyUserProfileData } =
                instance.getServices([
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
                        300: gamePlayData.Hit300,
                        geki: gamePlayData.HitGeki,
                        100: gamePlayData.Hit100,
                        katu: gamePlayData.HitKatu,
                        50: gamePlayData.Hit50,
                        0: gamePlayData.HitMiss,
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
        });

    const { tourneyManagerData } = osuTourneyManager[0].getServices([
        'tourneyManagerData'
    ]);

    const mappedChat = tourneyManagerData.Messages.map((message) => {
        const ipcClient = mappedOsuTourneyClients.find(
            (client) => client.spectating.name === message.name
        );

        return {
            team: ipcClient
                ? ipcClient.team
                : message.name === 'BanchoBot'
                  ? 'bot'
                  : 'unknown',
            time: message.time,
            name: message.name,
            messageBody: message.content
        };
    });

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
            chat: mappedChat,
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
