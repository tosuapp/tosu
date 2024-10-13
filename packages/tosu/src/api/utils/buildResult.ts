import path from 'path';

import {
    ApiAnswer,
    LeaderboardPlayer,
    TourneyIpcClient,
    TourneyValues
} from '@/api/types/v1';
import { InstanceManager } from '@/instances/manager';
import { LeaderboardPlayer as MemoryLeaderboardPlayer } from '@/states/gameplay';
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
        bassDensity,
        global,
        menu,
        gameplay,
        resultScreen,
        beatmapPP,
        user
    } = osuInstance.getServices([
        'bassDensity',
        'global',
        'menu',
        'gameplay',
        'resultScreen',
        'beatmapPP',
        'user'
    ]);

    const currentMods =
        global.Status === 2 || global.Status === 7
            ? gameplay.Mods
            : global.MenuMods;

    const resultScreenHits = {
        300: resultScreen.Hit300,
        geki: resultScreen.HitGeki,
        100: resultScreen.Hit100,
        katu: resultScreen.HitKatu,
        50: resultScreen.Hit50,
        0: resultScreen.HitMiss
    };

    return {
        settings: {
            showInterface: global.ShowInterface,
            folders: {
                game: global.GameFolder,
                skin: global.SkinFolder,
                songs: global.SongsFolder
            }
        },
        menu: {
            mainMenu: {
                bassDensity: bassDensity.density
            },
            // TODO: Make enum for osu in-game statuses
            state: global.Status,
            // TODO: Make enum for osu in-game modes
            gameMode: menu.MenuGameMode,
            isChatEnabled: Number(Boolean(global.ChatStatus)),
            bm: {
                time: {
                    firstObj: beatmapPP.timings.firstObj,
                    current: global.PlayTime,
                    full: beatmapPP.timings.full,
                    mp3: menu.MP3Length
                },
                id: menu.MapID,
                set: menu.SetID,
                md5: menu.MD5,
                // TODO: make ranked status enum
                rankedStatus: menu.RankedStatus,
                metadata: {
                    artist: menu.Artist,
                    artistOriginal: menu.ArtistOriginal,
                    title: menu.Title,
                    titleOriginal: menu.TitleOriginal,
                    mapper: menu.Creator,
                    difficulty: menu.Difficulty
                },
                stats: {
                    AR: fixDecimals(beatmapPP.calculatedMapAttributes.ar),
                    CS: fixDecimals(beatmapPP.calculatedMapAttributes.cs),
                    OD: fixDecimals(beatmapPP.calculatedMapAttributes.od),
                    HP: fixDecimals(beatmapPP.calculatedMapAttributes.hp),
                    SR: fixDecimals(beatmapPP.currAttributes.stars),
                    BPM: {
                        common: fixDecimals(beatmapPP.commonBPM),
                        min: fixDecimals(beatmapPP.minBPM),
                        max: fixDecimals(beatmapPP.maxBPM)
                    },
                    circles: beatmapPP.calculatedMapAttributes.circles,
                    sliders: beatmapPP.calculatedMapAttributes.sliders,
                    spinners: beatmapPP.calculatedMapAttributes.spinners,
                    holds: beatmapPP.calculatedMapAttributes.holds,
                    maxCombo: beatmapPP.calculatedMapAttributes.maxCombo,
                    fullSR: fixDecimals(
                        beatmapPP.calculatedMapAttributes.fullStars
                    ),
                    memoryAR: fixDecimals(menu.AR),
                    memoryCS: fixDecimals(menu.CS),
                    memoryOD: fixDecimals(menu.OD),
                    memoryHP: fixDecimals(menu.HP)
                },
                path: {
                    full: path.join(
                        menu.Folder || '',
                        menu.BackgroundFilename || ''
                    ),
                    folder: menu.Folder,
                    file: menu.Path,
                    bg: menu.BackgroundFilename,
                    audio: menu.AudioFilename
                }
            },
            mods: {
                num: currentMods,
                str: getOsuModsString(currentMods)
            },
            pp: {
                ...beatmapPP.ppAcc,
                strains: beatmapPP.strains,
                strainsAll: beatmapPP.strainsAll
            }
        },
        gameplay: {
            gameMode: gameplay.Mode,
            name: gameplay.PlayerName,
            score: gameplay.Score,
            accuracy: gameplay.Accuracy,
            combo: {
                current: gameplay.Combo,
                max: gameplay.MaxCombo
            },
            hp: {
                normal: gameplay.PlayerHP,
                smooth: gameplay.PlayerHPSmooth
            },
            hits: {
                300: gameplay.Hit300,
                geki: gameplay.HitGeki,
                100: gameplay.Hit100,
                katu: gameplay.HitKatu,
                50: gameplay.Hit50,
                0: gameplay.HitMiss,
                sliderBreaks: gameplay.HitSB,
                grade: {
                    current: gameplay.GradeCurrent,
                    maxThisPlay: gameplay.GradeExpected
                },
                unstableRate: gameplay.UnstableRate,
                hitErrorArray: gameplay.HitErrors
            },
            pp: {
                current: fixDecimals(beatmapPP.currAttributes.pp),
                fc: fixDecimals(beatmapPP.currAttributes.fcPP),
                maxThisPlay: fixDecimals(beatmapPP.currAttributes.maxThisPlayPP)
            },
            keyOverlay: {
                k1: {
                    isPressed: gameplay.KeyOverlay.K1Pressed,
                    count: gameplay.KeyOverlay.K1Count
                },
                k2: {
                    isPressed: gameplay.KeyOverlay.K2Pressed,
                    count: gameplay.KeyOverlay.K2Count
                },
                m1: {
                    isPressed: gameplay.KeyOverlay.M1Pressed,
                    count: gameplay.KeyOverlay.M1Count
                },
                m2: {
                    isPressed: gameplay.KeyOverlay.M2Pressed,
                    count: gameplay.KeyOverlay.M2Count
                }
            },
            leaderboard: {
                hasLeaderboard: Boolean(gameplay.Leaderboard),
                isVisible: gameplay.Leaderboard
                    ? gameplay.Leaderboard.isScoreboardVisible
                    : false,
                ourplayer:
                    gameplay.Leaderboard && gameplay.Leaderboard.player
                        ? convertMemoryPlayerToResult(
                              gameplay.Leaderboard.player
                          )
                        : defaultLBPlayer,
                slots: gameplay.Leaderboard
                    ? gameplay.Leaderboard.leaderBoard.map((slot) =>
                          convertMemoryPlayerToResult(slot)
                      )
                    : []
            },
            _isReplayUiHidden: gameplay.isReplayUiHidden
        },
        resultsScreen: {
            mode: gameplay.Mode,
            name: resultScreen.PlayerName,
            score: resultScreen.Score,
            accuracy: calculateAccuracy({
                hits: resultScreenHits,
                mode: gameplay.Mode
            }),
            maxCombo: resultScreen.MaxCombo,
            mods: {
                num: resultScreen.Mods,
                str: getOsuModsString(resultScreen.Mods)
            },
            300: resultScreen.Hit300,
            geki: resultScreen.HitGeki,
            100: resultScreen.Hit100,
            katu: resultScreen.HitKatu,
            50: resultScreen.Hit50,
            0: resultScreen.HitMiss,
            grade: resultScreen.Grade,
            createdAt: resultScreen.Date
        },
        userProfile: {
            rawLoginStatus: user.rawLoginStatus,
            name: user.name,
            accuracy: user.accuracy,
            rankedScore: user.rankedScore,
            id: user.id,
            level: user.level,
            playCount: user.playCount,
            playMode: user.playMode,
            rank: user.rank,
            countryCode: user.countryCode,
            performancePoints: user.performancePoints,
            rawBanchoStatus: user.rawBanchoStatus,
            backgroundColour: user.backgroundColour?.toString(16)
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
            const { global, gameplay, tourneyManager } = instance.getServices([
                'global',
                'gameplay',
                'tourneyManager'
            ]);

            const currentMods =
                global.Status === 2 || global.Status === 7
                    ? gameplay.Mods
                    : global.MenuMods;

            const spectatorTeam =
                iterator < osuTourneyClients.length / 2 ? 'left' : 'right';

            return {
                team: spectatorTeam,
                spectating: {
                    name: tourneyManager.UserName,
                    country: tourneyManager.UserCountry,
                    userID: tourneyManager.UserID,
                    accuracy: tourneyManager.UserAccuracy,
                    rankedScore: tourneyManager.UserRankedScore,
                    playCount: tourneyManager.UserPlayCount,
                    globalRank: tourneyManager.UserGlobalRank,
                    totalPP: tourneyManager.UserPP
                },
                gameplay: {
                    gameMode: gameplay.Mode,
                    name: gameplay.PlayerName,
                    score: gameplay.Score,
                    accuracy: gameplay.Accuracy,
                    combo: {
                        current: gameplay.Combo,
                        max: gameplay.MaxCombo
                    },
                    hp: {
                        normal: gameplay.PlayerHP,
                        smooth: gameplay.PlayerHPSmooth
                    },
                    hits: {
                        300: gameplay.Hit300,
                        geki: gameplay.HitGeki,
                        100: gameplay.Hit100,
                        katu: gameplay.HitKatu,
                        50: gameplay.Hit50,
                        0: gameplay.HitMiss,
                        sliderBreaks: gameplay.HitSB,
                        grade: {
                            current: gameplay.GradeCurrent,
                            maxThisPlay: gameplay.GradeExpected
                        },
                        unstableRate: gameplay.UnstableRate,
                        hitErrorArray: gameplay.HitErrors
                    },
                    mods: {
                        num: currentMods,
                        str: getOsuModsString(currentMods)
                    }
                }
            };
        });

    const { tourneyManager } = osuTourneyManager[0].getServices([
        'tourneyManager'
    ]);

    const mappedChat = tourneyManager.Messages.map((message) => {
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
            ipcState: tourneyManager.IPCState,
            bestOF: tourneyManager.BestOf,
            teamName: {
                left: tourneyManager.FirstTeamName,
                right: tourneyManager.SecondTeamName
            },
            stars: {
                left: tourneyManager.LeftStars,
                right: tourneyManager.RightStars
            },
            bools: {
                scoreVisible: tourneyManager.ScoreVisible,
                starsVisible: tourneyManager.StarsVisible
            },
            chat: mappedChat,
            gameplay: {
                score: {
                    left: tourneyManager.FirstTeamScore,
                    right: tourneyManager.SecondTeamScore
                }
            }
        },
        ipcClients: [...mappedOsuTourneyClients]
    };
};
