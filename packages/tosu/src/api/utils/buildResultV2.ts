import { CountryCodes } from '@tosu/common';
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
import { InstanceManager } from '@/instances/manager';
import { BeatmapPP } from '@/states/beatmap';
import {
    Gameplay,
    LeaderboardPlayer as MemoryLeaderboardPlayer
} from '@/states/gameplay';
import { Menu } from '@/states/menu';
import { calculateAccuracy, calculateGrade } from '@/utils/calculators';
import { fixDecimals } from '@/utils/converters';
import { getOsuModsString } from '@/utils/osuMods';

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
        bassDensity,
        global,
        menu,
        gameplay,
        resultScreen,
        beatmapPP,
        user
    } = osuInstance.getServices([
        'settings',
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
        state: {
            number: global.Status,
            name: GameState[global.Status] || ''
        },
        session: {
            playTime: global.GameTime,
            playCount: 0 // need counting
        },
        settings: {
            interfaceVisible: global.ShowInterface,
            replayUIVisible: global.isReplayUiHidden === false,
            chatVisibilityStatus: {
                number: global.ChatStatus,
                name: ChatStatus[global.ChatStatus] || ''
            },

            leaderboard: {
                visible: gameplay.Leaderboard
                    ? gameplay.Leaderboard.isScoreboardVisible
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
            bassDensity: bassDensity.density,

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
                number: menu.MenuGameMode,
                name: Modes[menu.MenuGameMode] || ''
            },
            audio: settings.audio,
            background: settings.background,

            keybinds: settings.keybinds
        },
        profile: {
            userStatus: {
                number: user.rawLoginStatus,
                name: UserLoginStatus[user.rawLoginStatus] || ''
            },
            banchoStatus: {
                number: user.rawBanchoStatus,
                name: BanchoStatusEnum[user.rawBanchoStatus] || ''
            },
            id: user.id,
            name: user.name,
            mode: {
                number: user.playMode,
                name: Modes[user.playMode] || ''
            },

            rankedScore: user.rankedScore,
            level: user.level,

            accuracy: user.accuracy,
            pp: user.performancePoints,
            playCount: user.playCount,
            globalRank: user.rank,

            countryCode: {
                number: user.countryCode,
                name: CountryCodes[user.countryCode]?.toUpperCase() || ''
            },

            backgroundColour: user.backgroundColour?.toString(16)
        },
        beatmap: {
            time: {
                live: global.PlayTime,
                firstObject: beatmapPP.timings.firstObj,
                lastObject: beatmapPP.timings.full,
                mp3Length: menu.MP3Length
            },
            status: {
                number: menu.RankedStatus,
                name: BeatmapStatuses[menu.RankedStatus || -1] || ''
            },
            checksum: menu.MD5,

            id: menu.MapID,
            set: menu.SetID,

            mode: {
                number: beatmapPP.Mode,
                name: Modes[beatmapPP.Mode] || ''
            },

            artist: menu.Artist,
            artistUnicode: menu.ArtistOriginal,
            title: menu.Title,
            titleUnicode: menu.TitleOriginal,

            mapper: menu.Creator,

            version: menu.Difficulty,

            stats: buildBeatmapStats(beatmapPP, menu)
        },
        play: buildPlay(gameplay, beatmapPP, currentMods),
        leaderboard: gameplay.Leaderboard
            ? gameplay.Leaderboard.leaderBoard.map((slot) =>
                  convertMemoryPlayerToResult(slot, Modes[gameplay.Mode])
              )
            : [],
        performance: {
            accuracy: beatmapPP.ppAcc,
            graph: beatmapPP.strainsAll
        },
        resultsScreen: {
            scoreId: resultScreen.OnlineId,

            playerName: resultScreen.PlayerName,

            mode: {
                number: resultScreen.Mode,
                name: Modes[resultScreen.Mode] || ''
            },

            score: resultScreen.Score,
            accuracy: resultScreen.Accuracy,

            name: resultScreen.PlayerName, // legacy, remove it later
            hits: resultScreenHits,
            mods: {
                number: resultScreen.Mods,
                name: getOsuModsString(resultScreen.Mods)
            },
            maxCombo: resultScreen.MaxCombo,
            rank: resultScreen.Grade,
            pp: {
                current: resultScreen.pp,
                fc: resultScreen.fcPP
            },
            createdAt: resultScreen.Date
        },
        folders: {
            game: global.GameFolder,
            skin: global.SkinFolder,
            songs: global.SongsFolder,
            beatmap: menu.Folder
        },
        files: {
            beatmap: menu.Path,
            background: menu.BackgroundFilename,
            audio: menu.AudioFilename
        },
        directPath: {
            beatmapFile: path.join(menu.Folder || '', menu.Path || ''),
            beatmapBackground: path.join(
                menu.Folder || '',
                menu.BackgroundFilename || ''
            ),
            beatmapAudio: path.join(
                menu.Folder || '',
                menu.AudioFilename || ''
            ),
            beatmapFolder: menu.Folder,
            skinFolder: global.SkinFolder
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
            const { global, gameplay, menu, tourneyManager, beatmapPP } =
                instance.getServices([
                    'global',
                    'gameplay',
                    'menu',
                    'tourneyManager',
                    'beatmapPP'
                ]);

            const currentMods =
                global.Status === 2 || global.Status === 7
                    ? gameplay.Mods
                    : global.MenuMods;

            const spectatorTeam =
                iterator < osuTourneyClients.length / 2 ? 'left' : 'right';

            return {
                ipcId: instance.ipcId,
                team: spectatorTeam,
                user: {
                    id: tourneyManager.UserID,
                    name: tourneyManager.UserName,
                    country: tourneyManager.UserCountry,
                    accuracy: tourneyManager.UserAccuracy,
                    rankedScore: tourneyManager.UserRankedScore,
                    playCount: tourneyManager.UserPlayCount,
                    globalRank: tourneyManager.UserGlobalRank,
                    totalPP: tourneyManager.UserPP
                },
                beatmap: {
                    stats: buildBeatmapStats(beatmapPP, menu)
                },
                play: buildPlay(gameplay, beatmapPP, currentMods)
            };
        });

    const { tourneyManager } = osuTourneyManager[0].getServices([
        'tourneyManager'
    ]);

    const mappedChat = tourneyManager.Messages.map(
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
        scoreVisible: tourneyManager.ScoreVisible,
        starsVisible: tourneyManager.StarsVisible,

        ipcState: tourneyManager.IPCState,
        bestOF: tourneyManager.BestOf,
        team: {
            left: tourneyManager.FirstTeamName,
            right: tourneyManager.SecondTeamName
        },

        points: {
            left: tourneyManager.LeftStars,
            right: tourneyManager.RightStars
        },

        chat: mappedChat,

        totalScore: {
            left: tourneyManager.FirstTeamScore,
            right: tourneyManager.SecondTeamScore
        },
        clients: mappedOsuTourneyClients
    };
};

function buildBeatmapStats(beatmapPP: BeatmapPP, menu: Menu) {
    return {
        stars: {
            live: fixDecimals(beatmapPP.currAttributes.stars),
            aim: beatmapPP.calculatedMapAttributes.aim
                ? fixDecimals(beatmapPP.calculatedMapAttributes.aim)
                : undefined,
            speed: beatmapPP.calculatedMapAttributes.speed
                ? fixDecimals(beatmapPP.calculatedMapAttributes.speed)
                : undefined,
            flashlight: beatmapPP.calculatedMapAttributes.flashlight
                ? fixDecimals(beatmapPP.calculatedMapAttributes.flashlight)
                : undefined,
            sliderFactor: beatmapPP.calculatedMapAttributes.sliderFactor
                ? fixDecimals(beatmapPP.calculatedMapAttributes.sliderFactor)
                : undefined,
            stamina: beatmapPP.calculatedMapAttributes.stamina
                ? fixDecimals(beatmapPP.calculatedMapAttributes.stamina)
                : undefined,
            rhythm: beatmapPP.calculatedMapAttributes.rhythm
                ? fixDecimals(beatmapPP.calculatedMapAttributes.rhythm)
                : undefined,
            color: beatmapPP.calculatedMapAttributes.color
                ? fixDecimals(beatmapPP.calculatedMapAttributes.color)
                : undefined,
            peak: beatmapPP.calculatedMapAttributes.peak
                ? fixDecimals(beatmapPP.calculatedMapAttributes.peak)
                : undefined,
            hitWindow: beatmapPP.calculatedMapAttributes.hitWindow
                ? fixDecimals(beatmapPP.calculatedMapAttributes.hitWindow)
                : undefined,
            total: fixDecimals(beatmapPP.calculatedMapAttributes.fullStars)
        },

        ar: {
            original: fixDecimals(menu.AR),
            converted: fixDecimals(beatmapPP.calculatedMapAttributes.ar)
        },
        cs: {
            original: fixDecimals(menu.CS),
            converted: fixDecimals(beatmapPP.calculatedMapAttributes.cs)
        },
        od: {
            original: fixDecimals(menu.OD),
            converted: fixDecimals(beatmapPP.calculatedMapAttributes.od)
        },
        hp: {
            original: fixDecimals(menu.HP),
            converted: fixDecimals(beatmapPP.calculatedMapAttributes.hp)
        },

        bpm: {
            realtime: fixDecimals(beatmapPP.realtimeBPM),
            common: fixDecimals(beatmapPP.commonBPM),
            min: fixDecimals(beatmapPP.minBPM),
            max: fixDecimals(beatmapPP.maxBPM)
        },

        objects: {
            circles: beatmapPP.calculatedMapAttributes.circles,
            sliders: beatmapPP.calculatedMapAttributes.sliders,
            spinners: beatmapPP.calculatedMapAttributes.spinners,
            holds: beatmapPP.calculatedMapAttributes.holds,
            total:
                beatmapPP.calculatedMapAttributes.circles +
                beatmapPP.calculatedMapAttributes.sliders +
                beatmapPP.calculatedMapAttributes.spinners +
                beatmapPP.calculatedMapAttributes.holds
        },

        maxCombo: beatmapPP.calculatedMapAttributes.maxCombo
    };
}

function buildPlay(
    gameplay: Gameplay,
    beatmapPP: BeatmapPP,
    currentMods: number
) {
    return {
        playerName: gameplay.PlayerName,

        mode: {
            number: gameplay.Mode,
            name: Modes[gameplay.Mode] || ''
        },

        score: gameplay.Score,
        accuracy: gameplay.Accuracy,

        healthBar: {
            normal: (gameplay.PlayerHP / 200) * 100,
            smooth: (gameplay.PlayerHPSmooth / 200) * 100
        },

        hits: {
            300: gameplay.Hit300,
            geki: gameplay.HitGeki,
            100: gameplay.Hit100,
            katu: gameplay.HitKatu,
            50: gameplay.Hit50,
            0: gameplay.HitMiss,
            sliderBreaks: gameplay.HitSB
        },

        hitErrorArray: gameplay.HitErrors,

        combo: {
            current: gameplay.Combo,
            max: gameplay.MaxCombo
        },
        mods: {
            number: currentMods,
            name: getOsuModsString(currentMods)
        },
        rank: {
            current: gameplay.GradeCurrent,
            maxThisPlay: gameplay.GradeExpected
        },
        pp: {
            current: fixDecimals(beatmapPP.currAttributes.pp),
            fc: fixDecimals(beatmapPP.currAttributes.fcPP),
            maxAchievedThisPlay: fixDecimals(
                beatmapPP.currAttributes.maxThisPlayPP
            ),
            detailed: {
                current: {
                    aim: fixDecimals(beatmapPP.currPPAttributes.ppAim),
                    speed: fixDecimals(beatmapPP.currPPAttributes.ppSpeed),
                    accuracy: fixDecimals(
                        beatmapPP.currPPAttributes.ppAccuracy
                    ),
                    difficulty: fixDecimals(
                        beatmapPP.currPPAttributes.ppDifficulty
                    ),
                    flashlight: fixDecimals(
                        beatmapPP.currPPAttributes.ppFlashlight
                    ),
                    total: fixDecimals(beatmapPP.currAttributes.pp)
                },
                fc: {
                    aim: fixDecimals(beatmapPP.currPPAttributes.ppAim),
                    speed: fixDecimals(beatmapPP.currPPAttributes.ppSpeed),
                    accuracy: fixDecimals(
                        beatmapPP.currPPAttributes.ppAccuracy
                    ),
                    difficulty: fixDecimals(
                        beatmapPP.currPPAttributes.ppDifficulty
                    ),
                    flashlight: fixDecimals(
                        beatmapPP.currPPAttributes.ppFlashlight
                    ),
                    total: fixDecimals(beatmapPP.currAttributes.fcPP)
                }
            }
        },
        unstableRate: gameplay.UnstableRate
    };
}
