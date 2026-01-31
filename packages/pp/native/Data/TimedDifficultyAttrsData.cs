
using System;
using Microsoft.JavaScript.NodeApi;
using osu.Game.Rulesets.Difficulty;

namespace tosu.pp.Data;

[JSExport]
public readonly struct TimedDifficultyAttrsData
{
    public required double Time { get; init; }
    public required DifficultyAttrs Difficulty { get; init; }

    internal static TimedDifficultyAttrsData FromAttrs(TimedDifficultyAttributes attrs) => new()
    {
        Time = attrs.Time,
        Difficulty = new(attrs.Attributes),
    };
}