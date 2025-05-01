export enum MultiplayerUserState {
    Idle,
    Ready,
    WaitingForLoad,
    Loaded,
    ReadyForGameplay,
    Playing,
    FinishedPlay,
    Results,
    Spectating
}

export type MultiplayerTeamType = 'red' | 'blue' | 'none';
