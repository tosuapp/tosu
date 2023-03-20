import path from 'path';

import { LeaderboardPlayer as MemoryLeaderboardPlayer } from '@/Instances/Leaderboard';
import { DataRepo } from '@/Services/repo';
import { getOsuModsString } from '@/Utils/osuMods';
import { OsuMods } from '@/Utils/osuMods.types';

import { ApiAnswer, LeaderboardPlayer } from './types';

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

export const buildResult = (service: DataRepo): ApiAnswer => {
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
					full: path.join(menuData.Folder, menuData.BackgroundFilename),
					folder: menuData.Folder,
					file: menuData.Path,
					bg: menuData.BackgroundFilename,
					audio: menuData.AudioFilename
				}
			},
			mods: {
				num: allTimesData.MenuMods,
				str: getOsuModsString(allTimesData.MenuMods)
			},
			pp: {
				...beatmapPpData.ppAcc,
				strains: beatmapPpData.strains
			}
		},
		gameplay: {
			gameMode: gamePlayData.Mode,
			name: gamePlayData.PlayerName,
			score:
				(gamePlayData.Mods & OsuMods.ScoreV2) === OsuMods.ScoreV2
					? gamePlayData.ScoreV2
					: gamePlayData.Score,
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
						? convertMemoryPlayerToResult(gamePlayData.Leaderboard.player)
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
		}
	};
};
