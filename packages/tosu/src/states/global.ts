import { ClientType, measureTime, wLogger } from '@tosu/common';

import { AbstractState } from '@/states';
import { safeJoin } from '@/utils/converters';
import { defaultCalculatedMods } from '@/utils/osuMods';
import { CalculateMods } from '@/utils/osuMods.types';

export class Global extends AbstractState {
    isWatchingReplay: boolean = false;
    isReplayUiHidden: boolean = false;
    isMultiSpectating: boolean = false;
    showInterface: boolean = false;

    chatStatus: number = 0;
    status: number = 0;

    paused: boolean = false;
    gameTime: number = 0;
    playTime: number = 0;
    previousPlayTime: number = 0;

    menuMods: CalculateMods = Object.assign({}, defaultCalculatedMods);

    gameFolder: string = '';
    skinFolder: string = '';
    songsFolder: string = '';
    memorySongsFolder: string = '';

    setGameFolder(value: string) {
        if (typeof value !== 'string') return;

        this.gameFolder = value;
    }

    setSongsFolder(value: string) {
        if (typeof value !== 'string') return;

        this.songsFolder = value;
    }

    @measureTime
    updateState() {
        try {
            const result = this.game.memory.global();
            if (result instanceof Error) throw result;
            if (typeof result === 'string') {
                if (result === '') return;

                wLogger.debug(
                    ClientType[this.game.client],
                    this.game.pid,
                    `global updateState`,
                    result
                );

                return 'not-ready';
            }

            this.isWatchingReplay = result.isWatchingReplay;
            this.isReplayUiHidden = result.isReplayUiHidden;
            this.isMultiSpectating = result.isMultiSpectating;

            this.showInterface = result.showInterface;
            this.chatStatus = result.chatStatus;

            this.gameTime = result.gameTime;
            this.menuMods = result.menuMods;

            this.paused = this.previousPlayTime === this.playTime;
            this.previousPlayTime = this.playTime;

            this.skinFolder = safeJoin(result.skinFolder);
            this.memorySongsFolder = safeJoin(result.memorySongsFolder);

            this.game.resetReportCount('global updateState');
        } catch (exc) {
            this.game.reportError(
                'global updateState',
                10,
                ClientType[this.game.client],
                this.game.pid,
                `global updateState`,
                (exc as any).message
            );
            wLogger.debug(
                ClientType[this.game.client],
                this.game.pid,
                `global updateState`,
                exc
            );
        }
    }

    updatePreciseState() {
        try {
            const result = this.game.memory.globalPrecise();
            if (result instanceof Error) throw result;

            this.playTime = result.time;
            this.status = result.status;

            this.game.resetReportCount('global updatePreciseState');
        } catch (exc) {
            this.game.reportError(
                'global updatePreciseState',
                10,
                ClientType[this.game.client],
                this.game.pid,
                `global updatePreciseState`,
                (exc as any).message
            );
            wLogger.debug(
                ClientType[this.game.client],
                this.game.pid,
                `global updatePreciseState`,
                exc
            );
        }
    }
}
