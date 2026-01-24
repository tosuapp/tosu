using System;
using osu.Game.Rulesets;
using osu.Game.Rulesets.Catch;
using osu.Game.Rulesets.Mania;
using osu.Game.Rulesets.Osu;
using osu.Game.Rulesets.Taiko;

namespace tosu.pp;

internal static class Rulesets
{
    private static readonly Ruleset osuRuleset = new OsuRuleset();
    private static readonly Ruleset taikoRuleset = new TaikoRuleset();
    private static readonly Ruleset catchRuleset = new CatchRuleset();
    private static readonly Ruleset maniaRuleset = new ManiaRuleset();

    public static readonly RulesetInfo[] AvailableRulesets = [
        Info(osuRuleset),
        Info(taikoRuleset),
        Info(catchRuleset),
        Info(maniaRuleset),
    ];

    private static RulesetInfo Info(Ruleset r)
    {
        return new RulesetInfo(r.RulesetInfo.ShortName, r.RulesetInfo.Name, r.RulesetInfo.InstantiationInfo, r.RulesetInfo.OnlineID)
        {
            Available = true
        };
    }

    public static Ruleset FromGameMode(int gameMode)
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