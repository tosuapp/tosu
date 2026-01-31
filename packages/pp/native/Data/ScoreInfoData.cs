using System.Collections.Generic;
using Microsoft.JavaScript.NodeApi;
using System.Linq;
using osu.Game.Rulesets;
using osu.Game.Rulesets.Scoring;
using osu.Game.Scoring;
using osu.Game.Beatmaps;

namespace tosu.pp.Data;

[JSExport]
public readonly struct ScoreInfoData
{
    public required int TotalScore { get; init; }

    public required double Accuracy { get; init; }
    public required IEnumerable<string> Mods { get; init; }

    public required int MaxCombo { get; init; }
    public required int LargeTickHits { get; init; }
    public required int SmallTickHits { get; init; }
    public required int SliderEndHits { get; init; }
    public required int NGeki { get; init; }
    public required int NKatu { get; init; }
    public required int N300 { get; init; }
    public required int N100 { get; init; }
    public required int N50 { get; init; }
    public required int Misses { get; init; }

    private Dictionary<HitResult, int> CreateStatistics() => new Dictionary<HitResult, int>
    {
        [HitResult.LargeTickHit] = LargeTickHits,
        [HitResult.SmallTickHit] = SmallTickHits,
        [HitResult.SliderTailHit] = SliderEndHits,
        [HitResult.Perfect] = NGeki,
        [HitResult.Great] = N300,
        [HitResult.Ok] = N100,
        [HitResult.Meh] = N50,
        [HitResult.Miss] = Misses,
    };

    internal ScoreInfo ToPerformanceScoreInfo(BeatmapInfo info, Ruleset ruleset) => new ScoreInfo(info)
    {
        TotalScore = TotalScore,
        LegacyTotalScore = TotalScore,
        Mods = Mods.Select(ruleset.CreateModFromAcronym).Where(mod => mod is not null).ToArray()!,
        MaxCombo = MaxCombo,
        Accuracy = Accuracy,
        Statistics = CreateStatistics(),
    };
}