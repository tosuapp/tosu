import { LogColor, LogSymbol } from '../enums/logging';
import { getLocalTime, wLogger } from './logger';

interface ProgressState {
    title: string;
    progress: number;
    message: string;
    lastRender: number;
}

class ProgressManager {
    private bars = new Map<symbol, ProgressState>();
    private barWidth = 30;
    private lastLineCount = 0;
    private isDisabled = false;

    public get isActive() {
        return !this.isDisabled && this.bars.size > 0;
    }

    start(title: string): symbol {
        const token = Symbol(title);
        if (this.isDisabled) return token;

        this.bars.set(token, {
            title,
            progress: 0,
            message: '',
            lastRender: 0
        });

        this.render();
        return token;
    }

    update(token: symbol, progress: number, message: string = '') {
        if (this.isDisabled) return;
        const bar = this.bars.get(token);
        if (!bar) return;

        bar.progress = progress;
        bar.message = message;

        // Throttle rendering to at most every 100ms.
        const now = Date.now();
        if (progress >= 1 || now - bar.lastRender > 100) {
            bar.lastRender = now;
            this.render();
        }
    }

    async end(
        token: symbol,
        message: string = 'Completed',
        delay: number = 500
    ) {
        const bar = this.bars.get(token);
        if (!bar) return;

        bar.progress = 1;
        this.render();

        // Wait a moment to let the user see the completed progress bar if in a TTY.
        if (process.stdout.isTTY && delay > 0) {
            await new Promise((resolve) => setTimeout(resolve, delay));
        }

        if (this.bars.has(token)) {
            const title = bar.title;
            this.bars.delete(token);

            wLogger.info(`${title}: ${message}`);
        }
    }

    clear() {
        if (this.isDisabled || this.lastLineCount === 0) return;
        if (!process.stdout.isTTY) return;

        try {
            process.stdout.moveCursor(0, -this.lastLineCount);
            process.stdout.cursorTo(0);
            process.stdout.clearScreenDown();

            this.lastLineCount = 0;
        } catch {
            this.isDisabled = true;
            this.bars.clear();
        }
    }

    render() {
        if (this.isDisabled || this.bars.size === 0) return;
        if (!process.stdout.isTTY) return;

        try {
            this.clear();
            if (this.isDisabled) return;

            const lines: string[] = [];
            lines.push('');

            for (const [, bar] of this.bars) {
                const time = `${LogColor.Grey}${getLocalTime()}${LogColor.Reset}`;
                const prefix = `${LogColor.Info}${LogSymbol.Separator} ${time}${LogColor.Reset} `;

                const filledWidth = Math.round(this.barWidth * bar.progress);
                const emptyWidth = this.barWidth - filledWidth;

                const progressBar =
                    LogColor.GreenText +
                    LogSymbol.ProgressBarFilled.repeat(filledWidth) +
                    LogColor.Grey +
                    LogSymbol.ProgressBarEmpty.repeat(emptyWidth) +
                    LogColor.Reset;

                const percentage = (bar.progress * 100)
                    .toFixed(0)
                    .padStart(3, ' ');

                lines.push(
                    `${prefix} ${bar.title} [${progressBar}] ${percentage}% ${bar.message}`
                );
            }

            const output = lines.join('\n');
            process.stdout.write(output);

            this.lastLineCount = lines.length - 1;
            if (this.lastLineCount < 0) this.lastLineCount = 0;
        } catch {
            this.isDisabled = true;
            this.bars.clear();
        }
    }
}

export const progressManager = new ProgressManager();
