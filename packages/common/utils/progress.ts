import { LogColor, LogSymbol } from '../enums/logging';
import { getLocalTime } from './logger';

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

    public get isActive() {
        return this.bars.size > 0;
    }

    start(title: string): symbol {
        const token = Symbol(title);

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

    async end(token: symbol, message: string = 'Completed') {
        const bar = this.bars.get(token);
        if (!bar) return;

        this.render();

        // Wait a moment to let the user see the completed progress bar.
        await new Promise((resolve) => setTimeout(resolve, 1000));

        if (this.bars.has(token)) {
            this.clear();
            this.bars.delete(token);

            if (process.stdout.isTTY) {
                const time = `${LogColor.Grey}${getLocalTime()}${LogColor.Reset}`;
                const prefix = `${time} ${LogColor.Info} ${LogSymbol.Info} ${LogColor.Reset}`;
                console.log(`${prefix} ${bar.title}: ${message}`);
            }

            this.render();
        }
    }

    clear() {
        if (this.lastLineCount === 0) return;
        if (!process.stdout.isTTY) return;

        process.stdout.moveCursor(0, -this.lastLineCount);
        process.stdout.cursorTo(0);
        process.stdout.clearScreenDown();

        this.lastLineCount = 0;
    }

    render() {
        if (this.bars.size === 0) return;
        if (!process.stdout.isTTY) return;

        this.clear();

        const lines: string[] = [];
        lines.push('');

        for (const [, bar] of this.bars) {
            const time = `${LogColor.Grey}${getLocalTime()}${LogColor.Reset}`;
            const prefix = `${time} ${LogColor.Info} ${LogSymbol.Info} ${LogColor.Reset}`;

            const filledWidth = Math.round(this.barWidth * bar.progress);
            const emptyWidth = this.barWidth - filledWidth;

            const progressBar =
                LogColor.GreenText +
                LogSymbol.ProgressBarFilled.repeat(filledWidth) +
                LogColor.Grey +
                LogSymbol.ProgressBarEmpty.repeat(emptyWidth) +
                LogColor.Reset;

            const percentage = (bar.progress * 100).toFixed(0).padStart(3, ' ');

            lines.push(
                `${prefix} ${bar.title} [${progressBar}] ${percentage}% ${bar.message}`
            );
        }

        const output = lines.join('\n');
        process.stdout.write(output);

        this.lastLineCount = lines.length - 1;
        if (this.lastLineCount < 0) this.lastLineCount = 0;
    }
}

export const progressManager = new ProgressManager();
