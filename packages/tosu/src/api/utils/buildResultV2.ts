import path from 'path';

import { DataRepo } from '@/entities/DataRepoList';
import { LeaderboardPlayer as MemoryLeaderboardPlayer } from '@/entities/GamePlayData/Leaderboard';
import { InstanceManager } from '@/objects/instanceManager/instanceManager';
import { fixDecimals } from '@/utils/fixDecimals';
import { getOsuModsString } from '@/utils/osuMods';

import {
    ApiKeypressAnswer,
    ApiV2Answer,
    BeatmapStatuses,
    KeyOverlay,
    Leaderboard,
    Modes,
    Tourney,
    TourneyChatMessages,
    TourneyClients
} from '../types/v2';
import accuracyCalculator from './accuracy';
import rankCalculate from './rank';

const convertMemoryPlayerToResult = (
    memoryPlayer: MemoryLeaderboardPlayer,
    gameMode: any
): Leaderboard => {
    const hits = {
        300: memoryPlayer.H300,
        100: memoryPlayer.H100,
        50: memoryPlayer.H50,
        0: memoryPlayer.H0,
        geki: 0,
        katu: 0
    };

    const modsName = getOsuModsString(memoryPlayer.Mods);

    return {
        isFailed: memoryPlayer.IsPassing == false,

        position: memoryPlayer.Position,
        team: memoryPlayer.Team,

        name: memoryPlayer.Name,

        score: memoryPlayer.Score,
        accuracy: accuracyCalculator(hits, gameMode),

        hits: hits,

        combo: {
            current: memoryPlayer.Combo,
            max: memoryPlayer.MaxCombo
        },
        mods: {
            number: memoryPlayer.Mods,
            name: modsName
        },
        rank: rankCalculate({
            mods: modsName,
            mode: gameMode,
            hits: hits
        })
    };
};

export const buildResult = (
    service: DataRepo,
    instancesManager: InstanceManager
): ApiV2Answer => {
    const {
        settings,
        bassDensityData,
        allTimesData,
        menuData,
        gamePlayData,
        resultsScreenData,
        beatmapPpData,
        userProfile
    } = service.getServices([
        'settings',
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

    return {
        state: allTimesData.Status,
        session: {
            playTime: 0, // needed, seconds
            playCount: 0 // need counting
        },
        settings: {
            leaderboardVisible: gamePlayData.Leaderboard
                ? gamePlayData.Leaderboard.isScoreboardVisible
                : false,
            interfaceVisible: settings.showInterface,
            replayUIVisible: gamePlayData.isReplayUiHidden,
            chatVisible: Number(Boolean(allTimesData.ChatStatus)),

            beatmapHasLeaderboard: Boolean(gamePlayData.Leaderboard),
            // userLogined: userProfile.isConnected, // we dont have that, yet
            connectedToBancho: userProfile.isConnected,

            bassDensity: bassDensityData.density,

            mode: {
                number: menuData.MenuGameMode,
                name: Modes[menuData.MenuGameMode]
            }
        },
        profile: {
            id: userProfile.id,
            name: userProfile.name,
            mode: {
                number: userProfile.playMode,
                name: Modes[userProfile.playMode]
            },

            rankedScore: userProfile.rankedScore,
            level: userProfile.level,

            accuracy: userProfile.accuracy,
            pp: userProfile.performancePoints,
            playCount: userProfile.playCount,
            globalRank: userProfile.rank,

            countryCode: {
                code: userProfile.countryCode
                // name: '', //
            },

            backgroundColour: userProfile.backgroundColour?.toString(16)
        },
        beatmap: {
            time: {
                live: allTimesData.PlayTime,
                firstObject: beatmapPpData.timings.firstObj,
                lastObject: beatmapPpData.timings.full,
                mp3Length: menuData.MP3Length
            },
            status: {
                number: menuData.RankedStatus,
                name: BeatmapStatuses[menuData.RankedStatus || -1]
            },
            checksum: menuData.MD5,

            id: menuData.MapID,
            set: menuData.SetID,

            artist: menuData.Artist,
            artistUnicode: menuData.ArtistOriginal,
            title: menuData.Title,
            titleUnicode: menuData.TitleOriginal,

            mapper: menuData.Creator,

            version: menuData.Difficulty,

            stats: {
                stars: {
                    live: fixDecimals(beatmapPpData.currAttributes.stars),
                    aim: beatmapPpData.calculatedMapAttributes.aim
                        ? fixDecimals(beatmapPpData.calculatedMapAttributes.aim)
                        : undefined,
                    speed: beatmapPpData.calculatedMapAttributes.speed
                        ? fixDecimals(
                              beatmapPpData.calculatedMapAttributes.speed
                          )
                        : undefined,
                    flashlight: beatmapPpData.calculatedMapAttributes.flashlight
                        ? fixDecimals(
                              beatmapPpData.calculatedMapAttributes.flashlight
                          )
                        : undefined,
                    sliderFactor: beatmapPpData.calculatedMapAttributes
                        .sliderFactor
                        ? fixDecimals(
                              beatmapPpData.calculatedMapAttributes.sliderFactor
                          )
                        : undefined,
                    stamina: beatmapPpData.calculatedMapAttributes.stamina
                        ? fixDecimals(
                              beatmapPpData.calculatedMapAttributes.stamina
                          )
                        : undefined,
                    rhythm: beatmapPpData.calculatedMapAttributes.rhythm
                        ? fixDecimals(
                              beatmapPpData.calculatedMapAttributes.rhythm
                          )
                        : undefined,
                    color: beatmapPpData.calculatedMapAttributes.color
                        ? fixDecimals(
                              beatmapPpData.calculatedMapAttributes.color
                          )
                        : undefined,
                    peak: beatmapPpData.calculatedMapAttributes.peak
                        ? fixDecimals(
                              beatmapPpData.calculatedMapAttributes.peak
                          )
                        : undefined,
                    hitWindow: beatmapPpData.calculatedMapAttributes.hitWindow
                        ? fixDecimals(
                              beatmapPpData.calculatedMapAttributes.hitWindow
                          )
                        : undefined,
                    total: fixDecimals(
                        beatmapPpData.calculatedMapAttributes.fullStars
                    )
                },

                AR: {
                    original: fixDecimals(
                        beatmapPpData.calculatedMapAttributes.ar
                    ),
                    converted: fixDecimals(menuData.AR)
                },
                CS: {
                    original: fixDecimals(
                        beatmapPpData.calculatedMapAttributes.cs
                    ),
                    converted: fixDecimals(menuData.CS)
                },
                OD: {
                    original: fixDecimals(
                        beatmapPpData.calculatedMapAttributes.od
                    ),
                    converted: fixDecimals(menuData.OD)
                },
                HP: {
                    original: fixDecimals(
                        beatmapPpData.calculatedMapAttributes.hp
                    ),
                    converted: fixDecimals(menuData.HP)
                },

                bpm: {
                    common: fixDecimals(beatmapPpData.commonBPM),
                    min: fixDecimals(beatmapPpData.minBPM),
                    max: fixDecimals(beatmapPpData.maxBPM)
                },

                objects: {
                    circles: beatmapPpData.calculatedMapAttributes.circles,
                    sliders: beatmapPpData.calculatedMapAttributes.sliders,
                    spinners: beatmapPpData.calculatedMapAttributes.spinners,
                    holds: beatmapPpData.calculatedMapAttributes.holds,
                    total:
                        beatmapPpData.calculatedMapAttributes.circles +
                        beatmapPpData.calculatedMapAttributes.sliders +
                        beatmapPpData.calculatedMapAttributes.spinners +
                        beatmapPpData.calculatedMapAttributes.holds
                },

                maxCombo: beatmapPpData.calculatedMapAttributes.maxCombo
            }
        },
        player: {
            mode: {
                number: gamePlayData.Mode,
                name: Modes[gamePlayData.Mode]
            },
            name: gamePlayData.PlayerName,

            score: gamePlayData.Score,
            accuracy: gamePlayData.Accuracy,

            healthBar: {
                normal: (gamePlayData.PlayerHP / 200) * 100,
                smooth: (gamePlayData.PlayerHPSmooth / 200) * 100
            },

            hits: {
                300: gamePlayData.Hit300,
                geki: gamePlayData.HitGeki,
                100: gamePlayData.Hit100,
                katu: gamePlayData.HitKatu,
                50: gamePlayData.Hit50,
                0: gamePlayData.HitMiss,
                sliderBreaks: gamePlayData.HitSB,

                unstableRate: gamePlayData.UnstableRate
            },

            hitErrorArray: gamePlayData.HitErrors,

            combo: {
                current: gamePlayData.Combo,
                max: gamePlayData.MaxCombo
            },
            mods: {
                number: currentMods,
                name: getOsuModsString(currentMods)
            },
            rank: {
                current: gamePlayData.GradeCurrent,
                maxThisPlay: gamePlayData.GradeExpected
            },
            pp: {
                current: fixDecimals(beatmapPpData.currAttributes.pp),
                fc: fixDecimals(beatmapPpData.currAttributes.fcPP),
                maxAchievedThisPlay: fixDecimals(
                    beatmapPpData.currAttributes.maxThisPlayPP
                )
            }
        },
        leaderboard: gamePlayData.Leaderboard
            ? gamePlayData.Leaderboard.leaderBoard.map((slot) =>
                  convertMemoryPlayerToResult(slot, Modes[gamePlayData.Mode])
              )
            : [],
        performance: {
            accuracy: beatmapPpData.ppAcc,
            graph: beatmapPpData.strainsAll
        },
        resultsScreen: {
            mode: '', // todo
            score: resultsScreenData.Score,
            name: resultsScreenData.PlayerName,
            hits: {
                300: resultsScreenData.Hit300,
                geki: resultsScreenData.HitGeki,
                100: resultsScreenData.Hit100,
                katu: resultsScreenData.HitKatu,
                50: resultsScreenData.Hit50,
                0: resultsScreenData.HitMiss
            },
            mods: {
                number: resultsScreenData.Mods,
                name: getOsuModsString(resultsScreenData.Mods)
            },
            maxCombo: resultsScreenData.MaxCombo,
            rank: '', // dont have

            createdAt: '' // dont have
        },
        folders: {
            game: settings.gameFolder,
            skin: settings.skinFolder,
            songs: settings.songsFolder,
            beatmap: menuData.Folder
        },
        files: {
            beatmap: menuData.Path,
            background: menuData.BackgroundFilename,
            audio: menuData.AudioFilename
        },
        directPath: {
            beatmapFile: path.join(
                settings.gameFolder,
                'Songs',
                menuData.Folder,
                menuData.Path
            ),
            beatmapBackground: path.join(
                settings.gameFolder,
                'Songs',
                menuData.Folder,
                menuData.BackgroundFilename
            ),
            beatmapAudio: path.join(
                settings.gameFolder,
                'Songs',
                menuData.Folder,
                menuData.AudioFilename
            ),
            beatmapFolder: path.join(
                settings.gameFolder,
                'Songs',
                menuData.Folder
            ),
            skinFolder: path.join(
                settings.gameFolder,
                'Skins',
                settings.skinFolder
            ),

            collections: path.join(settings.gameFolder, 'collection.db'),
            osudb: path.join(settings.gameFolder, 'osu!.db'),
            scoresdb: path.join(settings.gameFolder, 'scores.db')
        },

        tourney: buildTourneyData(instancesManager)
    };
};

export const buildKeyOverlay = (service: DataRepo): ApiKeypressAnswer => {
    const { gamePlayData, beatmapPpData } = service.getServices([
        'gamePlayData',
        'beatmapPpData'
    ]);

    return {
        bpm: {
            common: beatmapPpData.commonBPM,
            min: beatmapPpData.minBPM,
            max: beatmapPpData.maxBPM
        },
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
    };
};

const buildTourneyData = (
    instancesManager: InstanceManager
): Tourney | undefined => {
    const osuTourneyManager = Object.values(
        instancesManager.osuInstances
    ).filter((instance) => instance.isTourneyManager);
    if (osuTourneyManager.length < 1) {
        return undefined;
    }

    const osuTourneyClients = Object.values(
        instancesManager.osuInstances
    ).filter((instance) => instance.isTourneySpectator);

    const mappedOsuTourneyClients = osuTourneyClients.map(
        (instance, iterator): TourneyClients => {
            const {
                allTimesData,
                gamePlayData,
                tourneyUserProfileData,
                beatmapPpData
            } = instance.entities.getServices([
                'allTimesData',
                'gamePlayData',
                'tourneyUserProfileData',
                'beatmapPpData'
            ]);

            const currentMods =
                allTimesData.Status === 2 || allTimesData.Status === 7
                    ? gamePlayData.Mods
                    : allTimesData.MenuMods;

            const spectatorTeam =
                iterator < osuTourneyClients.length / 2 ? 'left' : 'right';

            return {
                team: spectatorTeam,
                user: {
                    id: tourneyUserProfileData.UserID,
                    name: tourneyUserProfileData.Name,
                    country: tourneyUserProfileData.Country,
                    accuracy: tourneyUserProfileData.Accuracy,
                    rankedScore: tourneyUserProfileData.RankedScore,
                    playCount: tourneyUserProfileData.PlayCount,
                    globalRank: tourneyUserProfileData.GlobalRank,
                    totalPP: tourneyUserProfileData.PP
                },
                play: {
                    mode: {
                        number: gamePlayData.Mode,
                        name: Modes[gamePlayData.Mode]
                    },

                    name: gamePlayData.PlayerName,

                    score: gamePlayData.Score,
                    accuracy: gamePlayData.Accuracy,

                    healthBar: {
                        normal: (gamePlayData.PlayerHP / 200) * 100,
                        smooth: (gamePlayData.PlayerHPSmooth / 200) * 100
                    },
                    hits: {
                        300: gamePlayData.Hit300,
                        geki: gamePlayData.HitGeki,
                        100: gamePlayData.Hit100,
                        katu: gamePlayData.HitKatu,
                        50: gamePlayData.Hit50,
                        0: gamePlayData.HitMiss,
                        sliderBreaks: gamePlayData.HitSB,
                        unstableRate: gamePlayData.UnstableRate
                    },

                    hitErrorArray: gamePlayData.HitErrors,

                    mods: {
                        num: currentMods,
                        str: getOsuModsString(currentMods)
                    },
                    combo: {
                        current: gamePlayData.Combo,
                        max: gamePlayData.MaxCombo
                    },
                    rank: {
                        current: gamePlayData.GradeCurrent,
                        maxThisPlay: gamePlayData.GradeExpected
                    },
                    pp: {
                        current: fixDecimals(beatmapPpData.currAttributes.pp),
                        fc: fixDecimals(beatmapPpData.currAttributes.fcPP),
                        maxAchievedThisPlay: fixDecimals(
                            beatmapPpData.currAttributes.maxThisPlayPP
                        )
                    }
                }
            };
        }
    );

    const { tourneyManagerData } = osuTourneyManager[0].entities.getServices([
        'tourneyManagerData'
    ]);

    const mappedChat = tourneyManagerData.Messages.map(
        (message): TourneyChatMessages => {
            const ipcClient = mappedOsuTourneyClients.find(
                (client) => client.user.name === message.name
            );

            return {
                team: ipcClient
                    ? ipcClient.team
                    : message.name === 'BanchoBot'
                    ? 'bot'
                    : 'unknown',
                name: message.name,
                message: message.content,
                timestamp: message.time
            };
        }
    );

    return {
        scoreVisible: tourneyManagerData.ScoreVisible,
        starsVisible: tourneyManagerData.StarsVisible,

        ipcState: tourneyManagerData.IPCState,
        bestOF: tourneyManagerData.BestOf,
        team: {
            left: tourneyManagerData.FirstTeamName,
            right: tourneyManagerData.SecondTeamName
        },

        points: {
            left: tourneyManagerData.LeftStars,
            right: tourneyManagerData.RightStars
        },

        chat: mappedChat,

        totalScore: {
            left: tourneyManagerData.FirstTeamScore,
            right: tourneyManagerData.SecondTeamScore
        },
        clients: [...mappedOsuTourneyClients]
    };
};
