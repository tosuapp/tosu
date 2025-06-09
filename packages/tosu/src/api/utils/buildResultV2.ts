import {
    BanchoStatus,
    ChatStatus,
    ClientType,
    CountryCodes,
    GameState,
    GroupType,
    LazerBeatmapTabType,
    LazerSortMode,
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
import { LazerInstance } from '@/instances/lazerInstance';
import { InstanceManager } from '@/instances/manager';
import { IUserProtected } from '@/memory/types';
import { BeatmapPP } from '@/states/beatmap';
import { Gameplay } from '@/states/gameplay';
import { LeaderboardPlayer as MemoryLeaderboardPlayer } from '@/states/types';
import { calculateAccuracy, calculateGrade } from '@/utils/calculators';
import { fixDecimals } from '@/utils/converters';
import { CalculateMods } from '@/utils/osuMods.types';

const convertMemoryPlayerToResult = (
    memoryPlayer: MemoryLeaderboardPlayer,
    gameMode: any,
    client: ClientType
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

        id: memoryPlayer.userId,
        name: memoryPlayer.name,

        score: memoryPlayer.score,
        accuracy: calculateAccuracy({ isRound: true, hits, mode: gameMode }),

        hits,

        combo: {
            current: memoryPlayer.combo,
            max: memoryPlayer.maxCombo
        },
        mods: {
            checksum: memoryPlayer.mods.checksum,
            number: memoryPlayer.mods.number,
            name: memoryPlayer.mods.name,
            array: memoryPlayer.mods.array,
            rate: memoryPlayer.mods.rate
        },
        rank: calculateGrade({
            isLazer: client === ClientType.lazer,
            mods: memoryPlayer.mods.number,
            mode: gameMode,
            hits
        })
    };
};

export const buildResult = (instanceManager: InstanceManager): ApiAnswer => {
    const osuInstance = instanceManager.getInstance(
        instanceManager.focusedClient
    );
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

    const currentMode =
        global.status === 2
            ? gameplay.mode
            : global.status === 7
              ? resultScreen.mode
              : menu.gamemode;

    const resultScreenHits = {
        300: resultScreen.hit300,
        geki: resultScreen.hitGeki,
        100: resultScreen.hit100,
        katu: resultScreen.hitKatu,
        50: resultScreen.hit50,
        0: resultScreen.hitMiss,
        sliderEndHits: resultScreen.sliderEndHits,
        smallTickHits: resultScreen.smallTickHits,
        largeTickHits: resultScreen.largeTickHits
    };

    return {
        client: ClientType[osuInstance.client],
        server: osuInstance.customServerEndpoint ?? 'ppy.sh',
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
                    name:
                        osuInstance.client === ClientType.lazer
                            ? LazerBeatmapTabType[settings.leaderboardType] ||
                              ''
                            : LeaderboardType[settings.leaderboardType] || ''
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
                name:
                    osuInstance.client === ClientType.lazer
                        ? LazerSortMode[settings.sortType] || ''
                        : SortType[settings.sortType] || ''
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
            isKiai: beatmapPP.isKiai,
            isBreak: beatmapPP.isBreak,
            isConvert:
                beatmapPP.mode === 0 ? beatmapPP.mode !== currentMode : false,
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

            stats: buildBeatmapStats(beatmapPP)
        },
        play: buildPlay(gameplay, beatmapPP, currentMods),
        leaderboard: gameplay.leaderboardScores.map((slot) =>
            convertMemoryPlayerToResult(
                slot,
                Rulesets[gameplay.mode],
                osuInstance.client
            )
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
                checksum: resultScreen.mods.checksum,
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

        tourney:
            osuInstance instanceof LazerInstance && global.isMultiSpectating
                ? buildLazerTourneyData(osuInstance)
                : buildTourneyData(instanceManager)
    };
};

const buildLazerTourneyData = (
    osuInstance: LazerInstance
): Tourney | undefined => {
    const { global, lazerMultiSpectating } = osuInstance.getServices([
        'global',
        'lazerMultiSpectating'
    ]);

    if (!lazerMultiSpectating.lazerSpectatingData) {
        return undefined;
    }

    return {
        scoreVisible: global.status === GameState.lobby,
        starsVisible: false,

        ipcState: global.status,
        bestOF: 0,
        team: {
            left: '',
            right: ''
        },

        points: {
            left: 0,
            right: 0
        },

        chat: [],

        totalScore: {
            left: lazerMultiSpectating.lazerSpectatingData.spectatingClients
                .filter((client) => client.team === 'red')
                .reduce((pv, cv) => (pv += cv.score?.score || 0), 0),
            right: lazerMultiSpectating.lazerSpectatingData.spectatingClients
                .filter((client) => client.team === 'blue')
                .reduce((pv, cv) => (pv += cv.score?.score || 0), 0)
        },

        clients: lazerMultiSpectating.lazerSpectatingData.spectatingClients.map(
            (client, index) => {
                const currentGrade = calculateGrade({
                    isLazer: true,
                    mods: client.score!.mods.number,
                    mode: client.score!.mode,
                    hits: {
                        300: client.score!.hit300,
                        geki: 0,
                        100: client.score!.hit100,
                        katu: 0,
                        50: client.score!.hit50,
                        0: client.score!.hitMiss
                    }
                });

                const currentMods =
                    global.status === GameState.play
                        ? client.score!.mods
                        : global.status === GameState.resultScreen
                          ? ((client.resultScreen! as any)
                                .mods as CalculateMods)
                          : global.menuMods;

                return {
                    ipcId: index,
                    team: client.team === 'red' ? 'left' : 'right',

                    user: {
                        id: (client.user as IUserProtected).id,
                        name: client.user.name,
                        country:
                            CountryCodes[
                                (client.user as IUserProtected).countryCode
                            ]?.toUpperCase() || '',
                        accuracy: (client.user as IUserProtected).accuracy,
                        rankedScore: (client.user as IUserProtected)
                            .rankedScore,
                        playCount: (client.user as IUserProtected).playCount,
                        globalRank: (client.user as IUserProtected).rank,
                        totalPP: (client.user as IUserProtected)
                            .performancePoints
                    },

                    beatmap: {
                        stats: {
                            // not supported start
                            stars: {
                                live: 0,
                                aim: 0,
                                speed: 0,
                                flashlight: 0,
                                sliderFactor: 0,
                                stamina: 0,
                                rhythm: 0,
                                color: 0,
                                reading: 0,
                                hitWindow: 0,
                                total: 0
                            },

                            ar: {
                                original: 0,
                                converted: 0
                            },
                            cs: {
                                original: 0,
                                converted: 0
                            },
                            od: {
                                original: 0,
                                converted: 0
                            },
                            hp: {
                                original: 0,
                                converted: 0
                            },

                            bpm: {
                                realtime: 0,
                                common: 0,
                                min: 0,
                                max: 0
                            },

                            objects: {
                                circles: 0,
                                sliders: 0,
                                spinners: 0,
                                holds: 0,
                                total: 0
                            },

                            maxCombo: 0
                            // not supported end
                        }
                    },

                    play: {
                        playerName: client.score!.playerName,

                        mode: {
                            number: client.score!.mode,
                            name: Rulesets[client.score!.mode] || ''
                        },

                        score: client.score!.score,
                        accuracy: client.score!.accuracy,

                        healthBar: {
                            normal: (client.score!.playerHP / 200) * 100,
                            smooth: (client.score!.playerHPSmooth / 200) * 100
                        },

                        hits: {
                            300: client.score!.hit300,
                            geki: client.score!.hitGeki,
                            100: client.score!.hit100,
                            katu: client.score!.hitKatu,
                            50: client.score!.hit50,
                            0: client.score!.hitMiss,
                            sliderEndHits: client.score!.sliderEndHits,
                            smallTickHits: client.score!.smallTickHits,
                            largeTickHits: client.score!.largeTickHits,
                            // TODO: ADD SLIDERBREAKS
                            sliderBreaks: 0
                        },

                        // not supported
                        hitErrorArray: [],

                        combo: {
                            current: client.score!.combo,
                            max: client.score!.maxCombo
                        },
                        mods: {
                            checksum: currentMods.checksum,
                            number: currentMods.number,
                            name: currentMods.name,
                            array: currentMods.array,
                            rate: currentMods.rate
                        },
                        rank: {
                            current: currentGrade,
                            maxThisPlay: currentGrade
                        },

                        // not supported start
                        pp: {
                            current: fixDecimals(client!.score!.pp || 0),
                            fc: 0,
                            maxAchieved: 0,
                            maxAchievable: 0,
                            detailed: {
                                current: {
                                    aim: 0,
                                    speed: 0,
                                    accuracy: 0,
                                    difficulty: 0,
                                    flashlight: 0,
                                    total: 0
                                },
                                fc: {
                                    aim: 0,
                                    speed: 0,
                                    accuracy: 0,
                                    difficulty: 0,
                                    flashlight: 0,
                                    total: 0
                                }
                            }
                        },
                        unstableRate: 0
                        // not supported end
                    }
                };
            }
        )
    };
};

const buildTourneyData = (
    instanceManager: InstanceManager
): Tourney | undefined => {
    const osuTourneyManager = Object.values(
        instanceManager.osuInstances
    ).filter((instance) => instance.isTourneyManager);
    if (osuTourneyManager.length < 1) {
        return {
            scoreVisible: false,
            starsVisible: false,

            ipcState: 0,
            bestOF: 0,
            team: {
                left: '',
                right: ''
            },

            points: {
                left: 0,
                right: 0
            },

            chat: [],

            totalScore: {
                left: 0,
                right: 0
            },
            clients: []
        };
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
                tourneyManager,
                beatmapPP
            } = instance.getServices([
                'global',
                'gameplay',
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
                    stats: buildBeatmapStats(beatmapPP)
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

function buildBeatmapStats(beatmapPP: BeatmapPP) {
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
            reading: beatmapPP.calculatedMapAttributes.reading
                ? fixDecimals(beatmapPP.calculatedMapAttributes.reading)
                : undefined,
            hitWindow: beatmapPP.calculatedMapAttributes.hitWindow
                ? fixDecimals(beatmapPP.calculatedMapAttributes.hitWindow)
                : undefined,
            total: fixDecimals(beatmapPP.calculatedMapAttributes.fullStars)
        },

        ar: {
            original: fixDecimals(beatmapPP.calculatedMapAttributes.ar),
            converted: fixDecimals(
                beatmapPP.calculatedMapAttributes.arConverted
            )
        },
        cs: {
            original: fixDecimals(beatmapPP.calculatedMapAttributes.cs),
            converted: fixDecimals(
                beatmapPP.calculatedMapAttributes.csConverted
            )
        },
        od: {
            original: fixDecimals(beatmapPP.calculatedMapAttributes.od),
            converted: fixDecimals(
                beatmapPP.calculatedMapAttributes.odConverted
            )
        },
        hp: {
            original: fixDecimals(beatmapPP.calculatedMapAttributes.hp),
            converted: fixDecimals(
                beatmapPP.calculatedMapAttributes.hpConverted
            )
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
            smallTickHits: gameplay.smallTickHits,
            largeTickHits: gameplay.largeTickHits
        },

        hitErrorArray: gameplay.hitErrors,

        combo: {
            current: gameplay.combo,
            max: gameplay.maxCombo
        },
        mods: {
            checksum: currentMods.checksum,
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
            maxAchieved: fixDecimals(beatmapPP.currAttributes.maxAchieved),
            maxAchievable: fixDecimals(beatmapPP.currAttributes.maxAchievable),
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
