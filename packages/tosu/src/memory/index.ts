import { platform } from 'process';
import { Process } from 'tsprocess/dist/process';

import { AbstractInstance } from '@/instances';
import { KeyOverlay } from '@/states/gameplay';
import { OsuMods } from '@/utils/osuMods.types';
import { BindingsList, ConfigList } from '@/utils/settings.types';

// TODO: fix this when PatternData will be separated for each
export type ScanPatterns = {
    [k in keyof any]: {
        pattern: string;
        offset?: number;
        isTourneyOnly?: boolean;
    };
};

export interface PatternData {
    baseAddr: number;
    playTimeAddr: number;
    chatCheckerPtr: number;
    skinDataAddr: number;
    settingsClassAddr: number;
    configurationAddr: number;
    bindingsAddr: number;
    rulesetsAddr: number;
    canRunSlowlyAddr: number;
    statusPtr: number;
    menuModsPtr: number;
    getAudioLengthPtr: number;
    userProfilePtr: number;
    rawLoginStatusPtr: number;
    spectatingUserPtr: number;
    gameTimePtr: number;
}

export abstract class AbstractMemory {
    pid: number;
    process: Process;
    path: string = '';

    game: AbstractInstance;

    patterns: PatternData = {
        baseAddr: 0,
        playTimeAddr: 0,
        chatCheckerPtr: 0,
        skinDataAddr: 0,
        settingsClassAddr: 0,
        configurationAddr: 0,
        bindingsAddr: 0,
        rulesetsAddr: 0,
        canRunSlowlyAddr: 0,
        statusPtr: 0,
        menuModsPtr: 0,
        getAudioLengthPtr: 0,
        userProfilePtr: 0,
        rawLoginStatusPtr: 0,
        spectatingUserPtr: 0,
        gameTimePtr: 0
    };

    private leaderStart: number = platform !== 'win32' ? 0xc : 0x8;

    constructor(process: Process, instance: AbstractInstance) {
        this.process = process;

        this.pid = process.id;
        this.path = process.path;

        this.game = instance;
    }

    abstract getScanPatterns(): ScanPatterns;

    setPattern(key: keyof PatternData, val: number): boolean {
        this.patterns[key] = val;
        return true;
    }

    getPattern(key: keyof PatternData) {
        return this.patterns[key];
    }

    getPatterns<T extends (keyof PatternData)[]>(
        patterns: T
    ): Pick<PatternData, T[number]> | never {
        return patterns.reduce(
            (acc, item: keyof Pick<PatternData, T[number]>) => {
                acc[item] = this.patterns[item];
                return acc;
            },
            {} as Pick<PatternData, T[number]>
        );
    }

    getLeaderStart() {
        return this.leaderStart;
    }

    abstract audioVelocityBase(): number[] | null;

    abstract user():
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

    abstract settingsPointers(): { config: number; binding: number } | Error;
    abstract configOffsets(address: number, list: ConfigList): number[] | Error;

    abstract bindingsOffsets(
        address: number,
        list: BindingsList
    ): number[] | Error;

    abstract configValue(
        address: number,
        position: number,
        list: ConfigList
    ):
        | {
              key: string;
              value: any;
          }
        | null
        | Error;

    abstract bindingValue(
        address: number,
        position: number
    ):
        | {
              key: number;
              value: number;
          }
        | Error;

    abstract resultScreen():
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

    abstract gameplay():
        | {
              address: number;
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
          }
        | string
        | Error;

    abstract keyOverlay(mode: number): KeyOverlay | string | Error;
    abstract hitErors(): number[] | string | Error;
    abstract global():
        | {
              isWatchingReplay: number;
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

    abstract globalPrecise(): { time: number } | Error;
}
