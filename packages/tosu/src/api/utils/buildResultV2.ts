import {
    BanchoStatus,
    ChatStatus,
    ClientType,
    CountryCodes,
    GameState,
    GroupType,
    LeaderboardType,
    ProgressBarType,
    Rulesets,
    ScoreMeterType,
    SortType,
    StableBeatmapStatuses,
    UserLoginStatus
} from '@tosu/common';
import path from 'path';

import {
    ApiAnswer,
    Leaderboard,
    Tourney,
    TourneyChatMessages,
    TourneyClients
} from '@/api/types/v2';
import { InstanceManager } from '@/instances/manager';
import { BeatmapPP } from '@/states/beatmap';
import { Gameplay } from '@/states/gameplay';
import { Menu } from '@/states/menu';
import { LeaderboardPlayer as MemoryLeaderboardPlayer } from '@/states/types';
import { calculateAccuracy, calculateGrade } from '@/utils/calculators';
import { fixDecimals } from '@/utils/converters';
import { CalculateMods } from '@/utils/osuMods.types';

const convertMemoryPlayerToResult = (
    memoryPlayer: MemoryLeaderboardPlayer,
    gameMode: any
): Leaderboard => {
    const hits = {
        300: memoryPlayer.h300,
        100: memoryPlayer.h100,
        50: memoryPlayer.h50,
        0: memoryPlayer.h0,
        geki: 0,
        katu: 0
    };

    return {
        isFailed: memoryPlayer.isPassing === false,

        position: memoryPlayer.position,
        team: memoryPlayer.team,

        name: memoryPlayer.name,

        score: memoryPlayer.score,
        accuracy: calculateAccuracy({ hits, mode: gameMode }),

        hits,

        combo: {
            current: memoryPlayer.combo,
            max: memoryPlayer.maxCombo
        },
        mods: {
            number: memoryPlayer.mods.number,
            name: memoryPlayer.mods.name,
            array: memoryPlayer.mods.array,
            rate: memoryPlayer.mods.rate
        },
        rank: calculateGrade({
            mods: memoryPlayer.mods.number,
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
        global.status === GameState.play
            ? gameplay.mods
            : global.status === GameState.resultScreen
              ? resultScreen.mods
              : global.menuMods;

    const resultScreenHits = {
        300: resultScreen.hit300,
        geki: resultScreen.hitGeki,
        100: resultScreen.hit100,
        katu: resultScreen.hitKatu,
        50: resultScreen.hit50,
        0: resultScreen.hitMiss,
        sliderEndHits: resultScreen.sliderEndHits,
        sliderTickHits: resultScreen.sliderTickHits
    };

    return {
        client: ClientType[osuInstance.client],
        state: {
            number: global.status,
            name: GameState[global.status] || ''
        },
        session: {
            playTime: global.gameTime,
            playCount: 0 // need counting
        },
        settings: {
            interfaceVisible: global.showInterface,
            replayUIVisible: global.isReplayUiHidden === false,
            chatVisibilityStatus: {
                number: global.chatStatus,
                name: ChatStatus[global.chatStatus] || ''
            },

            leaderboard: {
                visible: gameplay.isLeaderboardVisible,
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
                number: menu.gamemode,
                name: Rulesets[menu.gamemode] || ''
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
                name: BanchoStatus[user.rawBanchoStatus] || ''
            },
            id: user.id,
            name: user.name,
            mode: {
                number: user.playMode,
                name: Rulesets[user.playMode] || ''
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
                live: global.playTime,
                firstObject: beatmapPP.timings.firstObj,
                lastObject: beatmapPP.timings.full,
                mp3Length: menu.mp3Length
            },
            status: {
                number: menu.rankedStatus,
                name: StableBeatmapStatuses[menu.rankedStatus || -1] || ''
            },
            checksum: menu.checksum,

            id: menu.mapID,
            set: menu.setID,

            mode: {
                number: beatmapPP.mode,
                name: Rulesets[beatmapPP.mode] || ''
            },

            artist: menu.artist,
            artistUnicode: menu.artistOriginal,
            title: menu.title,
            titleUnicode: menu.titleOriginal,

            mapper: menu.creator,

            version: menu.difficulty,

            stats: buildBeatmapStats(beatmapPP, menu)
        },
        play: buildPlay(gameplay, beatmapPP, currentMods),
        leaderboard: gameplay.leaderboardScores.map((slot) =>
            convertMemoryPlayerToResult(slot, Rulesets[gameplay.mode])
        ),
        performance: {
            accuracy: beatmapPP.ppAcc,
            graph: beatmapPP.strainsAll
        },
        resultsScreen: {
            scoreId: resultScreen.onlineId,

            playerName: resultScreen.playerName,

            mode: {
                number: resultScreen.mode,
                name: Rulesets[resultScreen.mode] || ''
            },

            score: resultScreen.score,
            accuracy: resultScreen.accuracy,

            name: resultScreen.playerName, // legacy, remove it later
            hits: resultScreenHits,
            mods: {
                number: resultScreen.mods.number,
                name: resultScreen.mods.name,
                array: resultScreen.mods.array,
                rate: resultScreen.mods.rate
            },
            maxCombo: resultScreen.maxCombo,
            rank: resultScreen.grade,
            pp: {
                current: resultScreen.pp,
                fc: resultScreen.fcPP
            },
            createdAt: resultScreen.date
        },
        folders: {
            game: global.gameFolder,
            skin: global.skinFolder,
            songs: global.songsFolder,
            beatmap: menu.folder
        },
        files: {
            beatmap: menu.filename,
            background: menu.backgroundFilename,
            audio: menu.audioFilename
        },
        directPath: {
            beatmapFile: path.join(menu.folder || '', menu.filename || ''),
            beatmapBackground: path.join(
                menu.folder || '',
                menu.backgroundFilename || ''
            ),
            beatmapAudio: path.join(
                menu.folder || '',
                menu.audioFilename || ''
            ),
            beatmapFolder: menu.folder,
            skinFolder: global.skinFolder
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
                global,
                gameplay,
                resultScreen,
                menu,
                tourneyManager,
                beatmapPP
            } = instance.getServices([
                'global',
                'gameplay',
                'menu',
                'resultScreen',
                'tourneyManager',
                'beatmapPP'
            ]);

            const currentMods =
                global.status === GameState.play
                    ? gameplay.mods
                    : global.status === GameState.resultScreen
                      ? resultScreen.mods
                      : global.menuMods;

            const spectatorTeam =
                iterator < osuTourneyClients.length / 2 ? 'left' : 'right';

            return {
                ipcId: instance.ipcId,
                team: spectatorTeam,
                user: {
                    id: tourneyManager.userID,
                    name: tourneyManager.userName,
                    country: tourneyManager.userCountry,
                    accuracy: tourneyManager.userAccuracy,
                    rankedScore: tourneyManager.userRankedScore,
                    playCount: tourneyManager.userPlayCount,
                    globalRank: tourneyManager.userGlobalRank,
                    totalPP: tourneyManager.userPP
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

    const mappedChat = tourneyManager.messages.map(
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
        scoreVisible: tourneyManager.scoreVisible,
        starsVisible: tourneyManager.starsVisible,

        ipcState: tourneyManager.ipcState,
        bestOF: tourneyManager.bestOf,
        team: {
            left: tourneyManager.firstTeamName,
            right: tourneyManager.secondTeamName
        },

        points: {
            left: tourneyManager.leftStars,
            right: tourneyManager.rightStars
        },

        chat: mappedChat,

        totalScore: {
            left: tourneyManager.firstTeamScore,
            right: tourneyManager.secondTeamScore
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
            original: fixDecimals(menu.ar),
            converted: fixDecimals(beatmapPP.calculatedMapAttributes.ar)
        },
        cs: {
            original: fixDecimals(menu.cs),
            converted: fixDecimals(beatmapPP.calculatedMapAttributes.cs)
        },
        od: {
            original: fixDecimals(menu.od),
            converted: fixDecimals(beatmapPP.calculatedMapAttributes.od)
        },
        hp: {
            original: fixDecimals(menu.hp),
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
    currentMods: CalculateMods
) {
    return {
        playerName: gameplay.playerName,

        mode: {
            number: gameplay.mode,
            name: Rulesets[gameplay.mode] || ''
        },

        score: gameplay.score,
        accuracy: gameplay.accuracy,

        healthBar: {
            normal: (gameplay.playerHP / 200) * 100,
            smooth: (gameplay.playerHPSmooth / 200) * 100
        },

        hits: {
            300: gameplay.hit300,
            geki: gameplay.hitGeki,
            100: gameplay.hit100,
            katu: gameplay.hitKatu,
            50: gameplay.hit50,
            0: gameplay.hitMiss,
            sliderBreaks: gameplay.hitSB,
            sliderEndHits: gameplay.sliderEndHits,
            sliderTickHits: gameplay.sliderTickHits
        },

        hitErrorArray: gameplay.hitErrors,

        combo: {
            current: gameplay.combo,
            max: gameplay.maxCombo
        },
        mods: {
            number: currentMods.number,
            name: currentMods.name,
            array: currentMods.array,
            rate: currentMods.rate
        },
        rank: {
            current: gameplay.gradeCurrent,
            maxThisPlay: gameplay.gradeExpected
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
        unstableRate: gameplay.unstableRate
    };
}
