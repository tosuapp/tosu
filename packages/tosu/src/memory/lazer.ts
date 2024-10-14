import { KeyOverlay } from '@/states/gameplay';
import { OsuMods } from '@/utils/osuMods.types';
import { BindingsList, ConfigList } from '@/utils/settings.types';

import { AbstractMemory, ScanPatterns } from '.';

export class LazerMemory extends AbstractMemory {
    private scanPatterns: ScanPatterns = {
        spectatorClient: {
            pattern:
                '3F 00 00 80 3F 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 80 3F 00 00 80 3F 00 00 80 3F 00 00 80 3F 00 00 80 3F 00 00 80 3F 00 00 80 3F 00 00 80 3F 00 00 80 3F 00 00 80 3F 00 00 80 3F 00 00 80 3F 00 00 80 3F 00 00 80 3F 00 00 80 3F 00 00 80 3F 01 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 ?? 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00',
            offset: -0x16f
        }
    };

    getScanPatterns(): ScanPatterns {
        return this.scanPatterns;
    }

    audioVelocityBase(): number[] | null {
        throw new Error('Lazer:audioVelocityBase not implemented.');
    }

    user():
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
          } {
        throw new Error('Lazer:user not implemented.');
    }

    settingsPointers(): { config: number; binding: number } | Error {
        throw new Error('Lazer:settingsPointers not implemented.');
    }

    configOffsets(address: number, list: ConfigList): number[] | Error {
        throw new Error(
            'Lazer:configOffsets not implemented.' + address + list
        );
    }

    bindingsOffsets(address: number, list: BindingsList): number[] | Error {
        throw new Error(
            'Lazer:bindingsOffsets not implemented.' + address + list
        );
    }

    configValue(
        address: number,
        position: number,
        list: ConfigList
    ): { key: string; value: any } | null | Error {
        throw new Error(
            'Lazer:configValue not implemented.' + address + position + list
        );
    }

    bindingValue(
        address: number,
        position: number
    ): { key: number; value: number } | Error {
        throw new Error(
            'Lazer:bindingValue not implemented.' + address + position
        );
    }

    resultScreen():
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
        | Error {
        throw new Error('Lazer:resultScreen not implemented.');
    }

    gameplay():
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
        | Error {
        throw new Error('Lazer:gameplay not implemented.');
    }

    keyOverlay(mode: number): KeyOverlay | string | Error {
        throw new Error('Lazer:keyOverlay not implemented.' + mode);
    }

    hitErors(): number[] | string | Error {
        throw new Error('Lazer:hitErrors not implemented.');
    }

    global():
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
        | Error {
        throw new Error('Lazer:global not implemented.');
    }

    globalPrecise(): { time: number } | Error {
        throw new Error('Lazer:globalPrecise not implemented.');
    }
}
