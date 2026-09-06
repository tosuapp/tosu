# torii-offsets

Generates the `offsets.json` file that tosu's lazer reader needs, for clients that
tosu.app does not publish offsets for — i.e. torii and torii nova.

tosu reads lazer state by walking raw object pointers. Every field it reads has a
byte offset inside its class, and those offsets change whenever the client's
assemblies are rebuilt with different fields. Official osu!lazer offsets are hosted
at `https://tosu.app/offsets/<version>.json`. Torii is a separate fork with its own
version numbers (`2026.901.3-nova`), its own fields added to `OsuGame` /
`OsuGameBase`, and — on the nova stream — a different runtime (.NET 10 instead of
.NET 8), so official offsets do not apply.

## How it works

There is no supported .NET API that reports the runtime field offset of a managed
class field. So this tool measures it instead:

1. Loads the client's assemblies from its install folder into an isolated
   `AssemblyLoadContext`.
2. For each class in `manifest.json`, allocates a raw zeroed instance with
   `RuntimeHelpers.GetUninitializedObject` (no constructor runs, nothing is
   initialised, no game code executes).
3. Writes a unique random marker into one field at a time and snapshots the
   object's memory after each write. The bytes that changed between two snapshots
   are exactly that field, so the lowest changed address minus the object base is
   the field's offset.
4. Writes the result in the same JSON shape tosu expects.

Offsets are read from the same runtime that will run the client, which is why the
tool targets both `net8.0` and `net10.0`: use `net10.0` for nova so the layout is
computed by the runtime the game actually uses.

## Usage

Requires the .NET 10 SDK (or .NET 8 SDK if you only need stable-stream offsets).

```bash
cd tools/torii-offsets

# nova stream
dotnet run -f net10.0 -- --torii-path "C:\Users\you\AppData\Local\torii"

# stable stream
dotnet run -f net8.0 -- --torii-path "C:\Users\you\AppData\Local\torii"
```

The version is read from `torii.deps.json` in that folder, matching what tosu
detects at runtime, so the output filename lines up automatically.

Options:

| Flag | Meaning |
| --- | --- |
| `--torii-path <dir>` | Client install folder (contains `torii.dll`, `osu.Game.dll`, `torii.deps.json`). Default `.` |
| `--out <dir>` | Output folder. Default `./out` |
| `--version <v>` | Override the detected version string |
| `--manifest <file>` | Use an external manifest instead of the embedded one |

Output goes to `<out>/<version>.json`. Copy it to one of the places tosu searches:

- `<cache>/torii/<version>.json` — the tosu cache folder (`.cache` next to the
  tosu binary on Windows, `$XDG_CACHE_HOME/tosu` on Linux)
- `<program folder>/torii-offsets/<version>.json`
- or point `TOSU_TORII_OFFSETS` at the file, or at a folder containing it

Regenerate after every client update — offsets are per-build.

## manifest.json

The list of classes and fields tosu reads, extracted from tosu's own
`packages/tosu/src/assets/offsets.json`. If you add a field to the reader, add it
here too.

## Notes

- Some fields may be reported missing. That is expected when torii renamed or
  removed something upstream (for example the `SoloSongSelect` variants — the
  reader already tolerates those through fallback chains).
- Offsets depend only on class layout, not on the process, so this runs without
  the game open.
- The tool never touches game saves, the network, or a running process.
