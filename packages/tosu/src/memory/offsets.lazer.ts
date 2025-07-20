export const expectedVtableValue: number = 7765317648384;

export const lazerOffsets = {
    'osu.Game.OsuGame': { osuLogo: 1592, ScreenStack: 1536 },
    'osu.Game.OsuGameBase': {
        '<API>k__BackingField': 1080,
        '<SpectatorClient>k__BackingField': 1192,
        '<ScoreManager>k__BackingField': 1024,
        '<MultiplayerClient>k__BackingField': 1200,
        beatmapClock: 1232,
        '<Storage>k__BackingField': 1088,
        '<Beatmap>k__BackingField': 1104,
        '<LocalConfig>k__BackingField': 984,
        rulesetConfigCache: 1176,
        realm: 1216
    },
    'osu.Game.Screens.SelectV2.SoloSongSelect': {
        '<game>k__BackingField': 1208
    },
    'osu.Game.Screens.Play.SubmittingPlayer': {
        '<api>k__BackingField': 1248,
        '<spectatorClient>k__BackingField': 1256
    },
    'osu.Game.Screens.Play.PlayerLoader': { osuLogo: 1168 },
    'osu.Game.Beatmaps.FramedBeatmapClock': { finalClockSource: 528 },
    'osu.Framework.Timing.FramedClock': {
        '<CurrentTime>k__BackingField': 48
    },
    'osu.Game.Screens.OsuScreen': { '<logo>k__BackingField': 896 },
    'osu.Game.Screens.Ranking.SoloResultsScreen': {
        '<api>k__BackingField': 1032
    },
    'osu.Game.Screens.Edit.Editor': {
        '<realm>k__BackingField': 960,
        '<api>k__BackingField': 1096
    },
    'osu.Game.Screens.OnlinePlay.OnlinePlayScreen': {
        '<API>k__BackingField': 960
    },
    'osu.Game.Screens.OnlinePlay.Multiplayer.Multiplayer': {
        '<client>k__BackingField': 976
    },
    'osu.Game.Screens.Spectate.SpectatorScreen': {
        '<spectatorClient>k__BackingField': 944
    },
    'osu.Game.Screens.OnlinePlay.Multiplayer.Spectate.MultiSpectatorScreen': {
        '<multiplayerClient>k__BackingField': 1032
    },
    'osu.Game.Online.Multiplayer.OnlineMultiplayerClient': {
        '<IsConnected>k__BackingField': 728
    },
    'osu.Game.Online.Multiplayer.MultiplayerClient': { room: 648 },
    'osu.Game.Screens.Play.Player': {
        '<api>k__BackingField': 1008,
        '<scoreManager>k__BackingField': 1000,
        '<Score>k__BackingField': 1152
    },
    'osu.Framework.Screens.ScreenStack': { stack: 800 },
    'osu.Game.Rulesets.RulesetConfigCache': { configCache: 520 }
} as const;
