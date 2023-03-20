export class Settings {
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
