export enum GradeEnum {
    XH,
    X,
    SH,
    S,
    A,
    B,
    C,
    D,
    None
}

export enum GameState {
    menu,
    edit,
    play,
    exit,
    selectEdit,
    selectPlay,
    selectDrawings,
    resultScreen,
    update,
    busy,
    unknown,
    lobby,
    matchSetup,
    selectMulti,
    rankingVs,
    onlineSelection,
    optionsOffsetWizard,
    rankingTagCoop,
    rankingTeam,
    beatmapImport,
    packageUpdater,
    benchmark,
    tourney,
    charts
}

export enum LobbyStatus {
    notJoined,
    idle,
    pendingJoin,
    pendingCreate,
    setup,
    play,
    results
}

export enum StableBeatmapStatuses {
    unknown,
    notSubmitted = 1,
    pending = 2,
    ranked = 4,
    approved = 5,
    qualified = 6,
    loved = 7
}

export enum Rulesets {
    osu = 0,
    taiko = 1,
    fruits = 2,
    mania = 3
}

export enum BanchoStatus {
    idle,
    afk,
    playing,
    editing,
    modding,
    multiplayer,
    watching,
    unknown,
    testing,
    submitting,
    paused,
    lobby,
    multiplaying,
    osuDirect
}

export enum UserLoginStatus {
    reconnecting = 0,
    guest = 256,
    recieving_data = 257,
    disconnected = 65537,
    connected = 65793
}

export enum ReleaseStream {
    cuttingEdge,
    stable,
    beta,
    fallback
}

export enum ScoreMeterType {
    none,
    colour,
    error
}

export enum LeaderboardType {
    local,
    global,
    selectedmods,
    friends,
    country
}

export enum GroupType {
    none,
    artist,
    bPM,
    creator,
    date,
    difficulty,
    length,
    rank,
    myMaps,
    search = 12,
    show_All = 12,
    title,
    lastPlayed,
    onlineFavourites,
    maniaKeys,
    mode,
    collection,
    rankedStatus
}

export enum SortType {
    artist,
    bpm,
    creator,
    date,
    difficulty,
    length,
    rank,
    title
}

export enum ChatStatus {
    hidden,
    visible,
    visibleWithFriendsList
}

export enum ProgressBarType {
    off,
    pie,
    topRight,
    bottomRight,
    bottom
}

export enum ScoringMode {
    standardised,
    classic
}

export enum LazerHitResults {
    none = 0,
    miss = 1,
    meh = 2,
    ok = 3,
    good = 4,
    great = 5,
    perfect = 6,
    smallTickMiss = 7,
    smallTickHit = 8,
    largeTickMiss = 9,
    largeTickHit = 10,
    smallBonus = 11,
    largeBonus = 12,
    ignoreMiss = 13,
    ignoreHit = 14,
    comboBreak = 15,
    sliderTailHit = 16,
    legacyComboIncrease = 99
}

export enum LazerSettings {
    Ruleset,
    Token,
    MenuCursorSize,
    GameplayCursorSize,
    AutoCursorSize,
    GameplayCursorDuringTouch,
    DimLevel,
    BlurLevel,
    EditorDim,
    LightenDuringBreaks,
    ShowStoryboard,
    KeyOverlay,
    GameplayLeaderboard,
    PositionalHitsoundsLevel,
    AlwaysPlayFirstComboBreak,
    FloatingComments,
    HUDVisibilityMode,
    ShowHealthDisplayWhenCantFail,
    FadePlayfieldWhenHealthLow,
    MouseDisableButtons,
    MouseDisableWheel,
    ConfineMouseMode,
    AudioOffset,
    VolumeInactive,
    MenuMusic,
    MenuVoice,
    MenuTips,
    CursorRotation,
    MenuParallax,
    Prefer24HourTime,
    BeatmapDetailTab,
    BeatmapDetailModsFilter,
    Username,
    ReleaseStream,
    SavePassword,
    SaveUsername,
    DisplayStarsMinimum,
    DisplayStarsMaximum,
    SongSelectGroupMode,
    SongSelectSortingMode,
    RandomSelectAlgorithm,
    ModSelectHotkeyStyle,
    ShowFpsDisplay,
    ChatDisplayHeight,
    BeatmapListingCardSize,
    ToolbarClockDisplayMode,
    SongSelectBackgroundBlur,
    Version,
    ShowFirstRunSetup,
    ShowConvertedBeatmaps,
    Skin,
    ScreenshotFormat,
    ScreenshotCaptureMenuCursor,
    BeatmapSkins,
    BeatmapColours,
    BeatmapHitsounds,
    IncreaseFirstObjectVisibility,
    ScoreDisplayMode,
    ExternalLinkWarning,
    PreferNoVideo,
    Scaling,
    ScalingPositionX,
    ScalingPositionY,
    ScalingSizeX,
    ScalingSizeY,
    ScalingBackgroundDim,
    UIScale,
    IntroSequence,
    NotifyOnUsernameMentioned,
    NotifyOnPrivateMessage,
    NotifyOnFriendPresenceChange,
    UIHoldActivationDelay,
    HitLighting,
    StarFountains,
    MenuBackgroundSource,
    GameplayDisableWinKey,
    SeasonalBackgroundMode,
    EditorWaveformOpacity,
    EditorShowHitMarkers,
    EditorAutoSeekOnPlacement,
    DiscordRichPresence,
    ShowOnlineExplicitContent,
    LastProcessedMetadataId,
    SafeAreaConsiderations,
    ComboColourNormalisationAmount,
    ProfileCoverExpanded,
    EditorLimitedDistanceSnap,
    ReplaySettingsOverlay,
    ReplayPlaybackControlsExpanded,
    AutomaticallyDownloadMissingBeatmaps,
    EditorShowSpeedChanges,
    TouchDisableGameplayTaps,
    ModSelectTextSearchStartsActive,
    UserOnlineStatus,
    MultiplayerRoomFilter,
    HideCountryFlags,
    EditorTimelineShowTimingChanges,
    EditorTimelineShowTicks,
    AlwaysShowHoldForMenuButton,
    EditorContractSidebars,
    EditorScaleOrigin,
    EditorRotationOrigin,
    EditorTimelineShowBreaks,
    EditorAdjustExistingObjectsOnTimingChanges,
    AlwaysRequireHoldingForPause,
    MultiplayerShowInProgressFilter,
    BeatmapListingFeaturedArtistFilter,
    ShowMobileDisclaimer,
    EditorShowStoryboard,
    EditorSubmissionNotifyOnDiscussionReplies,
    EditorSubmissionLoadInBrowserAfterSubmission,
    WasSupporter
}

export enum FrameworkSetting {
    ShowLogOverlay,

    AudioDevice,
    VolumeUniversal,
    VolumeEffect,
    VolumeMusic,

    HardwareVideoDecoder,

    WindowedSize,
    WindowedPositionX,
    WindowedPositionY,
    LastDisplayDevice,

    SizeFullscreen,

    MinimiseOnFocusLossInFullscreen,

    Renderer,
    WindowMode,
    ConfineMouseMode,
    FrameSync,
    ExecutionMode,

    ShowUnicode,
    Locale,

    IgnoredInputHandlers,

    CursorSensitivity,

    MapAbsoluteInputToWindow
}

export enum LazerBeatmapTabType {
    details,
    local,
    country,
    global,
    friends,
    team
}

export enum LazerSortMode {
    artist,
    author,
    bpm,
    datesubmitted,
    dateadded,
    dateranked,
    lastplayed,
    difficulty,
    length,
    source,
    title
}

export enum LazerManiaSetting {
    scrollSpeed,
    scrollDirection,
    timingBasedNoteColouring,
    mobileLayout
}

export enum LazerOsuSetting {
    snakingInSliders,
    snakingOutSliders,
    showCursorTrail,
    showCursorRipples,
    playfieldBorderStyle,

    // Replay
    replayClickMarkersEnabled,
    replayFrameMarkersEnabled,
    replayCursorPathEnabled,
    replayCursorHideEnabled,
    replayAnalysisDisplayLength
}

export enum LazerTaikoSetting {
    touchControlScheme
}

export enum ManiaScrollingDirection {
    up = 0,
    down = 1
}
