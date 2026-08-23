import { GameState } from '@tosu/common';

export enum StreamCompanionStatus {
    Null = 0,
    Listening = 1,
    Playing = 2,
    Watching = 8,
    Editing = 16,
    ResultsScreen = 32
}

export function toStreamCompanionStatus(
    status: number,
    isWatchingReplay: boolean
): StreamCompanionStatus {
    switch (status) {
        case GameState.play:
            return isWatchingReplay
                ? StreamCompanionStatus.Watching
                : StreamCompanionStatus.Playing;
        case GameState.edit:
        case GameState.selectEdit:
            return StreamCompanionStatus.Editing;
        case GameState.resultScreen:
        case GameState.rankingVs:
        case GameState.rankingTagCoop:
        case GameState.rankingTeam:
            return StreamCompanionStatus.ResultsScreen;
        default:
            return StreamCompanionStatus.Listening;
    }
}
