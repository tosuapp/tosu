# Torii support in this tosu fork

This fork of [tosu](https://github.com/tosuapp/tosu) adds support for
**torii** / **torii nova** — the community osu!lazer fork
([ShikkesoraSIM/torii-osu](https://github.com/ShikkesoraSIM/torii-osu)) —
alongside the official stable and lazer clients, which keep working exactly as
before.

## Why upstream tosu doesn't work with torii

| What tosu expects | What torii actually is |
| --- | --- |
| Process named `osu!.exe` / `osulazer.exe` | `torii.exe` (product name "Torii Nova") |
| `osu!.deps.json` with library key `osu!/<ver>-lazer` | `torii.deps.json` with key `torii/<ver>-torii` or `torii/<ver>-nova` |
| Offsets for official versions hosted on tosu.app | Torii has its own version numbers; tosu.app has nothing for them |
| `OsuGame`/`OsuGameBase` field layout of official builds | Torii **adds its own instance fields** to both classes (toolbar, briefing, points/gift watchers, `toriiInputAudioHz`, …), which shifts every absolute field offset |
| `GameBaseVtable` — a per-official-build constant used to validate the discovered `OsuGameBase` | A recompiled fork never matches any published constant |
| Memory pattern `01 01 00 00 00 00 80 44 00 00 40 44` (two `true` bools directly followed by the `Vector2(1024,768)` ScalingContainer field) | Torii inserts a `double?` field (`toolbarAutoHideTime`) that the runtime packs **between** those bools and the Vector2, so the 12-byte pattern can no longer match |
| .NET 8 runtime internals | Torii **nova** runs .NET 10 (torii stable stays on .NET 8) |

Renamed DLLs are *not* a problem by themselves: current tosu scans the whole
process address space instead of resolving modules by name. The real blockers
are the process name, the deps.json name, the pattern above, the vtable
constant, and the per-build field offsets.

## What was changed

### `packages/tosu/src/instances/manager.ts`
- `torii.exe` added to the process search list.
- Linux: `/proc/<pid>/comm` is `torii` (never `torii.exe`), so torii pids are
  collected separately and always routed to the lazer code path.

### `packages/tosu/src/instances/lazerInstance.ts`
- New `flavor: 'osu' | 'torii'` on the instance, detected in `getOsuVersion()`.
- `getOsuVersion()` now also reads `torii.deps.json` (library prefix `torii/`)
  and **keeps the `-torii` / `-nova` suffix** in the version string — the two
  streams are built against different runtimes and need separate offsets.
- Offsets resolution split into `resolveOsuOffsets()` (unchanged upstream
  behavior) and `resolveToriiOffsets()`:
  1. `TOSU_TORII_OFFSETS` env var — a `.json` file, or a folder containing
     `<version>.json`
  2. `<tosu cache>/torii/<version>.json`
  3. `<tosu program folder>/torii-offsets/<version>.json`
  4. last-resort gamble: official tosu.app offsets for the numeric base
     version (e.g. `2026.901.3` for `2026.901.3-nova`). This will almost
     certainly fail validation on real torii builds — that's fine, it fails
     loudly instead of returning garbage.
- Also fixed upstream's dead fetch timeout (`setTimeout(() => controller.abort)`
  never invoked `abort()`).

### `packages/tosu/src/memory/lazer.ts`
- **Loose anchor pattern**: bare `00 00 80 44 00 00 40 44` (the
  `Vector2(1024,768)` floats) is scanned in addition to the strict
  bool-prefixed pattern, and `checkIsBasesValid()` accepts either. Required for
  torii, harmless for official clients (candidates are validated anyway).
- **Wide delta sweep**: for torii, the anchor→`externalLinkOpener` distance is
  swept byte-by-byte over `0x10..0xC0` instead of the fixed 4-aligned list,
  because torii's extra fields shift the distance unpredictably.
- **`GameBaseVtable` replaced for torii**: official builds validate the
  discovered `OsuGameBase` against the published per-build vtable constant.
  For torii, the candidate is instead validated **structurally**:
  - `game → API → game` pointer roundtrip must return the same address
  - `VersionHash` must read as a sane printable string (it's an MD5 hex)
  - `Storage → WrappedStorage → BasePath` must read as a plausible path
    (torii's data dir is `%APPDATA%/osu-torii`, overridable via `storage.ini`,
    so it is deliberately not hard-matched)

  On success the vtable value is **learned** and cached for the process
  lifetime, keeping the per-poll validation as cheap as upstream's. It resets
  on every re-resolution, so GC moves or re-JIT can't wedge it.

### `packages/common/utils/config.ts`
- `ENABLE_AUTOUPDATE` now defaults to **false**. The upstream updater downloads
  official tosu releases and would silently replace this fork's binary,
  dropping torii support. Opt back in if you really want that.

### `tools/torii-offsets/` (new)
A .NET tool that generates the offsets file for any torii (or official lazer)
install. See its [README](tools/torii-offsets/README.md).

## Setup

```bash
# 1. build this fork (needs Node 24+, pnpm, VS Build Tools)
pnpm install
pnpm build:win        # -> packages/tosu/dist/tosu.exe

# 2. generate offsets for your torii install (needs .NET 10 SDK for nova)
cd tools/torii-offsets
dotnet run -f net10.0 -- --torii-path "C:\path\to\torii\install"
# -> writes out/<version>.json, e.g. out/2026.901.3-nova.json

# 3. put the offsets where tosu looks
mkdir <tosu folder>\torii-offsets
copy out\2026.901.3-nova.json <tosu folder>\torii-offsets\

# 4. run tosu, then torii
```

The version in the filename comes from `torii.deps.json` — exactly what tosu
detects at runtime — so names line up automatically. **Regenerate after every
torii update**; offsets are per-build.

Optional calibration of the generator (recommended once): run it against an
official osu!lazer install and diff against the published file:

```bash
dotnet run -f net8.0 -- --torii-path "C:\path\to\official\lazer" \
    --compare <tosu cache>\2026.804.2.json
```

It should report `Calibration OK — ... match exactly`.

## Test checklist

With `DEBUG_LOG=true` in `config.ini`, a healthy torii attach looks like:

```
Detected torii version: 2026.901.3-nova
Loaded torii offsets from ...\torii-offsets\2026.901.3-nova.json
Memory patterns resolved in XXms
Learned torii GameBase vtable value: ...
GameBase address updated: undefined => ...
```

Then verify in game (dashboard: `http://localhost:24050`):

1. **Menu** — state = menu, menu music/bass density moving
2. **Song select** — title/artist/difficulty/CS-AR-OD-HP, star rating & PP
   (this also proves the beatmap `.osu` file is found under torii's
   `osu-torii/files/<hash>` storage)
3. **Gameplay** — combo, accuracy, HP, score; hit errors on
   `/websocket/v2/precise`
4. **Result screen** — final stats, max combo
5. **Settings** — skin name, resolution, volumes
6. **Regression** — official osu!lazer (and stable, if you use it) still work

## Known risks / hardcoded internals to watch

`packages/tosu/src/memory/lazer.ts` also hardcodes framework/BCL object
internals that are **not** covered by offsets.json. These held stable from
.NET 8 → 10 in practice, and torii-framework didn't touch `Bindable`, but if a
specific feature returns garbage while navigation works, check these first
(the generator prints a measured **runtime internals probe** for exactly this):

| Constant | Meaning | Used for |
| --- | --- | --- |
| bindable `+0x40` / `+0x50` | `Bindable<T>` value / disabled flag | nearly every setting, HP, combo |
| dict `+0x10` entries, `+0x38` count, stride `0x18` | config store & mods dictionaries | settings, mod mapping |
| list `+0x8` items, `+0x10` size; array `+0x8`/`+0x10` | `List<T>` / `T[]` headers | mods, hit events, chat |
| `readKeyTrigger`: `+0x208`, `+0x1f4` | KeyTrigger internals | key overlay |
| `checkIfSpectator`: `+0x3f0` | SpectatorPlayer api field | spectating detection |
| hit-object base sizes `0xe8`/`0xe0` (osu), `0x58`/`0x88` (mania), `0x68`/`0x50` (taiko); HitEvent stride `0x40`, result `+0x18`, time `+0x10` | ruleset object layouts | hit errors |
| string length `+8`, data `+0xC` | CoreCLR `System.String` | all strings (native reader) |

Other notes:

- **In-game overlay** (`ENABLE_INGAME_OVERLAY`): off by default; the asdf-overlay
  injection is untested against torii's deferred/D3D12 renderer paths. Leave it
  off unless you want to experiment.
- **PP calculation** reads the beatmap file from disk via the in-memory
  BasePath — works with torii's `osu-torii` data dir automatically, including
  `storage.ini` overrides.
- Torii's mod list contains upstream mods only (AS/WD are flagged unranked
  server-side but still exist client-side), so the mod mapping logic applies
  unchanged.
- If torii ever renames its exe or deps.json again, update the name lists in
  `manager.ts` and `getOsuVersion()`.

## Merging upstream tosu later

When pulling new upstream tosu releases into this fork, expect conflicts in:

- `packages/tosu/src/instances/manager.ts` (process list)
- `packages/tosu/src/instances/lazerInstance.ts` (version + offsets flow)
- `packages/tosu/src/memory/lazer.ts` (anchor resolution + `checkIfGameBase`)

Keep an eye on upstream changes to `Offsets` (new classes/fields) — mirror them
into `tools/torii-offsets/manifest.json` (regenerate it from
`packages/tosu/src/assets/offsets.json` the same way it was generated: strip
`OsuVersion`/`GameBaseVtable`, keep class→field names).
