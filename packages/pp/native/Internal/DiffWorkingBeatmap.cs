using System.IO;
using osu.Framework.Audio.Track;
using osu.Framework.Graphics.Textures;
using osu.Game.Beatmaps;
using osu.Game.Skinning;

namespace tosu.pp.Internal;

internal sealed class DiffWorkingBeatmap : WorkingBeatmap
{
    private readonly IBeatmap beatmap;

    public DiffWorkingBeatmap(IBeatmap beatmap) : base(beatmap.BeatmapInfo, null)
    {
        this.beatmap = beatmap;
    }

    protected override IBeatmap GetBeatmap() => beatmap;

    public override Texture GetBackground() => throw new System.NotImplementedException();
    public override Stream GetStream(string storagePath) => throw new System.NotImplementedException();
    protected override Track GetBeatmapTrack() => throw new System.NotImplementedException();
    protected override ISkin GetSkin() => throw new System.NotImplementedException();
}