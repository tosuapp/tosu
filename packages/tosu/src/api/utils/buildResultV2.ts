import path from 'path';

import {
    ApiAnswer,
    BanchoStatusEnum,
    BeatmapStatuses,
    ChatStatus,
    GameState,
    GroupType,
    Leaderboard,
    LeaderboardType,
    Modes,
    ProgressBarType,
    ScoreMeterType,
    SortType,
    Tourney,
    TourneyChatMessages,
    TourneyClients,
    UserLoginStatus
} from '@/api/types/v2';
import { LeaderboardPlayer as MemoryLeaderboardPlayer } from '@/entities/GamePlayData/Leaderboard';
import { InstanceManager } from '@/objects/instanceManager/instanceManager';
import { calculateAccuracy, calculateGrade } from '@/utils/calculators';
import { fixDecimals } from '@/utils/converters';
import { getOsuModsString } from '@/utils/osuMods';

import { CountryCodes } from './countryCodes';

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
        isFailed: memoryPlayer.IsPassing === false,

        position: memoryPlayer.Position,
        team: memoryPlayer.Team,

        name: memoryPlayer.Name,

        score: memoryPlayer.Score,
        accuracy: calculateAccuracy({ hits, mode: gameMode }),

        hits,

        combo: {
            current: memoryPlayer.Combo,
            max: memoryPlayer.MaxCombo
        },
        mods: {
            number: memoryPlayer.Mods,
            name: modsName
        },
        rank: calculateGrade({
            mods: modsName,
            mode: gameMode,
            hits
        })
    };
};

export const buildResult = (instanceManager: InstanceManager): ApiAnswer => {
    const osuInstance = instanceManager.getInstance();
    if (!osuInstance) {
        return { error: 'not_ready' };
    }

    const {
        settings,
        bassDensityData,
        allTimesData,
        menuData,
        gamePlayData,
        resultsScreenData,
        beatmapPpData,
        userProfile
    } = osuInstance.getServices([
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

    const resultScreenHits = {
        300: resultsScreenData.Hit300,
        geki: resultsScreenData.HitGeki,
        100: resultsScreenData.Hit100,
        katu: resultsScreenData.HitKatu,
        50: resultsScreenData.Hit50,
        0: resultsScreenData.HitMiss
    };

    return {
        state: {
            number: allTimesData.Status,
            name: GameState[allTimesData.Status] || ''
        },
        session: {
            playTime: allTimesData.GameTime,
            playCount: 0 // need counting
        },
        settings: {
            interfaceVisible: allTimesData.ShowInterface,
            replayUIVisible: gamePlayData.isReplayUiHidden === false,
            chatVisibilityStatus: {
                number: allTimesData.ChatStatus,
                name: ChatStatus[allTimesData.ChatStatus] || ''
            },

            leaderboard: {
                visible: gamePlayData.Leaderboard
                    ? gamePlayData.Leaderboard.isScoreboardVisible
                    : false,
                type: {
                    number: settings.leaderboardType,
                    name: LeaderboardType[settings.leaderboardType] || ''
                }
            },

            progressBar: {
                number: settings.progressBarType,
                name: ProgressBarType[settings.progressBarType] || ''
            },
            bassDensity: bassDensityData.density,

            resolution: settings.resolution,
            client: settings.client,

            scoreMeter: {
                type: {
                    number: settings.scoreMeter.type,
                    name: ScoreMeterType[settings.scoreMeter.type] || ''
                },
                size: settings.scoreMeter.size
            },
            cursor: settings.cursor,
            mouse: settings.mouse,
            mania: settings.mania,

            sort: {
                number: settings.sortType,
                name: SortType[settings.sortType] || ''
            },
            group: {
                number: settings.groupType,
                name: GroupType[settings.groupType] || ''
            },

            skin: settings.skin,
            mode: {
                number: menuData.MenuGameMode,
                name: Modes[menuData.MenuGameMode] || ''
            },
            audio: settings.audio,
            background: settings.background,

            keybinds: settings.keybinds
        },
        profile: {
            userStatus: {
                number: userProfile.rawLoginStatus,
                name: UserLoginStatus[userProfile.rawLoginStatus] || ''
            },
            banchoStatus: {
                number: userProfile.rawBanchoStatus,
                name: BanchoStatusEnum[userProfile.rawBanchoStatus] || ''
            },
            id: userProfile.id,
            name: userProfile.name,
            mode: {
                number: userProfile.playMode,
                name: Modes[userProfile.playMode] || ''
            },

            rankedScore: userProfile.rankedScore,
            level: userProfile.level,

            accuracy: userProfile.accuracy,
            pp: userProfile.performancePoints,
            playCount: userProfile.playCount,
            globalRank: userProfile.rank,

            countryCode: {
                number: userProfile.countryCode,
                name: CountryCodes[userProfile.countryCode]?.toUpperCase() || ''
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
                name: BeatmapStatuses[menuData.RankedStatus || -1] || ''
            },
            checksum: menuData.MD5,

            id: menuData.MapID,
            set: menuData.SetID,

            mode: {
                number: beatmapPpData.Mode,
                name: Modes[beatmapPpData.Mode] || ''
            },

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

                ar: {
                    original: fixDecimals(menuData.AR),
                    converted: fixDecimals(
                        beatmapPpData.calculatedMapAttributes.ar
                    )
                },
                cs: {
                    original: fixDecimals(menuData.CS),
                    converted: fixDecimals(
                        beatmapPpData.calculatedMapAttributes.cs
                    )
                },
                od: {
                    original: fixDecimals(menuData.OD),
                    converted: fixDecimals(
                        beatmapPpData.calculatedMapAttributes.od
                    )
                },
                hp: {
                    original: fixDecimals(menuData.HP),
                    converted: fixDecimals(
                        beatmapPpData.calculatedMapAttributes.hp
                    )
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
        play: {
            playerName: gamePlayData.PlayerName,

            mode: {
                number: gamePlayData.Mode,
                name: Modes[gamePlayData.Mode] || ''
            },

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
                sliderBreaks: gamePlayData.HitSB
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
            },
            unstableRate: gamePlayData.UnstableRate
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
            playerName: resultsScreenData.PlayerName,

            mode: {
                number: resultsScreenData.Mode,
                name: Modes[resultsScreenData.Mode] || ''
            },

            score: resultsScreenData.Score,
            accuracy: resultsScreenData.Accuracy,

            name: resultsScreenData.PlayerName, // legacy, remove it later
            hits: resultScreenHits,
            mods: {
                number: resultsScreenData.Mods,
                name: getOsuModsString(resultsScreenData.Mods)
            },
            maxCombo: resultsScreenData.MaxCombo,
            rank: resultsScreenData.Grade,
            pp: {
                current: resultsScreenData.pp,
                fc: resultsScreenData.fcPP
            },
            createdAt: resultsScreenData.Date
        },
        folders: {
            game: allTimesData.GameFolder,
            skin: allTimesData.SkinFolder,
            songs: allTimesData.SongsFolder,
            beatmap: menuData.Folder
        },
        files: {
            beatmap: menuData.Path,
            background: menuData.BackgroundFilename,
            audio: menuData.AudioFilename
        },
        directPath: {
            beatmapFile: path.join(menuData.Folder || '', menuData.Path || ''),
            beatmapBackground: path.join(
                menuData.Folder || '',
                menuData.BackgroundFilename || ''
            ),
            beatmapAudio: path.join(
                menuData.Folder || '',
                menuData.AudioFilename || ''
            ),
            beatmapFolder: menuData.Folder,
            skinFolder: allTimesData.SkinFolder
        },

        tourney: buildTourneyData(instanceManager)
    };
};

const buildTourneyData = (
    instanceManager: InstanceManager
): Tourney | undefined => {
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
        .map((instance, iterator): TourneyClients => {
            const {
                allTimesData,
                gamePlayData,
                tourneyUserProfileData,
                beatmapPpData
            } = instance.getServices([
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
                ipcId: instance.ipcId,
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
                    playerName: gamePlayData.PlayerName,

                    mode: {
                        number: gamePlayData.Mode,
                        name: Modes[gamePlayData.Mode] || ''
                    },

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
                        sliderBreaks: gamePlayData.HitSB
                    },

                    hitErrorArray: gamePlayData.HitErrors,

                    mods: {
                        number: currentMods,
                        name: getOsuModsString(currentMods)
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
                    },

                    unstableRate: gamePlayData.UnstableRate
                }
            };
        });

    const { tourneyManagerData } = osuTourneyManager[0].getServices([
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
        clients: mappedOsuTourneyClients
    };
};
