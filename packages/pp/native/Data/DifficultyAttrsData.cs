
using System;
using Microsoft.JavaScript.NodeApi;
using osu.Game.Rulesets.Difficulty;
using osu.Game.Rulesets.Osu.Difficulty;
using osu.Game.Rulesets.Taiko.Difficulty;

namespace tosu.pp.Data;

[JSExport]
public readonly struct DifficultyAttrsData
{
    #region Common values
    public required double Stars { get; init; }

    public required int MaxCombo { get; init; }
    #endregion

    #region osu!
    public double Aim { get; init; }
    public double Speed { get; init; }
    public double Flashlight { get; init; }
    public double SliderFactor { get; init; }
    public double SpeedNoteCount { get; init; }
    public double AimDifficultSliderCount { get; init; }
    public double AimTopWeightedSliderFactor { get; init; }
    public double AimDifficultStrainCount { get; init; }
    public double SpeedDifficultStrainCount { get; init; }
    public double Hp { get; init; }
    public int NCircles { get; init; }
    public int NSliders { get; init; }
    public int NLargeTicks { get; init; }
    public int NSpinner { get; init; }
    #endregion

    #region osu!taiko
    public double Stamina { get; init; }
    public double Rhythm { get; init; }
    public double Color { get; init; }
    public double Reading { get; init; }
    #endregion

    #region osu!catch
    #endregion
    #region osu!mania
    #endregion

    private static DifficultyAttrsData FromMod(OsuDifficultyAttributes attrs) => new()
    {
        Stars = attrs.StarRating,
        MaxCombo = attrs.MaxCombo,
        Aim = attrs.AimDifficulty,
        Speed = attrs.SpeedDifficulty,
        Flashlight = attrs.FlashlightDifficulty,
        SliderFactor = attrs.SliderFactor,
        SpeedNoteCount = attrs.SpeedNoteCount,
        AimDifficultSliderCount = attrs.AimDifficultSliderCount,
        AimTopWeightedSliderFactor = attrs.AimTopWeightedSliderFactor,
        AimDifficultStrainCount = attrs.AimDifficultStrainCount,
        SpeedDifficultStrainCount = attrs.SpeedDifficultStrainCount,

        Hp = attrs.DrainRate,

        NCircles = attrs.HitCircleCount,
        NSliders = attrs.SliderCount,
        // TODO::
        NLargeTicks = 0,
        NSpinner = attrs.SpinnerCount,
    };

    private static DifficultyAttrsData FromMod(TaikoDifficultyAttributes attrs) => new()
    {
        Stars = attrs.StarRating,
        MaxCombo = attrs.MaxCombo,
        Stamina = attrs.StaminaDifficulty,
        Rhythm = attrs.RhythmDifficulty,
        Color = attrs.ColourDifficulty,
        Reading = attrs.ReadingDifficulty,
    };

    internal static DifficultyAttrsData FromAttrs(DifficultyAttributes attrs) => attrs switch
    {
        OsuDifficultyAttributes mod => FromMod(mod),
        TaikoDifficultyAttributes mod => FromMod(mod),

        _ => new()
        {
            Stars = attrs.StarRating,
            MaxCombo = attrs.MaxCombo,
        }
    };
}