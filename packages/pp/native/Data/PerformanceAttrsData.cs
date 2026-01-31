
using Microsoft.JavaScript.NodeApi;
using osu.Game.Rulesets.Catch.Difficulty;
using osu.Game.Rulesets.Difficulty;
using osu.Game.Rulesets.Mania.Difficulty;
using osu.Game.Rulesets.Osu.Difficulty;
using osu.Game.Rulesets.Taiko.Difficulty;

namespace tosu.pp.Data;

[JSExport]
public readonly struct PerformanceAttrsData
{
    #region Common values
    public required double Pp { get; init; }
    #endregion

    #region osu!
    public double Aim { get; init; }
    public double Flashlight { get; init; }
    public double Speed { get; init; }
    public double Accuracy { get; init; }
    public double EffectiveMissCount { get; init; }
    #endregion


    #region osu!taiko
    public double EstimatedUnstableRate { get; init; }
    public double SpeedDeviation { get; init; }
    #endregion

    // For osu!taiko and osu!mania
    public double PpDifficulty { get; init; }

    private static PerformanceAttrsData FromMod(OsuPerformanceAttributes attrs) => new()
    {
        Pp = attrs.Total,
        Aim = attrs.Aim,
        Flashlight = attrs.Flashlight,
        Speed = attrs.Speed,
        Accuracy = attrs.Accuracy,
        EffectiveMissCount = attrs.EffectiveMissCount,
    };

    private static PerformanceAttrsData FromMod(TaikoPerformanceAttributes attrs) => new()
    {
        Pp = attrs.Total,
        EffectiveMissCount = attrs.EstimatedUnstableRate ?? -1,
        PpDifficulty = attrs.Difficulty
    };

    private static PerformanceAttrsData FromMod(CatchPerformanceAttributes attrs) => new()
    {
        Pp = attrs.Total,
    };

    private static PerformanceAttrsData FromMod(ManiaPerformanceAttributes attrs) => new()
    {
        Pp = attrs.Total,
        PpDifficulty = attrs.Difficulty
    };

    internal static PerformanceAttrsData FromAttrs(PerformanceAttributes attrs) => attrs switch
    {
        OsuPerformanceAttributes mod => FromMod(mod),
        TaikoPerformanceAttributes mod => FromMod(mod),
        CatchPerformanceAttributes mod => FromMod(mod),
        ManiaPerformanceAttributes mod => FromMod(mod),
        _ => default
    };
}