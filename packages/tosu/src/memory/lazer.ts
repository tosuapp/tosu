import { AbstractMemory, ScanPatterns } from '@/memory';
import type {
    IAudioVelocityBase,
    IBindingValue,
    IConfigValue,
    IGameplay,
    IGlobal,
    IGlobalPrecise,
    IHitErrors,
    IKeyOverlay,
    ILeaderboard,
    IMP3Length,
    IMenu,
    IOffsets,
    IResultScreen,
    ISettingsPointers,
    ITourney,
    ITourneyChat,
    ITourneyUser,
    IUser
} from '@/memory/types';
import { ReportError, ResetReportCount } from '@/states';
import { ITourneyManagerChatItem } from '@/states/tourney';
import { BindingsList, ConfigList } from '@/utils/settings.types';

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

    audioVelocityBase(): IAudioVelocityBase {
        throw new Error('Lazer:audioVelocityBase not implemented.');
    }

    user(): IUser {
        throw new Error('Lazer:user not implemented.');
    }

    settingsPointers(): ISettingsPointers {
        throw new Error('Lazer:settingsPointers not implemented.');
    }

    configOffsets(
        address: number,
        list: ConfigList,
        reportError: ReportError,
        resetCount: ResetReportCount
    ): IOffsets {
        console.log(address, list, reportError, resetCount);

        throw new Error('Lazer:configOffsets not implemented.');
    }

    bindingsOffsets(
        address: number,
        list: BindingsList,
        reportError: ReportError,
        resetCount: ResetReportCount
    ): IOffsets {
        console.log(address, list, reportError, resetCount);

        throw new Error('Lazer:bindingsOffsets not implemented.');
    }

    configValue(
        address: number,
        position: number,
        list: ConfigList
    ): IConfigValue {
        console.log(address, position, list);
        throw new Error('Lazer:configValue not implemented.');
    }

    bindingValue(address: number, position: number): IBindingValue {
        console.log(address, position);
        throw new Error('Lazer:bindingValue not implemented.');
    }

    resultScreen(): IResultScreen {
        throw new Error('Lazer:resultScreen not implemented.');
    }

    gameplay(): IGameplay {
        throw new Error('Lazer:gameplay not implemented.');
    }

    keyOverlay(mode: number): IKeyOverlay {
        console.log(mode);
        throw new Error('Lazer:keyOverlay not implemented.');
    }

    hitErrors(): IHitErrors {
        throw new Error('Lazer:hitErrors not implemented.');
    }

    global(): IGlobal {
        throw new Error('Lazer:global not implemented.');
    }

    globalPrecise(): IGlobalPrecise {
        throw new Error('Lazer:globalPrecise not implemented.');
    }

    menu(previousChecksum: string): IMenu {
        console.log(previousChecksum);
        throw new Error('Lazer:menu not implemented.');
    }

    mp3Length(): IMP3Length {
        throw new Error('Lazer:mp3Length not implemented.');
    }

    tourney(): ITourney {
        throw new Error('Lazer:tourney not implemented.');
    }

    tourneyChat(
        messages: ITourneyManagerChatItem[],
        reportError: ReportError,
        resetCount: ResetReportCount
    ): ITourneyChat {
        console.log(messages, reportError, resetCount);

        throw new Error('Lazer:tourneyChat not implemented.');
    }

    tourneyUser(): ITourneyUser {
        throw new Error('Lazer:tourneyUser not implemented.');
    }

    leaderboard(rulesetAddr: number): ILeaderboard {
        console.log(rulesetAddr);
        throw new Error('Lazer:tourneyUser not implemented.');
    }
}
