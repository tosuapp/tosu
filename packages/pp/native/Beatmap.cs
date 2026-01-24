using System.IO;
using System.Text;
using Microsoft.JavaScript.NodeApi;
using osu.Game.IO;
using Decoder = osu.Game.Beatmaps.Formats.Decoder;
using OsuBeatmap = osu.Game.Beatmaps.Beatmap;

namespace tosu.pp;

[JSExport]
public class Beatmap
{

    private readonly OsuBeatmap inner;

    public Beatmap(string content)
    {
        var bytes = Encoding.UTF8.GetBytes(content);
        using var reader = new LineBufferedReader(new MemoryStream(bytes));
        inner = Decoder.GetDecoder<OsuBeatmap>(reader).Decode(reader);
    }

    public void Convert(int gameMode)
    {
        Rulesets.FromGameMode(gameMode).CreateBeatmapConverter(inner).Convert();
    }


}