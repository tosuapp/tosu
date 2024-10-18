import { KeyOverlay, LeaderboardPlayer } from '@/states/gameplay';
import { ITourneyManagerChatItem } from '@/states/tourney';
import { OsuMods } from '@/utils/osuMods.types';

export type IAudioVelocityBase = number[] | null;

export type IUser =
    | Error
    | {
          name: string;
          accuracy: number;
          rankedScore: number;
          id: number;
          level: number;
          playCount: number;
          playMode: number;
          rank: number;
          countryCode: number;
          performancePoints: number;
          rawBanchoStatus: number;
          backgroundColour: number;
          rawLoginStatus: number;
      };

export type ISettingsPointers = { config: number; binding: number } | Error;
export type IOffsets = number[] | Error;

export type IConfigValue =
    | {
          key: string;
          value: any;
      }
    | null
    | Error;

export type IBindingValue =
    | {
          key: number;
          value: number;
      }
    | Error;

export type IResultScreen =
    | {
          onlineId: number;
          playerName: string;
          mods: OsuMods;
          mode: number;
          maxCombo: number;
          score: number;
          hit100: number;
          hit300: number;
          hit50: number;
          hitGeki: number;
          hitKatu: number;
          hitMiss: number;
          date: string;
      }
    | string
    | Error;

export type IScore = {
    retries: number;
    playerName: string;
    mods: OsuMods;
    mode: number;
    score: number;
    playerHPSmooth: number;
    playerHP: number;
    accuracy: number;
    hit100: number;
    hit300: number;
    hit50: number;
    hitGeki: number;
    hitKatu: number;
    hitMiss: number;
    combo: number;
    maxCombo: number;
};

export type IGameplay = IScore | string | Error;

export type IKeyOverlay = KeyOverlay | string | Error;
export type IHitErrors = number[] | string | Error;

export type IGlobal =
    | {
          isWatchingReplay: boolean;
          isReplayUiHidden: boolean;

          showInterface: boolean;
          chatStatus: number;
          status: number;

          gameTime: number;
          menuMods: number;

          skinFolder: string;
          memorySongsFolder: string;
      }
    | string
    | Error;

export type IGlobalPrecise = { time: number } | Error;

export type IMenu =
    | {
          gamemode: number;
          checksum: string;
          filename: string;
          plays: number;
          artist: string;
          artistOriginal: string;
          title: string;
          titleOriginal: string;
          ar: number;
          cs: number;
          hp: number;
          od: number;
          audioFilename: string;
          backgroundFilename: string;
          folder: string;
          creator: string;
          difficulty: string;
          mapID: number;
          setID: number;
          rankedStatus: number;
          objectCount: number;
      }
    | string
    | Error;

export type IMP3Length = number | Error;

export type ITourney =
    | {
          ipcState: number;
          leftStars: number;
          rightStars: number;
          bestOf: number;
          starsVisible: boolean;
          scoreVisible: boolean;
          firstTeamName: string;
          secondTeamName: string;
          firstTeamScore: number;
          secondTeamScore: number;
      }
    | string
    | Error;

export type ITourneyChat = ITourneyManagerChatItem[] | Error;

export type ITourneyUser =
    | {
          id: number;
          name: string;
          country: string;
          accuracy: number;
          playcount: number;
          rankedScore: number;
          globalRank: number;
          pp: number;
      }
    | string
    | Error;

export type ILeaderboard =
    | [boolean, LeaderboardPlayer | undefined, LeaderboardPlayer[]]
    | Error;
