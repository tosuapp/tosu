import { LogColor, LogSymbol } from '../enums/logging';
import { getLocalTime } from './logger';

class ProgressManager {
    private active = false;
    private currentTitle = '';
    private currentProgress = 0;
    private currentMessage = '';
    private barWidth = 30;
    private lastRender = 0;

    public get isActive() {
        return this.active;
    }

    start(title: string) {
        this.active = true;
        this.currentTitle = title;
        this.currentProgress = 0;
        this.currentMessage = '';

        if (process.stdout.isTTY) {
            console.log('');
        }

        this.render();
    }

    update(progress: number, message: string = '') {
        this.currentProgress = progress;
        this.currentMessage = message;

        // Throttle rendering to at most every 100ms.
        const now = Date.now();
        if (progress >= 1 || now - this.lastRender > 100) {
            this.render();
        }
    }

    async end(message: string = 'Completed') {
        this.render();

        // Wait a moment to let the user see the completed progress bar.
        await new Promise((resolve) => setTimeout(resolve, 1000));

        this.clear();
        this.active = false;

        if (process.stdout.isTTY) {
            const time = `${LogColor.Grey}${getLocalTime()}${LogColor.Reset}`;
            const prefix = `${time} ${LogColor.Info} ${LogSymbol.Info} ${LogColor.Reset}`;
            console.log(`${prefix} ${this.currentTitle}: ${message}`);
        }
    }

    clear() {
        if (!this.active) return;
        if (process.stdout.isTTY) {
            process.stdout.clearLine(0);
            process.stdout.cursorTo(0);

            process.stdout.moveCursor(0, -1);
            process.stdout.clearLine(0);
            process.stdout.cursorTo(0);
        }
    }

    render() {
        if (!this.active) return;
        if (!process.stdout.isTTY) return;

        this.lastRender = Date.now();
        const time = `${LogColor.Grey}${getLocalTime()}${LogColor.Reset}`;

        const prefix = `${time} ${LogColor.Info} ${LogSymbol.Info} ${LogColor.Reset}`;

        const filledWidth = Math.round(this.barWidth * this.currentProgress);
        const emptyWidth = this.barWidth - filledWidth;

        const progressBar =
            LogColor.GreenText +
            LogSymbol.ProgressBarFilled.repeat(filledWidth) +
            LogColor.Grey +
            LogSymbol.ProgressBarEmpty.repeat(emptyWidth) +
            LogColor.Reset;
        const percentage = (this.currentProgress * 100)
            .toFixed(0)
            .padStart(3, ' ');

        process.stdout.write(
            `\r${prefix} ${this.currentTitle} [${progressBar}] ${percentage}% ${this.currentMessage}\x1b[K`
        );
    }
}

export const progressManager = new ProgressManager();
