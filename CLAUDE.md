# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**tosu** is a memory reader for osu! (stable **and** lazer). It scans the running osu! process memory, derives game state (beatmap, gameplay, scores, settings, leaderboards, tournament data), calculates pp (`rosu-pp-js` / `@tosuapp/lazer-calculator`), and exposes it over an HTTP + WebSocket API consumed by overlays ("pp counters"). Drop-in compatible with gosumemory and streamCompanion.

## Codebase structure

pnpm workspace monorepo (`pnpm@10.10.0`, Node `>=24.14.0 <25`). Cross-package imports use `workspace:*` and the `@tosu/*` scope.

```
osumemory-js/
└── packages/
    ├── tosu/                    # main app / orchestrator (the published binary)
    ├── tsprocess/               # native C++ N-API addon: process/memory access + pattern scan
    ├── server/    (@tosu/server)# HTTP + WebSocket layer + bundled dashboard/overlay web assets
    ├── common/    (@tosu/common)# shared config, logging, enums, utils
    ├── updater/   (@tosu/updater)# self-update on startup
    ├── ingame-overlay/          # optional Electron in-game overlay
    └── ingame-overlay-updater/  # launcher for the overlay
```

Inside `packages/tosu`, source is organized by role, roughly: an **entry/startup** module, an **instances** layer (process discovery + per-client lifecycle & data loops), a **memory** layer (reader abstraction + one implementation per client), a **states** layer (per-domain state objects), an **api** layer (serializers to each wire format), and shared utils.

Only `tsprocess` has a real build step at install time (`tsc` + `node-gyp`); everything else is TS run/bundled on demand. Building `tsprocess` needs a Rust toolchain + `node-gyp` prerequisites. Note: `@tosu/common` keeps its source at the package root, not under `src/`.

Path alias inside `packages/tosu`: `@/*` → that package's `src/`. ESM throughout (`"type": "module"`).

## Build Commands

Run from repo root:

```bash
pnpm install          # install all workspace deps; builds tsprocess native addon (prepare)
pnpm run start        # dev run: compile then launch tosu
pnpm build:win        # single self-contained binary for Windows (@yao-pkg/pkg)
pnpm build:linux      # single self-contained binary for Linux
pnpm build:overlay    # build the Electron in-game overlay
pnpm run lint:ci      # eslint over .ts/.d.ts        (lint:fix to autofix)
pnpm run prettier:ci  # prettier check              (prettier:fix to autofix)
pnpm run release      # standard-version bump + changelog
```

Inside `packages/tosu`: `ts:compile` (bundle only, fast) and `ts:run <file>` (execute a file with `tsx`, `NODE_ENV=development`).

**There is no automated test suite** — no `test` script, no test runner. CI only builds binaries and lints. A green PR does **not** mean behavior was verified — see Task Decomposition and Verification below.

## Fast Local Development

(see `DEVELOPMENT.md`)

Prereqs: TypeScript ≥6.0.3, Node ≥24.14.0, Rust (any), pnpm ≥10.10.0.

```bash
pnpm install       # once
pnpm run start     # compile + run tosu against a live osu! client
```

`pnpm run start` recompiles from scratch each time. For a tighter loop when hacking on one file, use the package's `ts:run` script to execute it directly with `tsx`, no full bundle. You still need a **running osu!/osulazer process** to observe real behavior — tosu polls for the process and only produces meaningful output once it attaches and resolves memory patterns. Watch the console: a "patterns resolved" line means it attached; repeated "scanning failed" means the offsets are stale/wrong for that build.

Dev config comes from a `tosu.env` file in the working dir (see Configuration). Enable debug logging to get verbose base-address / error diagnostics.

## Architecture (packages/tosu)

**Process discovery.** A watcher polls for osu! processes on an interval and, for each new one, decides stable vs lazer (64-bit ⇒ lazer, except Linux), inspects the command line (skipping tournament/debug lazer clients, detecting tourney spectators and dev-server args), and creates a client instance. On Windows a separate loop tracks which client has focus.

**Instance lifecycle.** Each client instance owns a set of **per-domain state objects** (settings, global, beatmap/pp, menu, gameplay, result screen, tournament, user, …) reached through a small service-locator API. On start it resolves memory patterns (retrying until valid), then runs two loops:
- a **regular loop** — the main state machine, keyed on the current game status, throttled by the `pollRate` config. It decides which state objects to update per screen (menu, song select, play, result, editor, tourney, multiplayer).
- a **precise loop** — high-frequency (the `preciseDataPollRate` config), for hit errors and key overlay during play.

Stable and lazer each subclass the instance to supply their concrete memory reader and loop bodies.

**Memory abstraction.** An abstract memory reader declares one method per data domain (gameplay, menu, result screen, leaderboard, tourney, settings, …) returning typed shapes. Two implementations back it — one for x86 stable, one for x64 lazer — each holding scanned base addresses and walking pointers from them. At startup the pattern signatures are batch-scanned; if any base resolves to 0 the scan is treated as failed and retried.

**Reading memory.** A typed wrapper over the native addon exposes width-specific reads (int/long/float/double/byte/pointer), C#-string and C#-dictionary helpers, raw buffer reads, and pattern scans (signatures are space-separated hex bytes with `??` wildcards). Bitness is fixed per instance (x86 stable / x64 lazer) — reading with the wrong width silently corrupts values.

**API output.** The same in-memory state is serialized into several wire formats by the api layer: v1 / gosumemory-compatible, streamCompanion-compatible, and tosu's own v2 (plus a v2-precise variant). Each format has its own serializer; the instance exposes one accessor per format.

**Server.** CORS + an allow-list middleware, REST routers, and several WebSocket endpoints — each bound to one state serializer and a poll-rate config. Default bind is `127.0.0.1:24050`. The full endpoint list and the `/api/calculate/pp` contract are in `README.md`.

## Configuration

Runtime config is loaded from a `tosu.env` file (dotenv); the schema (env binding + default per option) lives in `@tosu/common`. Notable env bindings: `ENABLE_INGAME_OVERLAY`, `POLL_RATE` (default 150, min 100), `PRECISE_DATA_POLL_RATE` (default 10), `CALCULATE_PP`, `ENABLE_KEY_OVERLAY`, `SERVER_IP` / `SERVER_PORT`, `ENABLE_AUTOUPDATE`, `DEBUG_LOG`. Changing config emits an event that the server and instance manager react to (e.g. the HTTP server restarts on IP/port change; the overlay starts/stops). On Linux, `TOSU_OSU_PATH` overrides osu! path detection when the wine cwd is broken.

## Context-Efficient Workflows

- **Reading large files** (memory readers, serializers, big state objects): grep for the symbol/offset first, then read targeted ranges. Don't slurp a whole reader to change one offset, and don't re-read the same section without a code change in between.
- **Generated / vendored output** (build output, `node_modules`, the generated version file): search, don't read.
- **Build & run output:** capture once, then analyze (`pnpm run start 2>&1 | tee /tmp/tosu.log`); don't re-run a slow compile to view the same output from another angle.
- **Don't reach for the packaged build to check a type/logic error** — it's slow. Use the bundle-only compile or run a file directly with `tsx`.
- **Batch related edits, then compile once**, not compile-per-edit.

## Commit and PR Style

- This repo uses **Conventional Commits** — `standard-version` reads them to bump the version and generate the changelog. Prefix accordingly (`fix:`, `feat:`, `chore:`…), and don't hand-edit the changelog or version.
- Keep commit messages concise and descriptive; PR descriptions focus on **what changed and why**.
- Branch from `master`; changes land via PR (GitHub flow). Lint before pushing (`pnpm run prettier:fix && pnpm run lint:fix`) — a pre-commit hook runs lint-staged.
- Do NOT add "Generated with Claude Code" or co-author footers to commits or PRs
- Keep commit messages concise and descriptive
- PR descriptions should focus on what changed and why
- Do NOT mark PRs as "ready for review" (`gh pr ready`) - leave PRs in draft mode and let the user decide when to mark them ready

## Task Decomposition and Verification

- **Split work into smaller, individually verifiable tasks** — each step should produce a result you can check on its own.
- **Verify each task before the next.** With no test suite, verification usually means: type-check / lint, then **run tosu against a live osu! client and inspect the actual API output** (the relevant endpoint) or the console logs — confirm patterns resolve and the field you touched reads a sane value.
- **Choose the method that fits the change.** Pure serialization/logic change → bundle-compile and inspect the JSON output. Memory-offset change → run against the exact osu! build it targets and watch for scan failures. Server/API change → hit the endpoint. Config change → toggle it and confirm the reaction.
- **When unclear how to verify, ask the user** (which osu! version/build, stable vs lazer, tourney setup). Don't claim something "works" or "passes" without having observed it — see `superpowers:verification-before-completion`.
- Pre-validate before committing to avoid slow lint-staged failures: run the prettier + eslint fixers on your changed files first.

## Development Anti-Patterns

- **Don't trust "it compiles" as "it works."** An offset can be structurally valid yet point at the wrong field after an osu! update — memory offsets are the fragile core of this project. When touching a memory reader, verify against the specific osu! build (see the offset re-derivation notes in auto-memory).
- **Rule out a stale native binary first.** `tsprocess` is a compiled N-API addon; after switching branches, pulling, or changing Node version, a stale build causes cryptic crashes / wrong reads. Rebuild it (`pnpm --filter tsprocess run build`, or reinstall) before debugging memory logic.
- **Match the read width to the client's bitness** (x86 stable / x64 lazer). Using a 32-bit read where a pointer needs the 64-bit path silently corrupts values on lazer.
- **Don't assume a `node_modules` / unpacked file layout at runtime.** The shipped binary is bundled and packed into a single executable; path constants are rewritten and native/wasm assets are emitted by explicit bundler plugins. Code that walks `node_modules` or reads files relative to an unpacked layout works when run from source and breaks in the packaged binary.
- **Don't hand-edit generated files** — the version file, build output, and changelog are all generated.
- **Log through the shared logger, not `console.log`.** For noisy, retry-heavy paths use the instance's rate-limited error reporter so the log isn't flooded before it escalates to an error.
- **Linux path resolution is load-bearing** — the special cases for wine / osu-winello / `TOSU_OSU_PATH` exist for real setups; don't "simplify" them away.
