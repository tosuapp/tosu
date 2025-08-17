export const expectedVtableValue: number = 7765317648384;

export const lazerOffsets = {
    'osu.Game.OsuGame': { osuLogo: 0x638, ScreenStack: 1536 },
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
        '<game>k__BackingField': 0x400
    },
    'osu.Game.Screens.Play.SubmittingPlayer': {
        '<api>k__BackingField': 1248,
        '<spectatorClient>k__BackingField': 1256
    },
    'osu.Game.Screens.Play.PlayerLoader': { osuLogo: 1168 },
    'osu.Game.Beatmaps.FramedBeatmapClock': {
        finalClockSource: 528,
        decoupledTrack: 0x228
    },
    'osu.Framework.Timing.DecouplingFramedClock': {
        '<Source>k__BackingField': 0x18
    },
    'osu.Framework.Audio.Track.TrackBass': {
        length: 0x48
    },
    'osu.Framework.Timing.FramedClock': {
        '<CurrentTime>k__BackingField': 48
    },
    'osu.Game.Screens.OsuScreen': { '<logo>k__BackingField': 896 },
    'osu.Game.Screens.Ranking.SoloResultsScreen': {
        '<api>k__BackingField': 0x410,
        '<logo>k__BackingField': 0x380,
        SelectedScore: 0x398
    },
    'osu.Game.Screens.Edit.Editor': {
        '<realm>k__BackingField': 960,
        '<api>k__BackingField': 1096
    },
    'osu.Game.Screens.OnlinePlay.OnlinePlayScreen': {
        '<API>k__BackingField': 960
    },
    'osu.Game.Screens.OnlinePlay.Multiplayer.Multiplayer': {
        '<client>k__BackingField': 976,
        '<API>k__BackingField': 0x3c0
    },
    'osu.Game.Screens.Spectate.SpectatorScreen': {
        '<spectatorClient>k__BackingField': 944
    },
    'osu.Game.Screens.OnlinePlay.Multiplayer.Spectate.MultiSpectatorScreen': {
        '<multiplayerClient>k__BackingField': 1032,
        gameplayStates: 0x3e0
    },
    'osu.Game.Online.Multiplayer.OnlineMultiplayerClient': {
        '<IsConnected>k__BackingField': 728,
        room: 0x288
    },
    'osu.Game.Online.Multiplayer.MultiplayerClient': { room: 648 },
    'osu.Game.Screens.Play.Player': {
        '<api>k__BackingField': 1008,
        '<scoreManager>k__BackingField': 1000,
        '<Score>k__BackingField': 1152
    },
    'osu.Framework.Screens.ScreenStack': { stack: 800 },
    'osu.Game.Rulesets.RulesetConfigCache': { configCache: 520 },
    'osu.Game.Online.Chat.ExternalLinkOpener': {
        '<api>k__BackingField': 0x218
    },
    'osu.Game.Online.API.APIAccess': {
        '<localUser>k__BackingField': 0x250,
        game: 0x1f8
    },
    'osu.Desktop.OsuGameDesktop': {
        '<API>k__BackingField': 0x438,
        '<MultiplayerClient>k__BackingField': 0x4b0,
        '<frameworkConfig>k__BackingField': 0x5b8,
        '<SkinManager>k__BackingField': 0x410,
        '<Host>k__BackingField': 0x338,
        AvailableMods: 0x468,
        SelectedMods: 0x460,
        Ruleset: 0x458
    },
    'osu.Game.Scoring.ScoreInfo': {
        '<OnlineID>k__BackingField': 0xb8,
        '<LegacyOnlineID>k__BackingField': 0xc0,
        '<ModsJson>k__BackingField': 0x50,
        '<HitEvents>k__BackingField': 0x78,
        '<RealmUser>k__BackingField': 0x48,
        '<TotalScore>k__BackingField': 0xa0,
        '<MaxCombo>k__BackingField': 0xcc,
        '<Combo>k__BackingField': 0xd4,
        '<Passed>k__BackingField': 0xdc,
        '<Ruleset>k__BackingField': 0x30,
        '<Accuracy>k__BackingField': 0xb0,
        '<Date>k__BackingField': 0x100,
        statistics: 0x80,
        user: 0x70
    },
    'osu.Game.IO.OsuStorage': {
        '<UnderlyingStorage>k__BackingField': 0x10,
        '<BasePath>k__BackingField': 0x8
    },
    'osu.Game.Beatmaps.WorkingBeatmapCache+BeatmapManagerWorkingBeatmap': {
        BeatmapInfo: 0x8,
        BeatmapSetInfo: 0x10
    },
    'osu.Game.Models.RealmUser': {
        '<Username>k__BackingField': 0x18,
        '<OnlineID>k__BackingField': 0x28
    },
    'osu.Game.Rulesets.RulesetInfo': {
        '<OnlineID>k__BackingField': 0x30
    },
    'osu.Game.Screens.Play.SoloPlayer': {
        '<ScoreProcessor>k__BackingField': 0x448,
        '<HealthProcessor>k__BackingField': 0x450,
        '<HUDOverlay>k__BackingField': 0x460,
        RestartCount: 0x394,
        dependencies: 0x490
    },
    'osu.Game.Rulesets.Osu.Scoring.OsuScoreProcessor': {
        Combo: 0x250,
        hitEvents: 0x288
    },
    'osu.Game.Online.API.Requests.Responses.APIMe': {
        '<Id>k__BackingField': 0xe8,
        '<Username>k__BackingField': 0x8,
        countryCodeString: 0x20,
        statistics: 0xa0,
        PlayMode: 0x88
    },
    'osu.Game.Users.UserStatistics': {
        RankedScore: 0x20,
        GlobalRank: 0x54,
        PlayCount: 0x38,
        Accuracy: 0x28,
        Level: 0x4c,
        PP: 0x68
    },
    'osu.Game.Rulesets.Osu.Scoring.OsuHealthProcessor': {
        Health: 0x230
    },
    'osu.Game.Screens.Play.HUDOverlay': {
        InputCountController: 0x348
    },
    'osu.Game.Screens.Play.HUD.InputCountController': {
        triggers: 0x200
    },
    'osu.Game.Rulesets.Osu.UI.DrawableOsuRuleset': {
        '<ReplayScore>k__BackingField': 0x328
    },
    'osu.Game.Beatmaps.BeatmapInfo': {
        '<OnlineID>k__BackingField': 0x8c,
        '<MD5Hash>k__BackingField': 0x58,
        '<StatusInt>k__BackingField': 0x88,
        '<Metadata>k__BackingField': 0x30,
        '<Difficulty>k__BackingField': 0x28,
        '<DifficultyName>k__BackingField': 0x18,
        '<TotalObjectCount>k__BackingField': 0x94,
        '<Hash>k__BackingField': 0x50
    },
    'osu.Game.Beatmaps.BeatmapSetInfo': {
        '<OnlineID>k__BackingField': 0x30
    },
    'osu.Game.Beatmaps.BeatmapMetadata': {
        '<Title>k__BackingField': 0x18,
        '<TitleUnicode>k__BackingField': 0x20,
        '<Artist>k__BackingField': 0x28,
        '<ArtistUnicode>k__BackingField': 0x30,
        '<Author>k__BackingField': 0x38,
        '<Source>k__BackingField': 0x40,
        '<Tags>k__BackingField': 0x48,
        '<UserTags>k__BackingField': 0x50,
        '<PreviewTime>k__BackingField': 0x68,
        '<AudioFile>k__BackingField': 0x58,
        '<BackgroundFile>k__BackingField': 0x60
    },
    'osu.Game.Beatmaps.BeatmapDifficulty': {
        '<DrainRate>k__BackingField': 0x28,
        '<CircleSize>k__BackingField': 0x2c,
        '<OverallDifficulty>k__BackingField': 0x30,
        '<ApproachRate>k__BackingField': 0x34,
        '<SliderMultiplier>k__BackingField': 0x18,
        '<SliderTickRate>k__BackingField': 0x20
    },
    'osu.Game.Online.Multiplayer.MultiplayerRoomUser': {
        UserID: 0x28,
        '<State>k__BackingField': 0x2c,
        '<BeatmapAvailability>k__BackingField': 0x8,
        '<Mods>k__BackingField': 0x10,
        '<MatchState>k__BackingField': 0x18,
        RulesetId: 0x30,
        BeatmapId: 0x38,
        '<User>k__BackingField': 0x20
    },
    'osu.Game.Skinning.SkinManager': {
        CurrentSkin: 0x50
    },
    'osu.Game.Skinning.LegacySkin': {
        '<Name>k__BackingField': 0x40
    },
    'osu.Framework.Platform.Windows.WindowsGameHost': {
        '<inputConfig>k__BackingField': 0x30
    },
    'osu.Framework.Configuration.InputConfigManager': {
        '<InputHandlers>k__BackingField': 0x20
    },
    'osu.Framework.Input.Handlers.Tablet.OpenTabletDriverHandler': {
        '<AreaOffset>k__BackingField': 0x48,
        '<AreaSize>k__BackingField': 0x50,
        '<Rotation>k__BackingField': 0x58,
        '<PressureThreshold>k__BackingField': 0x60
    },
    'osu.Framework.Platform.Windows.WindowsMouseHandler': {
        '<UseRelativeMode>k__BackingField': 0x28
    }
} as const;
