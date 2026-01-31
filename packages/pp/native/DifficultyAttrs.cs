
using Microsoft.JavaScript.NodeApi;
using osu.Game.Rulesets.Difficulty;
using tosu.pp.Data;

namespace tosu.pp;

[JSExport]
[method: JSExport(false)]
public class DifficultyAttrs(DifficultyAttributes inner)
{
    [JSExport(false)]
    public DifficultyAttributes Inner { get; init; } = inner;

    public DifficultyAttrsData GetData() => DifficultyAttrsData.FromAttrs(Inner);
}