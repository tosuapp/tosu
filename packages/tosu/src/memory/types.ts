import type { ITourneyManagerChatItem } from '@/states/tourney';
import type {
    KeyOverlayButton,
    LeaderboardPlayer,
    Statistics
} from '@/states/types';
import type { MultiplayerTeamType } from '@/utils/multiplayer.types';
import type { CalculateMods } from '@/utils/osuMods.types';
import type { SettingsObject } from '@/utils/settings.types';

export type ScanPatterns = {
    [k in keyof any]: {
        pattern: string;
        offset?: number;
        isTourneyOnly?: boolean;
    };
};

export type IAudioVelocityBase = number[] | string;

export interface IUserProtected {
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
}

export type IUser = Error | IUserProtected;

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
          mods: CalculateMods;
          mode: number;
          accuracy: number;
          maxCombo: number;
          score: number;
          statistics: Statistics;
          maximumStatistics: Statistics;
          date: string;
      }
    | string
    | Error;

export type IScore = {
    retries: number;
    playerName: string;
    mods: CalculateMods;
    mode: number;
    score: number;
    playerHPSmooth: number;
    playerHP: number;
    accuracy: number;
    statistics: Statistics;
    maximumStatistics: Statistics;
    combo: number;
    maxCombo: number;
    pp?: number;
};

export type IGameplay = IScore | string | Error;

export type IKeyOverlay = KeyOverlayButton[] | string | Error;
export type IHitErrors = number[] | string | Error;

export type IGlobal =
    | {
          isWatchingReplay: boolean;
          isReplayUiHidden: boolean;
          isMultiSpectating: boolean;

          showInterface: boolean;
          chatStatus: number;
          status: number;

          gameTime: number;
          menuMods: CalculateMods;

          skinFolder: string;
          memorySongsFolder: string;
      }
    | string
    | Error;

export type IGlobalPrecise = { time: number } | Error;

export type IMenu =
    | {
          type: 'update';
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
          audioFileMimetype: string;
          backgroundFilename: string;
          backgroundFileMimetype: string;
          folder: string;
          creator: string;
          difficulty: string;
          mapID: number;
          setID: number;
          rankedStatus: number;
          objectCount: number;
      }
    | {
          type: 'checksum';
          gamemode: number;
          rankedStatus: number;
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

export type ITourneyChat = ITourneyManagerChatItem[] | Error | boolean;

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

export interface ILazerSpectatorEntry {
    team: MultiplayerTeamType;
    user: IUser;
    resultScreen: IResultScreen | undefined;
    score: IScore | undefined;
}

export type ILazerSpectator =
    | {
          chat: ITourneyManagerChatItem[];
          spectatingClients: ILazerSpectatorEntry[];
      }
    | undefined;

export type ISettings = SettingsObject | Error;
