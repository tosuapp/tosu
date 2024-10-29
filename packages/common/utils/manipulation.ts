export function formatMilliseconds(ms: number) {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const milliseconds = ms % 1000;

    const hoursStr = String(hours).padStart(2, '0');
    const minutesStr = String(minutes).padStart(2, '0');
    const secondsStr = String(seconds).padStart(2, '0');

    return `${hoursStr}:${minutesStr}:${secondsStr}.${milliseconds}`;
}

export function capitalizeFirstLetter(text: string) {
    if (text === '') return '';
    return text.charAt(0).toUpperCase() + text.slice(1);
}
