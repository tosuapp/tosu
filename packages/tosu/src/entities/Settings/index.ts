enum ReleaseStream {
    CuttingEdge,
    Stable,
    Beta,
    Fallback
}

enum ScoreMeterType {
    None,
    Colour,
    Error
}

interface Volume {
    master: number;
    music: number;
    effect: number;
}

interface Background {
    dim: number;
    video: boolean;
    storyboard: boolean;
}

interface Client {
    branch: ReleaseStream;
}

interface Window {
    fullscreen: boolean;
    width: number;
    height: number;
    widthFullscreen: number;
    heightFullscreen: number;
}

interface ScoreMeter {
    type: ScoreMeterType;
    size: number;
}

interface Offset {
    universal: number;
}

interface Cursor {
    size: number;
}

interface Mouse {
    sensitivity: number;
}

export class Settings {
    volume: Volume = { master: 0, music: 0, effect: 0 };
    background: Background = { dim: 0, video: false, storyboard: false };
    client: Client = { branch: 0 };
    window: Window = {
        fullscreen: false,
        width: 0,
        height: 0,
        widthFullscreen: 0,
        heightFullscreen: 0
    };
    scoreMeter: ScoreMeter = { type: ScoreMeterType.None, size: 0 };
    offset: Offset = { universal: 0 };
    cursor: Cursor = { size: 0 };
    mouse: Mouse = { sensitivity: 0 };

    showInterface: boolean = false;
    gameFolder: string = '';
    skinFolder: string = '';
    songsFolder: string = '';

    setShowInterface(value: boolean) {
        this.showInterface = value;
    }

    setGameFolder(value: string) {
        this.gameFolder = value;
    }

    setSkinFolder(value: string) {
        this.skinFolder = value;
    }

    setSongsFolder(value: string) {
        this.songsFolder = value;
    }
}
