import { ClientType, wLogger } from '@tosu/common';

import { AbstractState } from '@/states';
import { defaultCalculatedMods } from '@/utils/osuMods';
import { CalculateMods } from '@/utils/osuMods.types';

export class Global extends AbstractState {
    isWatchingReplay: boolean = false;
    isReplayUiHidden: boolean = false;
    showInterface: boolean = false;

    chatStatus: number = 0;
    status: number = 0;

    gameTime: number = 0;
    playTime: number = 0;
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

            this.showInterface = result.showInterface;
            this.chatStatus = result.chatStatus;
            this.status = result.status;

            this.gameTime = result.gameTime;
            this.menuMods = result.menuMods;

            this.skinFolder = result.skinFolder;
            this.memorySongsFolder = result.memorySongsFolder;

            this.resetReportCount('global updateState');
        } catch (exc) {
            this.reportError(
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

            this.resetReportCount('global updatePreciseState');
        } catch (exc) {
            this.reportError(
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
