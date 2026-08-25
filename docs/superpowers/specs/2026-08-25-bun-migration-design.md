# tosu on Bun — Design Spec

Date: 2026-08-25
Status: agreed (grilling session, 3 rounds)

## Goal

Move the tosu monorepo from the Node.js toolchain (Node 24 + pnpm + tsx + `@yao-pkg/pkg`) to Bun 1.4 as the only JavaScript runtime, package manager, test runner and executable compiler. Rewrite the runtime-facing code idiomatically for Bun (`Bun.serve` with native WebSockets, `Bun.file`, `Bun.build --compile`). Keep every externally observable contract (HTTP routes, WebSocket endpoints and message formats, config file, release asset names, self-update flow) unchanged.

## Non-goals

- Hiding the Windows console / removing `conhost.exe`. Decision Q11-C: the console stays. Any console window on Windows is hosted by `conhost.exe` (or `OpenConsole.exe` under Windows Terminal); the only way to avoid it is a GUI-subsystem binary (`compile.windows.hideConsole: true`), which is explicitly **not** done. The build keeps `hideConsole: false` as a documented switch for the future.
- Rewriting `tsprocess` on `bun:ffi`. Decision Q12-C: it stays an N-API addon (Bun docs: "The most stable way to interact with native code from Bun is to write a Node-API module").
- Touching the Electron in-game overlay package internals (`packages/ingame-overlay`). Electron ships its own Node; only the way tosu spawns it changes.
- Keeping the codebase runnable on Node.js. The result is Bun-only.

## Decisions (grilling session)

| # | Topic | Decision |
|---|-------|----------|
| Q1 | Depth | **B** — idiomatic Bun immediately (`Bun.serve`, native WebSocket, `Bun.file`), not a runtime-only swap. |
| Q2 | Package manager | `bun install` (workspaces in root `package.json`, `bun.lock`, `trustedDependencies`). pnpm removed. |
| Q3/Q12 | Native addon | N-API `tsprocess` stays. Built **without node-gyp and without Node**: MSVC on Windows, g++ on Linux, headers from `node-api-headers` + `node-addon-api`, Windows import library generated from `node-api-headers/def/*.def`, `node.exe` delay-loaded with node-gyp's delay-load hook. |
| Q4/Q11 | Console | **C** — console stays. `hideConsole: false`. |
| Q5 | Packaging | Follows Q3: `.node` addons, wasm and dashboard assets are embedded into the single executable (Bun extracts addons to `%TEMP%` at start, same as pkg did). |
| Q6/Q14 | Bundler | **B** — rolldown stays and produces `packages/tosu/dist/index.js` + copied binaries/assets; then `bun build --compile` turns `dist/` into the executable. Bun-only import attributes (`with { type: "file" }`) are **not** used in sources; embedded files are addressed through `import.meta.dir` and `compile.assets`. |
| Q7/Q20 | Overlay IPC | Keep `stdio: [..., 'ipc']` with `serialization: 'json'`; prototype first. Fallback **A** if Bun↔Electron IPC fails on Windows: overlay control messages over the existing `/websocket/commands` endpoint. |
| Q8 | Acceptance | **B** — manual checklist + `bun test` smoke tests on pure logic and the server. |
| Q9 | Delivery | One migration branch (`feat/bun`), one PR, Conventional Commits, no co-author footers. |
| Q10 | Runtime | Bun-only; `bun start` / `bun run …` everywhere. |
| Q13 | Scanner threads | C++ `std::thread` + `ThreadSafeFunction` in `tsprocess` stay as they are. Synchronous scanning is the fallback only if TSFN misbehaves under Bun. |
| Q15 | HTTP routing | **A** — string routes matched exactly, regex routes matched in registration order inside `fetch`, middleware (`isRequestAllowed`, CORS) wrapped around every response. |
| Q16 | WebSocket fan-out | **A** — hybrid: clients without filters subscribe to a per-endpoint topic and receive one `server.publish`; clients with `applyFilters` get an individual `ws.send`. |
| Q17 | Native toolchain | **A** — `packages/tsprocess/build.ts` drives `cl`/`lib`/`link` (via `vcvarsall.bat x64`, found with `vswhere`) on Windows and `g++` on Linux. |
| Q18 | When native builds | **A** — root `prepare` runs it on `bun install`; `bun run build:native` re-runs it manually. |
| Q19 | Dev loop | **A** — `watch.ts`: rolldown watch → spawn `bun dist/index.js`. One code path for dev and prod. |
| Q21 | Plan location | `docs/superpowers/plans/2026-08-25-bun-migration.md` (this spec: `docs/superpowers/specs/`). |

## Facts the design relies on

Repository (as of `d08eeef2`, v4.26.0):

- Build today: rolldown → `dist/index.js` (esm, minified) + `tsprocess-<hash>.node`, `binding-<hash>.node` (lazer calculator, 31 MB), `rosu_pp_js_bg.wasm`, `dist/assets/` → `pkg --targets node24-{win,linux}-x64 --compress brotli` → `postBuild.mts` (resedit: icon + VersionInfo). `tosu.exe` is 110 MB.
- Native: `tsprocess` is node-addon-api C++ (`Napi::ThreadSafeFunction`, `std::thread`, `Napi::Buffer`), 25 exported functions, links `Psapi.lib` + `ntdll.lib` via `#pragma comment`. The compiled `tsprocess.node` delay-loads `node.exe` (node-gyp default). `@tosuapp/lazer-calculator-win32-x64/binding.node` resolves `napi_*` dynamically (no `node.exe` import).
- Server: custom router on `node:http` (`packages/server/utils/http.ts`), `ws` with `noServer` + `handleUpgrade` on the `upgrade` event, five endpoints: `/ws`, `/tokens`, `/websocket/v2`, `/websocket/v2/precise`, `/websocket/commands`. 16 HTTP routes (10 string, 5 regex with named groups, one `/.*/` catch-all). Per-client `filters` on WebSocket clients. Internal re-dispatch of commands via `WebSocketServer.emit('message', id, command, overlayName, payload)`.
- `'pkg' in process` is used once (`packages/common/utils/directories.ts:getProgramPath`).
- Dashboard assets: `packages/server/assets`, 25 files, 1.1 MB, read through `path.join(import.meta.dirname, 'assets')` in four files.
- Overlay: spawned from `packages/ingame-overlay-updater` with `stdio: ['ignore', 'overlapped', 'overlapped', 'ipc']`, `NODE_CHANNEL_FD=3`; messages `{ cmd: 'add' | 'keybind' | 'maxFps', ... }` via `child.send`.
- Updater: downloads `tosu-<platform>-*.zip` from GitHub releases, renames the running exe to `tosu_old.exe`, unzips, spawns the new exe with `shell: true, detached: true`, exits.
- No tests exist. CI: `windows-latest` + `ubuntu-latest`, Node 24.14.0, pnpm 10.10.0, SignPath signing of the Windows artifact.
- Bun 1.4.0 is installed locally (`process.versions.node` reports 26.3.0). MSVC (VS 2022 + Build Tools 18) is installed; zig/clang are not.

Bun 1.4 documentation (bun.com/docs, fetched 2026-08-25):

- `bun build --compile`: embeds `.node` addons (`require('./addon.node')`), extracts them to a temp file at runtime; `--asset <dir|file>` (JS: `compile.assets`) embeds a file or directory tree "under its original relative path", reachable via `node:fs` and `Bun.file()` from `import.meta.dir`; `.wasm`/`.node` files may also be added as extra entry points; `Bun.isStandaloneExecutable` detects compiled mode; `--bytecode` works with esm and cjs; `compile.windows` supports `icon`, `hideConsole`, `title`, `publisher`, `version`, `description`, `copyright`; `.env`/`bunfig.toml` auto-loading is on by default and can be disabled with `autoloadDotenv: false` / `autoloadBunfig: false`; targets `bun-windows-x64`, `bun-linux-x64`.
- Node-API: "Bun implements this interface from scratch, so most existing Node-API extensions work with Bun out of the box"; `require()` of `.node` files and `process.dlopen` are supported.
- `bun:ffi`: "experimental, with known bugs and limitations. Do not rely on it in production."
- `Bun.spawn` / `node:child_process`: IPC with Node.js processes requires `serialization: "json"`; `windowsHide` and `windowsVerbatimArguments` options exist; "IPC can send net.Socket, net.Server and dgram.Socket handles (including to and from Node.js processes)".
- `node:http` 🟢 fully implemented; `node:fs` 🟢 (98% of Node's suite); `node:readline` 🟢; `node:net` 🟢; `node:tty` 🟢; `node:worker_threads` 🟡; `process.title` setter is a no-op on macOS & Linux (Windows honoured).
- `Bun.serve`: `routes` + `fetch` fallback; `server.upgrade(req, { data })`; `ServerWebSocket` with `subscribe`/`publish`/`cork`; `idleTimeout` (HTTP default 10 s, max 255, `0` disables; WebSocket default 120 s with `sendPings`); `server.stop(true)`; `server.requestIP(req)`.
- Lifecycle scripts: defining `trustedDependencies` **replaces** the default allow list; `esbuild` and `electron` must be listed explicitly.
- Workspaces: `"workspaces": ["packages/*"]` in root `package.json`; `workspace:*` protocol supported; `bun install --filter`.
- `--watch` hard-restarts the process; `--hot` soft-reloads (not used: native handles must be re-created on restart).

## Architecture

### Toolchain

```
bun install ──prepare──▶ packages/tsprocess/build.ts (cl|g++) ──▶ packages/tsprocess/dist/lib/tsprocess.node
                                                                   packages/server: sass → homepage.min.css

bun run build:win|linux
  ├─ genversion → packages/tosu/src/_version.js
  ├─ rolldown  → packages/tosu/dist/{index.js, *.node, rosu_pp_js_bg.wasm, assets/}
  └─ packages/tosu/build.ts → Bun.build({ compile: { assets: ['assets', '*.node', '*.wasm'] } })
                              → packages/tosu/dist/tosu.exe | tosu
```

- One runtime (Bun 1.4.0, pinned in `.bun-version`, `packageManager` and `engines.bun`). Node.js is not installed for build, test or CI. The Electron overlay build (`electron-vite` + `electron-builder`) runs under `bun run`.
- rolldown output is not minified (Bun minifies when compiling, so Bun's embedded source map points at readable code). `rolldown` treats `bun` and `bun:*` as externals.
- `packages/tosu/build.ts` runs with `cwd = packages/tosu/dist` so that `compile.assets` paths are relative to the bundle: at runtime `import.meta.dir/assets/…`, `import.meta.dir/rosu_pp_js_bg.wasm`, `import.meta.dir/tsprocess-<hash>.node`. rolldown's `createRequire(import.meta.url)('./tsprocess-<hash>.node')` then resolves inside the embedded graph and Bun's napi hook extracts the addon.
- Windows exe metadata comes from `compile.windows`; `resedit` and `postBuild.mts` are removed.

### Native addon build (`packages/tsprocess/build.ts`)

- Headers: `node-api-headers/include` (`node_api.h`, `js_native_api.h`) and `node-addon-api` (`napi.h`). Defines: `NAPI_DISABLE_CPP_EXCEPTIONS`, `NAPI_VERSION=8`, `BUILDING_NODE_EXTENSION`.
- Windows: `vswhere.exe` → `vcvarsall.bat x64`; `cl /std:c++20 /EHsc /O2 /MT`; `lib /def:node.def` where `node.def` is `NAME NODE.EXE` + the union of exports from `node_api.def` and `js_native_api.def`; `link /DLL /DELAYLOAD:node.exe delayimp.lib` with `lib/win_delay_load_hook.cc` (node-gyp's hook, MIT) so that the addon resolves `node.exe` to the running executable (`bun.exe`, `tosu.exe`).
- Linux: `g++ -std=c++20 -O2 -fPIC -shared -fno-exceptions -pthread`; `napi_*` symbols resolve against the host executable at load time.
- Output: `packages/tsprocess/dist/lib/tsprocess.node`. `src/index.ts` requires `../dist/lib/tsprocess.node` so both `dist/index.js` (tsc) and `src/` (bun test) resolve it.

### Server (`packages/server`)

- `HttpServer` wraps `Bun.serve`. `route(path: string | RegExp, method, handler)` keeps the existing registration API; handlers receive a `TosuRequest` (`{ raw, method, url, pathname, query, params, headers, body, remoteAddress, instanceManager }`) and return a `Response`. String routes are exact-match; regex routes are tried in registration order; missing route → 404 `Not Found`. Every response gets the CORS headers; `isRequestAllowed(headers)` rejects with 403 `Not Found` before routing (also for upgrades). Thrown errors map to 500 + `{ error }` JSON with `statusText = encodeURI(message)` (ENOENT keeps the `"<path> ENOENT: no such file or directory"` text).
- WebSocket: one `Bun.serve` `websocket` handler dispatches by `ws.data.endpoint` to a `Websocket` instance per endpoint (`v1`, `sc`, `v2`, `v2precise`, `commands`). `ws.data` carries `id`, `pathname` (path + query string, as `request.url` did), `query`, `filters`, and the four address strings. Unfiltered clients subscribe to topic `tosu:<endpoint>`; the poll loop publishes one JSON string per tick and sends filtered JSON individually. `Websocket.redispatch(fromId, command, overlayName, payload)` replaces the `socket.emit('message', …)` hack with identical semantics (re-runs `handleSocketCommands` for every other client, skipping `getSettings`/`updateSettings` for foreign overlays).
- Files: `directoryWalker`, `beatmapFileShortcut` and `/assets/*` return `Response(Bun.file(...))`, with explicit `Range` handling (`file.slice(start, end + 1)`, 206/416) for the same extensions as today. Dashboard HTML builders return `Promise<Response>`; `SERVER_ASSETS_PATH` resolves to `import.meta.dirname/assets` when it exists (bundle, executable) and to `packages/server/assets` otherwise (`bun test`).
- `idleTimeout` HTTP: 30 s; `/api/generateReport` disables it per request. WebSocket keeps Bun defaults (120 s + pings).

### Processes

- Overlay: `spawn(exe, [], { stdio: ['ignore', 'pipe', 'pipe', 'ipc'], serialization: 'json', windowsHide: true, env: { SHIM_MCCOMPAT, NODE_CHANNEL_FD: '3', ...process.env } })`. `child.send({ cmd, ... })` unchanged. Prototype gate: `{ cmd: 'add', pid }` must reach `OverlayManager.handleEvent` in the Electron process on Windows. Fallback: overlay main process connects to `ws://127.0.0.1:<port>/websocket/commands?l=__ingame_control__` and receives the same JSON objects.
- Updater: identical download/verify/rename/unzip flow; `autoUpdater(from)` returns a status instead of writing to `ServerResponse`; restart is scheduled after the HTTP response is returned; `process.execPath` is renamed instead of `process.argv[0]`.
- `downloadFile` uses `fetch` + `Bun.file(destination).writer()` with the same progress bar.
- Every `exec`/`spawn` passes `windowsHide: true` except the self-restart, which must open its own console.

## Constraints (verbatim values)

- Bun: `1.4.0` in `.bun-version`; `"packageManager": "bun@1.4.0"`; `"engines": { "bun": ">=1.4.0" }`.
- Compile targets: `bun-windows-x64`, `bun-linux-x64`. Outputs: `packages/tosu/dist/tosu.exe`, `packages/tosu/dist/tosu`.
- `compile.windows`: `title: 'tosu'`, `publisher: 'KotRik'`, `description: 'osu! memory reader, built in typescript'`, `copyright: '© KotRik. All rights reserved.'`, `icon: packages/tosu/src/assets/icon.ico`, `hideConsole: false`, `version: <package version>`.
- `trustedDependencies: ["electron", "esbuild"]`.
- WebSocket endpoints and paths unchanged: `/ws`, `/tokens`, `/websocket/v2`, `/websocket/v2/precise`, `/websocket/commands`. Message formats unchanged (`JSON.stringify(state)` per tick; command replies `{ command, message }`; `applyFilters:<json>`; `/tokens` bare `[...]` is treated as `applyFilters`).
- HTTP routes unchanged: `/json`, `/json/v2`, `/json/v2/precise`, `/json/sc`, `/backgroundImage`, `/favicon.ico`, `/api/settingsSave`, `/api/runUpdates`, `/api/generateReport`, `/api/calculate/pp`, `/api/counters/{search,download,open,delete,settings}/*`, `/Songs/*`, `/files/beatmap/{background,audio,file}`, `/files/beatmap/*`, `/files/skin/*`, `/assets/*`, `/api/ingame`, catch-all (`/`, `/settings`, `/local-overlays`, `/available`, overlay static files).
- Release asset names unchanged: `tosu-windows-*.zip`, `tosu-linux-*.zip`, `tosu-overlay-*.zip` (the updater matches `platform.type` + `.zip`).
- Config file `tosu.env` unchanged (dotenv format, watched with `fs.watch`).
- Code style: Prettier (4 spaces, single quotes, no trailing commas, semicolons, sorted imports); ESLint standard + prettier. Commits: Conventional Commits, no co-author footers.

## Acceptance checklist (manual, both clients)

1. `bun install` on a clean clone (Windows with VS Build Tools; Linux with g++) builds `tsprocess.node` and finishes without Node.js installed.
2. `bun run start` attaches to osu!(stable) and osu!(lazer); dashboard opens; `/json`, `/json/v2`, `/json/v2/precise`, `/json/sc` respond; `/websocket/v2` and `/websocket/v2/precise` stream; `/ws` and `/tokens` work with a gosumemory-era overlay and a StreamCompanion overlay; `applyFilters` narrows v2 output.
3. Dashboard: install a counter from "available", open its folder, edit settings (`/websocket/commands` round trip), delete it; keep the dashboard open for more than 3 minutes — no reconnect loop.
4. `/files/beatmap/background`, `/files/beatmap/audio` (with a `Range` request from `<audio>`), `/files/skin/<file>`, `/Songs/<path>`.
5. `bun run build:win` → `dist/tosu.exe` runs from a fresh folder: addons extracted, dashboard served, `/api/calculate/pp` works; file properties show icon and version; `bun run build:linux` → `dist/tosu` runs under Linux with lazer.
6. Self-update: a v4.26.0 (pkg) installation updates to the Bun build through `/api/runUpdates` (renames to `tosu_old.exe`, restarts) and the new build updates itself again on the next release.
7. In-game overlay: enabled from settings, injects into both clients, keybind and max FPS changes propagate, tray "Exit" works, `stopOverlay` on disable.
8. `bun test`, `bun run lint:ci`, `bun run prettier:ci` pass locally and in CI on both runners.

## Risks and gates

| Risk | Gate | Fallback |
|------|------|----------|
| `createRequire(...)('./tsprocess-<hash>.node')` does not resolve inside the compiled binary | Task 4 verification: `dist/tosu.exe` prints `Starting tosu` and answers `/api/calculate/pp` | Add the `.node` files as extra `entrypoints` with `naming.asset = '[name].[ext]'`; if that fails too, stop and report (shipping addons beside the executable is a product decision). |
| Bun↔Electron IPC over the `ipc` stdio slot fails on Windows | Task 12 prototype: overlay logs `initializing ingame overlay pid:` after tosu attaches | Q20-A: control messages over `/websocket/commands` (Task 12, conditional steps). |
| `Napi::ThreadSafeFunction` scan callback never fires under Bun | Task 1 test + Task 13 checklist item 2 (lazer attach uses `scanAll`) | Q13-C: make `scan` synchronous in `functions.cc` (call the callback on the calling thread). |
| `electron-builder` fails under `bun run` | Task 5 CI overlay job | Add `actions/setup-node` to the overlay step only. |
| Bun N-API call overhead differs from Node on the read-heavy loops | Task 13 checklist item 2 with `debugLog` timings (`measureTime` decorator) | Report numbers; no code change planned. |
