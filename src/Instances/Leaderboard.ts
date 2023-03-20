import { Process } from '@/Memory/process';

export interface LeaderboardPlayer {
	Name: string;
	Score: number;
	Combo: number;
	MaxCombo: number;
	Mods: number;
	H300: number;
	H100: number;
	H50: number;
	H0: number;
	Team: number;
	Position: number;
	IsPassing: boolean;
}

export class Leaderboard {
	private process: Process;

	private leaderboardBase: number = 0;

	leaderBoard: LeaderboardPlayer[] = [];

	player: LeaderboardPlayer | undefined;

	isScoreboardVisible: boolean = false;

	constructor(process: Process, leaderboardBase: number) {
		this.process = process;
		this.leaderboardBase = leaderboardBase;
	}

	updateBase(newBase: number) {
		this.leaderboardBase = newBase;
	}

	private readLeaderPlayerStruct(base: number): [LeaderboardPlayer, boolean] {
		const IsLeaderBoardVisible = this.process.readByte(
			this.process.readInt(base + 0x24) + 0x20
		);
		const scoreboardEntry = this.process.readInt(base + 0x20);

		// [[Base + 0x20] + 0x1C] + 0x8
		const ModsXor1 = this.process.readInt(
			this.process.readInt(scoreboardEntry + 0x1c) + 0x8
		);
		// [[Base + 0x20] + 0x1C] + 0xC
		const ModsXor2 = this.process.readInt(
			this.process.readInt(scoreboardEntry + 0x1c) + 0xc
		);
		return [
			{
				// [Base + 0x8]
				Name: this.process.readSharpString(this.process.readInt(base + 0x8)),
				// Base + 0x30
				Score: this.process.readInt(base + 0x30),
				// [Base + 0x20] + 0x94
				Combo: this.process.readShort(scoreboardEntry + 0x94),
				// [Base + 0x20] + 0x68
				MaxCombo: this.process.readShort(scoreboardEntry + 0x68),
				Mods: ModsXor1 ^ ModsXor2,
				// [Base + 0x20] + 0x8A
				H300: this.process.readShort(scoreboardEntry + 0x8a),
				// [Base + 0x20] + 0x88
				H100: this.process.readShort(scoreboardEntry + 0x88),
				// [Base + 0x20] + 0x8C
				H50: this.process.readShort(scoreboardEntry + 0x8c),
				// [Base + 0x20] + 0x92
				H0: this.process.readShort(scoreboardEntry + 0x92),
				// Base + 0x40
				Team: this.process.readInt(base + 0x40),
				// Base + 0x2C
				Position: this.process.readInt(base + 0x2c),
				// Base + 0x4B
				IsPassing: Boolean(this.process.readByte(base + 0x4b))
			},
			Boolean(IsLeaderBoardVisible)
		];
	}

	readLeaderboard() {
		if (this.leaderboardBase === 0) {
			this.clear();
			return this.leaderBoard;
		}

		const playerBase = this.process.readInt(this.leaderboardBase + 0x10);
		[this.player, this.isScoreboardVisible] = this.readLeaderPlayerStruct(playerBase);

		const playersArray = this.process.readInt(this.leaderboardBase + 0x4);
		const amOfSlots = this.process.readInt(playersArray + 0xc);
		if (amOfSlots < 1 || amOfSlots > 64) {
			return;
		}

		const newLeaderBoard: LeaderboardPlayer[] = [];

		const items = this.process.readInt(playersArray + 0x4);
		const itemsSize = this.process.readInt(playersArray + 0xc);

		for (let i = 0; i < itemsSize; i++) {
			const current = items + 0x8 + 0x4 * i;

			const [player] = this.readLeaderPlayerStruct(this.process.readInt(current));
			newLeaderBoard.push(player);
		}
		this.leaderBoard = newLeaderBoard;
	}

	clear() {
		this.player = undefined;
		this.leaderBoard = [];
	}
}
