using System;
using osu.Game.Rulesets;
using osu.Game.Rulesets.Catch;
using osu.Game.Rulesets.Mania;
using osu.Game.Rulesets.Osu;
using osu.Game.Rulesets.Taiko;

namespace tosu.pp.Internal;

internal static class Rulesets
{
    public static readonly Ruleset osuRuleset = new OsuRuleset();
    public static readonly Ruleset taikoRuleset = new TaikoRuleset();
    public static readonly Ruleset catchRuleset = new CatchRuleset();
    public static readonly Ruleset maniaRuleset = new ManiaRuleset();

    public static Ruleset? FromLegacyGameMode(int gameMode)
    {
        return gameMode switch
        {
            0 => osuRuleset,
            1 => taikoRuleset,
            2 => catchRuleset,
            3 => maniaRuleset,
            _ => throw new ArgumentException($"Invalid ruleset for game mode: {gameMode}", nameof(gameMode)),
        };
    }
}