
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using Microsoft.JavaScript.NodeApi;
using osu.Game.Beatmaps;
using osu.Game.IO;
using osu.Game.Rulesets;
using tosu.pp.Data;
using tosu.pp.Internal;
using Decoder = osu.Game.Beatmaps.Formats.Decoder;
using OsuBeatmap = osu.Game.Beatmaps.Beatmap;

namespace tosu.pp;

[JSExport]
public class Beatmap
{
    private readonly IBeatmap inner;
    private readonly Ruleset ruleset;

    private Beatmap(IBeatmap inner, Ruleset ruleset)
    {
        this.inner = inner;
        this.ruleset = ruleset;
    }

    /// <summary>
    /// Perform beatmap conversion to another gamemode
    /// </summary>
    public Beatmap? Convert(int gameMode)
    {
        var ruleset = Rulesets.FromLegacyGameMode(gameMode);
        if (ruleset is null)
        {
            return null;
        }

        var converted = ruleset.CreateBeatmapConverter(inner).Convert();
        if (converted is null)
        {
            return null;
        }
        return new(converted, ruleset);
    }

    /// <summary>
    /// Calculate timed difficulty over each hit objects
    /// </summary>
    public TimedDifficultyAttrsData[] CalculateTimedDifficulty(IEnumerable<string> mods)
    {
        var diff = ruleset.CreateDifficultyCalculator(new DiffWorkingBeatmap(inner)).CalculateTimed(
            mods.Select(ruleset.CreateModFromAcronym).Where(mod => mod is not null)
        ) ?? [];

        return diff.Select(TimedDifficultyAttrsData.FromAttrs).ToArray();
    }

    /// <summary>
    /// Calculate overall difficulty
    /// </summary>
    public DifficultyAttrs CalculateDifficulty(IEnumerable<string> mods)
    {
        var diff = ruleset.CreateDifficultyCalculator(new DiffWorkingBeatmap(inner)).Calculate(
            mods.Select(ruleset.CreateModFromAcronym).Where(mod => mod is not null)
        );

        return new(diff);
    }

    /// <summary>
    /// Calculate performance
    /// </summary>
    public PerformanceAttrsData CalculatePerformance(
        DifficultyAttrs attrs,
        ScoreInfoData score
    )
    {
        var calc = ruleset.CreatePerformanceCalculator();
        if (calc is null)
        {
            return default;
        }

        return PerformanceAttrsData.FromAttrs(
            calc.Calculate(
                score.ToPerformanceScoreInfo(inner.BeatmapInfo, ruleset),
                attrs.Inner
            )
        );
    }

    /// <summary>
    /// Parse string osu file into Beatmap
    /// </summary>
    /// <exception cref="InvalidOperationException"></exception>
    public static Beatmap Parse(string content)
    {
        var bytes = Encoding.UTF8.GetBytes(content);
        using var reader = new LineBufferedReader(new MemoryStream(bytes));
        var beatmap = Decoder.GetDecoder<OsuBeatmap>(reader).Decode(reader);
        var rulesetId = beatmap.BeatmapInfo.Ruleset.OnlineID;
        var ruleset = Rulesets.FromLegacyGameMode(rulesetId);
        if (ruleset is null)
        {
            throw new InvalidOperationException("Invalid ruleset: " + rulesetId);
        }

        return new(beatmap, ruleset);
    }
}