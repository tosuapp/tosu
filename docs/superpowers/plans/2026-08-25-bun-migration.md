# tosu on Bun Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Node.js/pnpm/pkg toolchain with Bun 1.4 end to end (install, dev, test, compile) and rewrite the HTTP/WebSocket server on `Bun.serve`, keeping every external contract of tosu unchanged.

**Architecture:** Bun is the only runtime. `tsprocess` stays an N-API addon but is compiled by a Bun script driving MSVC/g++ (no node-gyp, no Node). rolldown still bundles `packages/tosu/src` into `dist/`; `bun build --compile` turns `dist/` into `tosu.exe`/`tosu` with addons, wasm and dashboard assets embedded. `packages/server` moves from `node:http` + `ws` to `Bun.serve` with native WebSockets (per-endpoint topics + per-client filtered sends).

**Tech Stack:** Bun 1.4.0 (runtime, `bun install`, `bun test`, `Bun.build`/`--compile`, `Bun.serve`), rolldown 1.2, node-addon-api + node-api-headers, MSVC Build Tools (Windows) / g++ (Linux), Electron 43 (overlay, unchanged), GitHub Actions with `oven-sh/setup-bun`.

**Spec:** `docs/superpowers/specs/2026-08-25-bun-migration-design.md`

## Global Constraints

- Bun version pinned: `.bun-version` = `1.4.0`; root `package.json` has `"packageManager": "bun@1.4.0"` and `"engines": { "bun": ">=1.4.0" }`. No `engines.node`.
- No Node.js is required for install, build, test, CI or runtime. Only `packages/ingame-overlay` (Electron) keeps its own bundled Node.
- Compile targets exactly `bun-windows-x64` and `bun-linux-x64`; outputs `packages/tosu/dist/tosu.exe` and `packages/tosu/dist/tosu`.
- Windows executable metadata via `compile.windows`: `title: 'tosu'`, `publisher: 'KotRik'`, `description: 'osu! memory reader, built in typescript'`, `copyright: '© KotRik. All rights reserved.'`, `icon` = `packages/tosu/src/assets/icon.ico`, `hideConsole: false`, `version` = package version.
- Root `"trustedDependencies": ["electron", "esbuild"]` (this list replaces Bun's default allow list).
- WebSocket endpoints unchanged: `/ws`, `/tokens`, `/websocket/v2`, `/websocket/v2/precise`, `/websocket/commands`. Message formats unchanged.
- HTTP routes unchanged (see spec "Constraints"). Error contract unchanged: thrown handler errors → HTTP 500, JSON `{ "error": message }`, `statusText = encodeURI(message)` (ENOENT → `encodeURI("<pathname> ENOENT: no such file or directory")`); unknown route → 404 `Not Found`; disallowed origin → 403 `Not Found`.
- Release asset names unchanged: `tosu-windows-*.zip`, `tosu-linux-*.zip`, `tosu-overlay-*.zip`.
- Config file `tosu.env` (dotenv format) unchanged.
- The Windows console stays (`hideConsole: false`).
- Code style: Prettier (`printWidth 80`, 4 spaces, single quotes, `trailingComma: none`, semicolons, `@trivago/prettier-plugin-sort-imports`), ESLint standard + prettier. Run `bun run prettier:fix` before every commit.
- Commits: Conventional Commits (`feat:`, `fix:`, `build:`, `ci:`, `chore:`, `docs:`), **no** co-author footers (project rule in `CLAUDE.md`).
- All work on branch `feat/bun` created from `master`.

## File Structure

Created:

- `.bun-version` — Bun version pin.
- `bun.lock` — Bun lockfile (replaces `pnpm-lock.yaml`).
- `packages/tsprocess/build.ts` — native addon build script (MSVC / g++).
- `packages/tsprocess/lib/win_delay_load_hook.cc` — node-gyp's delay-load hook (resolves `node.exe` to the running executable).
- `packages/tsprocess/src/process.test.ts` — addon smoke test.
- `packages/tosu/build.ts` — `Bun.build({ compile })` driver over `dist/`.
- `packages/server/utils/paths.ts` — `SERVER_ASSETS_PATH` resolution (bundle vs sources).
- `packages/server/utils/filters.ts` — `Filter` type + `applyFilter` (pure, tested).
- `packages/server/utils/http.test.ts`, `packages/server/utils/filters.test.ts`, `packages/server/utils/socket.test.ts`, `packages/server/utils/directories.test.ts`, `packages/server/index.test.ts`, `packages/common/utils/downloader.test.ts`, `packages/common/utils/arguments.test.ts`.

Modified (responsibility after the change):

- `package.json` (root) — Bun workspaces, scripts, trusted deps. `pnpm-workspace.yaml`, `pnpm-lock.yaml` deleted.
- `tsconfig.base.json` — `types: ["bun"]`.
- `.husky/pre-commit` — `bunx lint-staged`.
- `DEVELOPMENT.md`, `CLAUDE.md` — Bun toolchain docs.
- `.github/workflows/deploy.yml`, `.github/workflows/pr_lint.yml` — Bun CI.
- `packages/tsprocess/package.json`, `packages/tsprocess/src/index.ts` — build scripts, addon path. `binding.gyp` deleted.
- `packages/tosu/package.json`, `packages/tosu/watch.ts`, `packages/tosu/rolldown.config.mjs`, `packages/tosu/src/index.ts` — Bun dev/compile scripts. `pkg.win.json`, `pkg.linux.json`, `src/postBuild.mts` deleted.
- `packages/common/utils/directories.ts` — `Bun.isStandaloneExecutable`.
- `packages/common/utils/downloader.ts` — `fetch` + `Bun.file().writer()`.
- `packages/server/index.ts` — `Server` wiring on `Bun.serve`.
- `packages/server/utils/index.ts` — `json`, `html`, `isRequestAllowed(headers)`.
- `packages/server/utils/http.ts` — `HttpServer` on `Bun.serve`, `TosuRequest`.
- `packages/server/utils/socket.ts` — `Websocket` on `ServerWebSocket`, topics.
- `packages/server/utils/commands.ts` — command handling over `TosuSocket`.
- `packages/server/utils/directories.ts` — `directoryWalker` → `Response`.
- `packages/server/utils/counters.ts` — HTML builders → `Response`.
- `packages/server/router/*.ts`, `packages/server/scripts/beatmapFile.ts` — handlers return `Response`.
- `packages/server/package.json` — drop `ws`, `@types/ws`.
- `packages/updater/index.ts` — `autoUpdater(from)` returns a status; restart scheduled after response.
- `packages/ingame-overlay-updater/src/index.ts` — `serialization: 'json'`, `windowsHide`.
- `packages/ingame-overlay/package.json` — `bun run build` in `dist` script.

---

### Task 1: Build `tsprocess` without node-gyp

**Files:**
- Create: `packages/tsprocess/build.ts`
- Create: `packages/tsprocess/lib/win_delay_load_hook.cc`
- Create: `packages/tsprocess/src/process.test.ts`
- Modify: `packages/tsprocess/package.json`
- Modify: `packages/tsprocess/src/index.ts`
- Delete: `packages/tsprocess/binding.gyp`

**Interfaces:**
- Consumes: `packages/tsprocess/lib/functions.cc`, `lib/memory/memory_windows.cc`, `lib/memory/memory_linux.cc` (unchanged C++ sources); npm packages `node-addon-api` (header `napi.h`) and `node-api-headers` (`include/node_api.h`, `def/node_api.def`, `def/js_native_api.def`).
- Produces: `packages/tsprocess/dist/lib/tsprocess.node`; script `bun run build` (tsc + native) and `bun run build:native` in `packages/tsprocess`; `Process` class API unchanged (`packages/tsprocess/src/process.ts`).

- [ ] **Step 1: Create the branch**

```bash
git checkout -b feat/bun master
```

- [ ] **Step 2: Add the delay-load hook**

Create `packages/tsprocess/lib/win_delay_load_hook.cc` (copied from node-gyp's `src/win_delay_load_hook.cc`, MIT):

```cpp
/*
 * When this file is linked to a DLL, it sets up a delay-load hook that
 * intervenes when the DLL is trying to load the host executable
 * dynamically. Instead of trying to locate the .exe file it'll just
 * return a handle to the process image.
 *
 * This allows compiled addons to work when the host executable is renamed
 * (bun.exe, tosu.exe).
 *
 * Copied from node-gyp (MIT).
 */

#ifdef _MSC_VER

#pragma managed(push, off)

#ifndef WIN32_LEAN_AND_MEAN
#define WIN32_LEAN_AND_MEAN
#endif

#include <windows.h>

#include <delayimp.h>
#include <string.h>

static FARPROC WINAPI load_exe_hook(unsigned int event, DelayLoadInfo* info) {
  HMODULE m;
  if (event != dliNotePreLoadLibrary)
    return NULL;

  if (_stricmp(info->szDll, HOST_BINARY) != 0)
    return NULL;

  m = GetModuleHandle(NULL);
  return (FARPROC) m;
}

decltype(__pfnDliNotifyHook2) __pfnDliNotifyHook2 = load_exe_hook;

#pragma managed(pop)

#endif
```

- [ ] **Step 3: Write the build script**

Create `packages/tsprocess/build.ts`:

```ts
// Builds lib/*.cc into dist/lib/tsprocess.node without node-gyp or Node.js.
// Windows: MSVC from Visual Studio Build Tools; node.exe is delay-loaded and
// resolved to the running executable by lib/win_delay_load_hook.cc (as node-gyp does).
// Linux: g++ shared library; napi_* symbols resolve against the host executable.
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = import.meta.dir;
const buildDir = path.join(root, 'build');
const outDir = path.join(root, 'dist', 'lib');
const output = path.join(outDir, 'tsprocess.node');

const napiHeadersDir = path.dirname(
    Bun.resolveSync('node-api-headers/package.json', root)
);
const addonApiDir = path.dirname(
    Bun.resolveSync('node-addon-api/package.json', root)
);

const includeDirs = [path.join(napiHeadersDir, 'include'), addonApiDir];
const defines = [
    'NAPI_DISABLE_CPP_EXCEPTIONS',
    'NAPI_VERSION=8',
    'BUILDING_NODE_EXTENSION'
];

function run(
    command: string,
    args: string[],
    options: { windowsVerbatimArguments?: boolean } = {}
) {
    const result = spawnSync(command, args, {
        cwd: root,
        stdio: 'inherit',
        ...options
    });
    if (result.error) throw result.error;
    if (result.status !== 0) {
        throw new Error(`${command} exited with code ${result.status}`);
    }
}

function readExports(defFile: string): string[] {
    return readFileSync(path.join(napiHeadersDir, 'def', defFile), 'utf8')
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(
            (line) => line.startsWith('napi_') || line.startsWith('node_api_')
        );
}

function buildWindows() {
    const programFilesX86 =
        process.env['ProgramFiles(x86)'] ?? 'C:\\Program Files (x86)';
    const vswhere = path.join(
        programFilesX86,
        'Microsoft Visual Studio',
        'Installer',
        'vswhere.exe'
    );
    const query = spawnSync(
        vswhere,
        [
            '-latest',
            '-products',
            '*',
            '-requires',
            'Microsoft.VisualStudio.Component.VC.Tools.x86.x64',
            '-property',
            'installationPath'
        ],
        { encoding: 'utf8' }
    );
    const vsPath = (query.stdout ?? '').trim();
    if (!vsPath) {
        throw new Error(
            'Visual Studio Build Tools with the "Desktop development with C++" workload not found'
        );
    }
    const vcvarsall = path.join(
        vsPath,
        'VC',
        'Auxiliary',
        'Build',
        'vcvarsall.bat'
    );

    // Import library for node.exe: union of both def files shipped by node-api-headers.
    const exportsList = [
        ...new Set([
            ...readExports('node_api.def'),
            ...readExports('js_native_api.def')
        ])
    ];
    writeFileSync(
        path.join(buildDir, 'node.def'),
        ['NAME NODE.EXE', 'EXPORTS', ...exportsList, ''].join('\r\n')
    );

    const sources = [
        'lib\\functions.cc',
        'lib\\memory\\memory_windows.cc',
        'lib\\win_delay_load_hook.cc'
    ];
    const compile = [
        'cl',
        '/nologo',
        '/std:c++20',
        '/EHsc',
        '/O2',
        '/MT',
        '/utf-8',
        ...defines.map((define) => `/D${define}`),
        '/DHOST_BINARY=\\"node.exe\\"',
        ...includeDirs.map((dir) => `/I"${dir}"`),
        '/c',
        ...sources,
        `/Fo"${buildDir}\\"`
    ].join(' ');
    const importLib = `lib /nologo /def:"${buildDir}\\node.def" /out:"${buildDir}\\node.lib" /machine:x64`;
    const link = [
        'link',
        '/nologo',
        '/DLL',
        `/OUT:"${output}"`,
        `"${buildDir}\\functions.obj"`,
        `"${buildDir}\\memory_windows.obj"`,
        `"${buildDir}\\win_delay_load_hook.obj"`,
        `"${buildDir}\\node.lib"`,
        'delayimp.lib',
        'kernel32.lib',
        'user32.lib',
        'Psapi.lib',
        'ntdll.lib',
        '/DELAYLOAD:node.exe'
    ].join(' ');

    run(
        'cmd.exe',
        [
            '/d',
            '/s',
            '/c',
            `"call "${vcvarsall}" x64 >nul && ${compile} && ${importLib} && ${link}"`
        ],
        { windowsVerbatimArguments: true }
    );
}

function buildLinux() {
    run('g++', [
        '-std=c++20',
        '-O2',
        '-fPIC',
        '-shared',
        '-fno-exceptions',
        '-pthread',
        ...defines.map((define) => `-D${define}`),
        ...includeDirs.map((dir) => `-I${dir}`),
        'lib/functions.cc',
        'lib/memory/memory_linux.cc',
        '-o',
        output
    ]);
}

rmSync(buildDir, { recursive: true, force: true });
mkdirSync(buildDir, { recursive: true });
mkdirSync(outDir, { recursive: true });

switch (process.platform) {
    case 'win32':
        buildWindows();
        break;
    case 'linux':
        buildLinux();
        break;
    default:
        throw new Error(`Unsupported platform: ${process.platform}`);
}

console.log(`Built ${path.relative(root, output)}`);
```

- [ ] **Step 4: Point the TypeScript entry at the built addon**

Replace `packages/tsprocess/src/index.ts` with:

```ts
// Resolves from both src/ (bun test) and dist/ (tsc output): <pkg>/dist/lib/tsprocess.node
export default require('../dist/lib/tsprocess.node');
export * from './process';
```

- [ ] **Step 5: Update package.json and remove binding.gyp**

Replace `packages/tsprocess/package.json` with:

```json
{
  "name": "tsprocess",
  "version": "1.0.1",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc && bun run build.ts",
    "build:native": "bun run build.ts"
  },
  "dependencies": {
    "@tosu/common": "workspace:*",
    "node-addon-api": "^8.5.0",
    "node-api-headers": "^1.7.0"
  },
  "files": [
    "lib",
    "dist",
    "build.ts"
  ]
}
```

Then:

```bash
git rm packages/tsprocess/binding.gyp
```

- [ ] **Step 6: Write the smoke test**

Create `packages/tsprocess/src/process.test.ts`:

```ts
import { describe, expect, test } from 'bun:test';
import path from 'node:path';

import { Process } from './process';

describe('tsprocess native addon', () => {
    test('finds the current process by executable name', () => {
        const pids = Process.findProcesses([path.basename(process.execPath)]);
        expect(pids).toContain(process.pid);
    });

    test('reports the current process as 64-bit', () => {
        expect(Process.isProcess64bit(process.pid)).toBe(true);
    });
});
```

- [ ] **Step 7: Run the test to verify it fails (addon not built yet)**

```bash
rm -rf packages/tsprocess/dist
cd packages/tsprocess && bun test
```

Expected: FAIL with `Cannot find module '../dist/lib/tsprocess.node'`.

- [ ] **Step 8: Build the addon and run the test**

```bash
cd packages/tsprocess && bun run build && bun test
```

Expected: `Built dist/lib/tsprocess.node`, then 2 tests pass. On Windows, confirm the delay-load import is present:

```bash
grep -c -a "node.exe" packages/tsprocess/dist/lib/tsprocess.node
```

Expected: a number ≥ 1.

- [ ] **Step 9: Commit**

```bash
git add packages/tsprocess
git commit -m "build(tsprocess): compile addon with MSVC/g++ instead of node-gyp"
```

---

### Task 2: Switch the monorepo to Bun workspaces

**Files:**
- Create: `.bun-version`
- Modify: `package.json` (root)
- Modify: `tsconfig.base.json`
- Modify: `.husky/pre-commit`
- Modify: `packages/ingame-overlay/package.json:11`
- Modify: `DEVELOPMENT.md`
- Delete: `pnpm-workspace.yaml`, `pnpm-lock.yaml`
- Create (generated): `bun.lock`

**Interfaces:**
- Consumes: Task 1 scripts (`bun run build` in `packages/tsprocess`).
- Produces: root scripts `start`, `watch`, `build:native`, `build:win`, `build:linux`, `build:overlay`, `test`, `lint:ci`, `prettier:ci`; `@types/bun` available to every package.

- [ ] **Step 1: Pin Bun**

Create `.bun-version` containing:

```
1.4.0
```

- [ ] **Step 2: Rewrite the root package.json**

Replace `package.json` with:

```json
{
  "name": "tosu-monorepo",
  "private": true,
  "author": "Mikhail Babynichev",
  "license": "GPL-3.0",
  "version": "4.26.0",
  "packageManager": "bun@1.4.0",
  "workspaces": [
    "packages/*"
  ],
  "trustedDependencies": [
    "electron",
    "esbuild"
  ],
  "scripts": {
    "prepare": "husky install && bun run build:native && bun --cwd packages/server run prepare",
    "start": "bun --cwd packages/tosu run run:dev",
    "watch": "bun --cwd packages/tosu run watch",
    "build:native": "bun --cwd packages/tsprocess run build",
    "build:win": "bun --cwd packages/tosu run compile:win",
    "build:linux": "bun --cwd packages/tosu run compile:linux",
    "build:overlay": "bun --cwd packages/ingame-overlay run dist",
    "test": "bun test",
    "release": "commit-and-tag-version",
    "prettier:fix": "prettier --write \"**/*.{js,jsx,ts,tsx,css}\"",
    "prettier:ci": "prettier --check \"**/*.{js,jsx,ts,tsx,css}\"",
    "lint:ci": "eslint --ext .ts,.d.ts .",
    "lint:fix": "eslint --fix --ext .ts,.d.ts ."
  },
  "devDependencies": {
    "@eslint/eslintrc": "^3.3.6",
    "@eslint/js": "^9.39.5",
    "@trivago/prettier-plugin-sort-imports": "^5.2.2",
    "@types/bun": "^1.4.0",
    "@types/node": "^24.10.4",
    "@typescript-eslint/eslint-plugin": "^8.66.0",
    "@typescript-eslint/parser": "^8.66.0",
    "commit-and-tag-version": "^13.1.2",
    "eslint": "^9.39.5",
    "eslint-config-prettier": "^10.1.8",
    "eslint-config-standard": "^17.1.0",
    "eslint-plugin-import": "^2.32.0",
    "eslint-plugin-n": "^17.23.1",
    "eslint-plugin-prettier": "^5.5.4",
    "eslint-plugin-promise": "^7.2.1",
    "husky": "^9.1.7",
    "lint-staged": "^15.5.2",
    "prettier": "^3.7.4",
    "typescript": "^6.0.3"
  },
  "lint-staged": {
    "**/*.{js,ts}": [
      "bun run prettier:fix",
      "bun run lint:fix"
    ]
  },
  "homepage": "https://github.com/tosuapp/tosu#readme",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/tosuapp/tosu.git"
  },
  "bugs": {
    "url": "https://github.com/tosuapp/tosu/issues"
  },
  "engines": {
    "bun": ">=1.4.0"
  }
}
```

(`tsconfig-paths` is dropped: it was only referenced by the ts-node launch configuration in `.vscode/launch.json`.)

- [ ] **Step 3: Add Bun types to the base tsconfig**

In `tsconfig.base.json`, add `"types": ["bun"]` inside `compilerOptions` (after `"lib"`):

```json
{
  "compilerOptions": {
    "lib": [
      "ES2023"
    ],
    "types": ["bun"],
    "target": "es2023",
    "ignoreDeprecations": "6.0",
    "module": "preserve",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "isolatedModules": true,
    "noImplicitAny": true,
    "sourceMap": false,
    "declaration": false,
    "noEmit": true,
    "strict": true,
    "verbatimModuleSyntax": true
  }
}
```

- [ ] **Step 4: Husky and overlay script**

Replace `.husky/pre-commit` with:

```sh
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

bunx lint-staged
```

In `packages/ingame-overlay/package.json` change the `dist` script to:

```json
"dist": "bun run build && electron-builder --windows"
```

- [ ] **Step 5: Remove pnpm files and install with Bun**

```bash
git rm pnpm-workspace.yaml pnpm-lock.yaml
rm -rf node_modules packages/*/node_modules
bun install
```

Expected: `bun.lock` is created; the `prepare` script runs (`husky install`, `tsprocess` build prints `Built dist/lib/tsprocess.node`, sass writes `packages/server/assets/homepage.min.css`).

- [ ] **Step 6: Verify lint, prettier and tests under Bun**

```bash
bun run prettier:ci
bun run lint:ci
bun test
```

Expected: all three succeed (`bun test` runs the 2 tsprocess tests).

- [ ] **Step 7: Update DEVELOPMENT.md**

Replace `DEVELOPMENT.md` with:

````markdown
# tosu Development Guide

This guide walks you through setting up your local environment, running the application in development mode, and compiling binaries.

## System Prerequisites

* **Bun**: version `1.4.0` (see `.bun-version`). Install from https://bun.com. Node.js is not required.
* **C++ Build Tools**: Visual Studio Build Tools with the "Desktop development with C++" workload (Windows) or `build-essential` (Linux). They compile the `tsprocess` native addon.

## Project Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/tosuapp/tosu.git
   cd tosu
   ```

2. Install dependencies (this also builds the native `tsprocess` addon and the dashboard stylesheet):
   ```bash
   bun install
   ```

   To rebuild the native addon later:
   ```bash
   bun run build:native
   ```

## Running in Development

Hot-reloading (rolldown watch + automatic restart):
```bash
bun run watch
```

Standard mode (single bundle + run):
```bash
bun run start
```

Both commands bundle `packages/tosu/src` into `packages/tosu/dist/index.js` and run it with Bun. The software polls for a running osu! or osu!lazer process and attaches automatically.

### Running Specific Files
```bash
bun packages/tosu/src/<file>.ts
```

### Debugging
```bash
bun --inspect packages/tosu/dist/index.js
```
Then attach with the Bun VS Code extension or open the printed devtools URL.

## Tests

```bash
bun test
```

## Compilation

A single self-contained binary is produced in `packages/tosu/dist/`:

* **Windows**: `bun run build:win` → `packages/tosu/dist/tosu.exe`
* **Linux**: `bun run build:linux` → `packages/tosu/dist/tosu`

The in-game overlay (Electron) is built with `bun run build:overlay` (Windows only).
````

- [ ] **Step 8: Commit**

```bash
bun run prettier:fix
git add -A
git commit -m "build: switch monorepo to bun workspaces"
```

---

### Task 3: Run dev and watch under Bun

**Files:**
- Modify: `packages/tosu/package.json`
- Modify: `packages/tosu/watch.ts`
- Modify: `packages/tosu/rolldown.config.mjs`
- Modify: `packages/common/utils/directories.ts:76-79`
- Modify: `packages/tosu/src/index.ts:21-23`
- Create: `packages/common/utils/arguments.test.ts`

**Interfaces:**
- Consumes: root scripts from Task 2.
- Produces: `bun run start` / `bun run watch` working under Bun; `getProgramPath()` returns the executable directory when compiled (`Bun.isStandaloneExecutable`) and `process.cwd()` otherwise.

- [ ] **Step 1: Package scripts**

In `packages/tosu/package.json` replace the `scripts` block with:

```json
"scripts": {
    "genver": "genversion -es src/_version.js",
    "ts:compile": "rolldown -c rolldown.config.mjs",
    "watch": "bun run genver && NODE_ENV=development bun watch.ts",
    "run:dev": "bun run genver && bun run ts:compile && bun dist/index.js"
}
```

Remove `cross-env` and `tsx` from `devDependencies` (they are no longer referenced).

- [ ] **Step 2: Spawn Bun from the watcher**

In `packages/tosu/watch.ts` replace the `END` case body:

```ts
        case 'END': {
            // Start tosu process after bundler has finished
            tosuProcess = childProcess.spawn(
                process.execPath,
                ['dist/index.js'],
                {
                    stdio: 'inherit'
                }
            );
            break;
        }
```

- [ ] **Step 3: rolldown config: Bun externals, clean dist, unminified output, assets from the workspace**

Replace the config object in `packages/tosu/rolldown.config.mjs` (keep `rosuPlugin` unchanged):

```js
export default defineConfig([
    {
        input: 'src/index.ts',
        platform: 'node',
        external: [/^bun(:.*)?$/],
        moduleTypes: {
            '.node': 'copy'
        },
        output: {
            cleanDir: true,
            minify: false,
            keepNames: true,
            sourcemap: true,
            sourcemapExcludeSources: true,
            format: 'esm',
            dir: 'dist',
            assetFileNames: '[name]-[hash][extname]'
        },
        watch: {
            buildDelay: 500
        },
        plugins: [
            rosuPlugin(),
            replacePlugin({
                __dirname: 'import.meta.dirname'
            }),
            // Copy server assets
            copy({
                copyOnce: true,
                targets: [
                    {
                        src: '../server/assets/**/*',
                        dest: 'dist/assets'
                    }
                ],
                verbose: true
            })
        ]
    }
]);
```

`minify: false` because `bun build --compile --minify` (Task 4) minifies and embeds a source map that then points at readable code. `cleanDir: true` removes stale `tsprocess-<hash>.node` files that would otherwise be embedded by Task 4.

- [ ] **Step 4: Program path detection**

In `packages/common/utils/directories.ts` replace `getProgramPath`:

```ts
export function getProgramPath() {
    if (Bun.isStandaloneExecutable) return path.dirname(process.execPath);
    return process.cwd();
}
```

- [ ] **Step 5: Console title**

In `packages/tosu/src/index.ts`, inside the async IIFE before `wLogger.info(\`Starting %tosu%\`)`, add:

```ts
    process.title = 'tosu';
```

- [ ] **Step 6: Write the arguments parser test (pure logic, runs under bun test)**

Create `packages/common/utils/arguments.test.ts`:

```ts
import { describe, expect, test } from 'bun:test';

import { argumentsParser } from './arguments';

describe('argumentsParser', () => {
    test('parses argv arrays with = and boolean values', () => {
        expect(
            argumentsParser(['tosu.exe', '--update=false', '--onedrive=true'])
        ).toEqual({ update: false, onedrive: true });
    });

    test('parses numeric values from a string', () => {
        expect(argumentsParser('--port=24050 --debug=true')).toEqual({
            port: 24050,
            debug: true
        });
    });
});
```

- [ ] **Step 7: Run tests and the dev build**

```bash
bun test
bun run start
```

Expected: 4 tests pass; `bun run start` prints `Starting tosu`, `Dashboard server started on http://127.0.0.1:24050` and `Searching for osu! process...`. Stop it with Ctrl+C. Then `bun run watch`, edit a comment in `packages/tosu/src/index.ts`, expect a restart.

- [ ] **Step 8: Commit**

```bash
bun run prettier:fix
git add -A
git commit -m "chore(tosu): run dev and watch under bun"
```

---

### Task 4: Compile the executable with `bun build --compile`

**Files:**
- Create: `packages/tosu/build.ts`
- Modify: `packages/tosu/package.json`
- Delete: `packages/tosu/pkg.win.json`, `packages/tosu/pkg.linux.json`, `packages/tosu/src/postBuild.mts`

**Interfaces:**
- Consumes: rolldown output in `packages/tosu/dist/` (`index.js`, `*.node`, `rosu_pp_js_bg.wasm`, `assets/`), `packages/tosu/src/_version.js` (`export const version`).
- Produces: `bun run build:win` → `packages/tosu/dist/tosu.exe`; `bun run build:linux` → `packages/tosu/dist/tosu`. Inside the binary: `import.meta.dir/assets/*`, `import.meta.dir/rosu_pp_js_bg.wasm`, `import.meta.dir/<name>.node`.

- [ ] **Step 1: Write the compile driver**

Create `packages/tosu/build.ts`:

```ts
// Turns the rolldown output in dist/ into a single executable.
// Runs with cwd = dist so that every embedded asset keeps its relative path
// and is reachable from import.meta.dir inside the binary.
import { Glob } from 'bun';
import path from 'node:path';

import { version } from './src/_version.js';

const target = process.argv[2];
if (target !== 'windows' && target !== 'linux') {
    console.error('usage: bun build.ts <windows|linux>');
    process.exit(1);
}

const distDir = path.join(import.meta.dir, 'dist');
process.chdir(distDir);

// Dashboard assets, rosu wasm and every native addon (tsprocess + lazer calculator).
const assets = ['assets', ...new Glob('*.{node,wasm}').scanSync(distDir)];

const result = await Bun.build({
    entrypoints: ['./index.js'],
    minify: true,
    sourcemap: 'linked',
    bytecode: true,
    compile: {
        target: target === 'windows' ? 'bun-windows-x64' : 'bun-linux-x64',
        outfile: target === 'windows' ? './tosu.exe' : './tosu',
        assets,
        autoloadDotenv: false,
        autoloadBunfig: false,
        ...(target === 'windows'
            ? {
                  windows: {
                      icon: path.join(
                          import.meta.dir,
                          'src',
                          'assets',
                          'icon.ico'
                      ),
                      hideConsole: false,
                      title: 'tosu',
                      publisher: 'KotRik',
                      version,
                      description: 'osu! memory reader, built in typescript',
                      copyright: '© KotRik. All rights reserved.'
                  }
              }
            : {})
    }
});

if (!result.success) {
    for (const log of result.logs) console.error(log);
    process.exit(1);
}

console.log(`Compiled ${result.outputs[0].path}`);
console.log(`Embedded: ${assets.join(', ')}`);
```

- [ ] **Step 2: Package scripts and dependency cleanup**

In `packages/tosu/package.json`:

- add to `scripts`:

```json
"compile:win": "bun run genver && bun run ts:compile && bun build.ts windows",
"compile:linux": "bun run genver && bun run ts:compile && bun build.ts linux"
```

- remove `resedit` from `dependencies`; remove `@yao-pkg/pkg` from `devDependencies`.

Then:

```bash
git rm packages/tosu/pkg.win.json packages/tosu/pkg.linux.json packages/tosu/src/postBuild.mts
bun install
```

- [ ] **Step 3: Build (Windows)**

```bash
bun run build:win
```

Expected: `Compiled …\packages\tosu\dist\tosu.exe` and `Embedded: assets, binding-<hash>.node, tsprocess-<hash>.node, rosu_pp_js_bg.wasm`. Right-click → Properties → Details shows the tosu icon, `File description: osu! memory reader, built in typescript`, `Product version: 4.26.0`.

- [ ] **Step 4: Verify the executable end to end (gate for embedded addons)**

```bash
mkdir -p /tmp/tosu-smoke && cp packages/tosu/dist/tosu.exe /tmp/tosu-smoke/
cd /tmp/tosu-smoke && ./tosu.exe
```

Expected in the console: `Starting tosu`, `Dashboard server started on http://127.0.0.1:24050`, `Searching for osu! process...`, and **no** `Cannot find module` / `dlopen` error. In a second terminal:

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:24050/api/calculate/pp
curl -s http://127.0.0.1:24050/ | head -c 200
```

Expected: `500` (JSON error `osu is not ready/running` — the route reaches `rosu-pp-js` only after an instance exists, the 500 proves the router and the process are alive) and the dashboard HTML. Start osu!(stable) and confirm `curl http://127.0.0.1:24050/json` returns state JSON (this exercises `tsprocess.node` and, once a beatmap is selected, `binding.node`).

**If the process fails with a module-not-found error for `./tsprocess-<hash>.node`:** switch the addons from `assets` to extra entrypoints. In `build.ts` replace the `assets` line and the build call with:

```ts
const nativeFiles = [...new Glob('*.{node,wasm}').scanSync(distDir)];

const result = await Bun.build({
    entrypoints: ['./index.js', ...nativeFiles.map((file) => `./${file}`)],
    naming: { asset: '[name].[ext]' },
    minify: true,
    sourcemap: 'linked',
    bytecode: true,
    compile: {
        // …same compile options as above, with:
        assets: ['assets']
    }
});
```

and repeat this step. If that also fails, stop and report the exact error (shipping the `.node` files beside the executable is a product decision, see spec "Risks and gates").

- [ ] **Step 5: Build (Linux)**

On a Linux machine or WSL with `g++`:

```bash
bun install && bun run build:linux && ./packages/tosu/dist/tosu
```

Expected: same startup log lines. (CI covers this in Task 5 if no Linux machine is at hand.)

- [ ] **Step 6: Commit**

```bash
bun run prettier:fix
git add -A
git commit -m "build(tosu): compile executable with bun build --compile"
```

---

### Task 5: CI on Bun

**Files:**
- Modify: `.github/workflows/deploy.yml`
- Modify: `.github/workflows/pr_lint.yml`

**Interfaces:**
- Consumes: root scripts `build:win`, `build:linux`, `build:overlay`, `test`, `lint:ci`, `prettier:ci`; `.bun-version`.
- Produces: artifacts `tosu-windows-*` (`packages/tosu/dist/tosu.exe`), `tosu-linux-*` (`packages/tosu/dist/tosu`), `tosu-overlay-*` (unchanged paths), SignPath request unchanged.

- [ ] **Step 1: deploy.yml — replace the Node/pnpm steps**

In `.github/workflows/deploy.yml` replace the two steps `🛠️ - Install Node` and `🛠️ - Install Deps` with:

```yaml
      - name: 🛠️ - Install Bun
        uses: oven-sh/setup-bun@v2
        with:
          bun-version-file: .bun-version

      - name: 🛠️ - Install Deps
        run: bun install --frozen-lockfile

      - name: 🧪 - Test
        run: bun test
```

and change the three build steps to:

```yaml
      - name: 📦 - Build (windows)
        if: ${{ matrix.os == 'windows-latest' }}
        run: bun run build:win

      - name: 📦 - Build (linux)
        if: ${{ matrix.os == 'ubuntu-latest' }}
        run: bun run build:linux

      - name: 📦 - Build ingame-overlay (windows)
        if: ${{ matrix.os == 'windows-latest' }}
        run: bun run build:overlay
```

Everything else (triggers, concurrency, `Prepare overlay for upload`, artifact uploads, SignPath) stays as is.

- [ ] **Step 2: pr_lint.yml — Bun, plus tests**

Replace the steps of the `lint` job in `.github/workflows/pr_lint.yml` with:

```yaml
    steps:
      - name: Checkout 🛎️
        uses: actions/checkout@v7

      - name: Install Bun 🔧
        uses: oven-sh/setup-bun@v2
        with:
          bun-version-file: .bun-version

      - name: Install Deps 🔧
        run: bun install --frozen-lockfile

      - name: Lint PR (prettier)
        run: bun run prettier:ci

      - name: Lint PR (eslint)
        run: bun run lint:ci

      - name: Test
        run: bun test
```

- [ ] **Step 3: Push and watch CI**

```bash
git add .github
git commit -m "ci: build and test with bun"
git push -u origin feat/bun
```

Open a draft PR `feat: migrate to bun` against `master`. Expected: `PR-check` green; `build & deploy` green on both runners with the three artifacts. If the overlay step fails inside `electron-builder` under Bun, add before it (Windows only):

```yaml
      - name: 🛠️ - Install Node (electron-builder only)
        if: ${{ matrix.os == 'windows-latest' }}
        uses: actions/setup-node@v7
        with: { node-version: 24.14.0 }
```

and note it in the PR description.

---

### Task 6: HTTP core on `Bun.serve`

**Files:**
- Modify: `packages/server/utils/index.ts:80-114`
- Modify: `packages/server/utils/http.ts` (full rewrite)
- Create: `packages/server/utils/http.test.ts`

**Interfaces:**
- Consumes: `config`, `platformResolver`, `wLogger` from `@tosu/common`; type `WsData` from `utils/socket.ts` (Task 7; a temporary stub is created in Step 3 when Task 7 has not run yet).
- Produces:
  - `json(data: object | any[], status?: number, statusText?: string): Response`
  - `html(body: string, status?: number): Response`
  - `isRequestAllowed(headers: Headers): boolean`
  - `class HttpServer { server: Bun.Server<WsData> | null; constructor({ instanceManager, websocket }); route(path: string | RegExp, method: HttpMethod, handler: RouteHandler): void; onUpgrade(handler: UpgradeHandler): void; listen(port: number, hostname: string): void; stop(): Promise<void> }`
  - `interface TosuRequest { raw: Request; method: HttpMethod; url: URL; pathname: string; query: Record<string, string>; params: Record<string, string>; headers: Headers; body: string; remoteAddress: string; instanceManager: InstanceManager }`
  - `type RouteHandler = (req: TosuRequest) => Response | Promise<Response>`
  - `type UpgradeHandler = (request: Request, url: URL, server: Bun.Server<WsData>) => boolean`

- [ ] **Step 1: Response helpers and origin check**

In `packages/server/utils/index.ts` replace everything from `export function sendJson` to the end of `isRequestAllowed` (keep `contentTypes`, `getContentType` and `isAllowedIP`) with:

```ts
export function json(
    data: object | any[],
    status: number = 200,
    statusText?: string
) {
    let body: string;
    try {
        body = JSON.stringify(data);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
        body = JSON.stringify({ error: 'Json parsing error' });
    }

    return new Response(body, {
        status,
        statusText,
        headers: { 'Content-Type': 'application/json' }
    });
}

export function html(body: string, status: number = 200) {
    return new Response(body, {
        status,
        headers: { 'Content-Type': getContentType('file.html') }
    });
}

export function isRequestAllowed(headers: Headers) {
    const origin = headers.get('origin') ?? undefined;
    const referer = headers.get('referer') ?? undefined;

    // Requests without an origin/referer (curl, overlays opened from disk) are allowed.
    if (origin === undefined && referer === undefined) {
        return true;
    }

    return isAllowedIP(origin) || isAllowedIP(referer);
}
```

Remove the `import http from 'http';` line at the top of the file.

- [ ] **Step 2: Write the failing router test**

Create `packages/server/utils/http.test.ts`:

```ts
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import type { InstanceManager } from 'tosu/instances/manager';

import { HttpServer } from './http';
import { json } from './index';

const instanceManager = {
    focusedClient: 0,
    osuInstances: {},
    getInstance: () => undefined
} as unknown as InstanceManager;

let app: HttpServer;
let base: string;

beforeAll(() => {
    app = new HttpServer({ instanceManager, websocket: { message() {} } });

    app.route('/plain', 'GET', () => json({ ok: true }));
    app.route(/^\/files\/(?<filePath>.*)/, 'GET', (req) =>
        json({ filePath: req.params.filePath, query: req.query })
    );
    app.route('/echo', 'POST', (req) => json({ body: req.body }));
    app.route('/boom', 'GET', () => {
        throw new Error('osu is not ready/running');
    });
    app.route(/.*/, 'GET', (req) => json({ catchAll: req.pathname }));

    app.listen(0, '127.0.0.1');
    base = `http://127.0.0.1:${app.server!.port}`;
});

afterAll(async () => {
    await app.stop();
});

describe('HttpServer', () => {
    test('serves string routes with CORS headers', async () => {
        const res = await fetch(`${base}/plain`);

        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ ok: true });
        expect(res.headers.get('access-control-allow-origin')).toBe('*');
        expect(res.headers.get('access-control-allow-private-network')).toBe(
            'true'
        );
    });

    test('regex routes expose named groups as params and parse the query', async () => {
        const res = await fetch(`${base}/files/a/b.png?x=1&y=two`);

        expect(await res.json()).toEqual({
            filePath: 'a/b.png',
            query: { x: '1', y: 'two' }
        });
    });

    test('string routes win over the catch-all, catch-all handles the rest', async () => {
        expect(await (await fetch(`${base}/plain`)).json()).toEqual({
            ok: true
        });
        expect(await (await fetch(`${base}/anything/else`)).json()).toEqual({
            catchAll: '/anything/else'
        });
    });

    test('POST body is available as text', async () => {
        const res = await fetch(`${base}/echo`, {
            method: 'POST',
            body: '{"a":1}'
        });

        expect(await res.json()).toEqual({ body: '{"a":1}' });
    });

    test('thrown errors become 500 JSON with encoded statusText', async () => {
        const res = await fetch(`${base}/boom`);

        expect(res.status).toBe(500);
        expect(res.statusText).toBe(encodeURI('osu is not ready/running'));
        expect(await res.json()).toEqual({ error: 'osu is not ready/running' });
    });

    test('unknown method on a known path is 404', async () => {
        const res = await fetch(`${base}/plain`, { method: 'DELETE' });

        expect(res.status).toBe(404);
        expect(await res.text()).toBe('Not Found');
    });

    test('requests from a disallowed origin are rejected with 403', async () => {
        const res = await fetch(`${base}/plain`, {
            headers: { origin: 'http://evil.example' }
        });

        expect(res.status).toBe(403);
    });

    test('requests from an allowed origin pass', async () => {
        const res = await fetch(`${base}/plain`, {
            headers: { origin: 'http://localhost:24050' }
        });

        expect(res.status).toBe(200);
    });
});
```

- [ ] **Step 3: Run the test to verify it fails**

```bash
cd packages/server && bun test utils/http.test.ts
```

Expected: FAIL (`HttpServer` constructor does not accept `{ instanceManager, websocket }`; `json` is not exported).

If Task 7 has not been executed yet, temporarily replace `packages/server/utils/socket.ts` with a type stub so `http.ts` compiles (Task 7 rewrites the file):

```ts
export interface WsData {
    endpoint: string;
    id: string;
}
```

- [ ] **Step 4: Rewrite `HttpServer` on `Bun.serve`**

Replace `packages/server/utils/http.ts` with:

```ts
import { config, platformResolver, wLogger } from '@tosu/common';
import type { Server as BunServer, WebSocketHandler } from 'bun';
import { exec } from 'node:child_process';
import type { InstanceManager } from 'tosu/instances/manager';

import { isRequestAllowed, json } from './index';
import type { WsData } from './socket';

export type HttpMethod =
    | 'GET'
    | 'POST'
    | 'HEAD'
    | 'PUT'
    | 'DELETE'
    | 'CONNECT'
    | 'OPTIONS'
    | 'TRACE'
    | 'PATCH';

export interface TosuRequest {
    raw: Request;
    method: HttpMethod;
    url: URL;
    pathname: string;
    query: Record<string, string>;
    params: Record<string, string>;
    headers: Headers;
    body: string;
    remoteAddress: string;
    instanceManager: InstanceManager;
}

export type RouteHandler = (req: TosuRequest) => Response | Promise<Response>;

/** Returns true when the request was upgraded to a WebSocket. */
export type UpgradeHandler = (
    request: Request,
    url: URL,
    server: BunServer<WsData>
) => boolean;

interface RegexRoute {
    path: RegExp;
    method: HttpMethod;
    handler: RouteHandler;
}

const CORS_HEADERS: Record<string, string> = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers':
        'Origin, X-Requested-With, Content-Type, Accept',
    'Access-Control-Allow-Methods': 'POST, GET, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Private-Network': 'true'
};

const BODY_METHODS: HttpMethod[] = ['POST', 'PUT', 'PATCH'];

export class HttpServer {
    server: BunServer<WsData> | null = null;

    private instanceManager: InstanceManager;
    private websocket: WebSocketHandler<WsData>;
    private staticRoutes = new Map<
        string,
        Partial<Record<HttpMethod, RouteHandler>>
    >();

    private regexRoutes: RegexRoute[] = [];
    private upgradeHandler: UpgradeHandler | null = null;

    constructor({
        instanceManager,
        websocket
    }: {
        instanceManager: InstanceManager;
        websocket: WebSocketHandler<WsData>;
    }) {
        this.instanceManager = instanceManager;
        this.websocket = websocket;
    }

    route(path: string | RegExp, method: HttpMethod, handler: RouteHandler) {
        if (typeof path === 'string') {
            const methods = this.staticRoutes.get(path) ?? {};
            if (!methods[method]) methods[method] = handler;
            this.staticRoutes.set(path, methods);
            return;
        }

        const exists = this.regexRoutes.some(
            (route) =>
                route.method === method && route.path.source === path.source
        );
        if (!exists) this.regexRoutes.push({ path, method, handler });
    }

    onUpgrade(handler: UpgradeHandler) {
        this.upgradeHandler = handler;
    }

    listen(port: number, hostname: string) {
        try {
            this.server = Bun.serve({
                port,
                hostname,
                idleTimeout: 30,
                websocket: this.websocket,
                fetch: (request, server) => this.handleRequest(request, server),
                error: (error) => {
                    wLogger.error('Server experienced an error:', error.message);
                    wLogger.debug('Server error details:', error);

                    return json({ error: error.message }, 500);
                }
            });
        } catch (exc) {
            const message = (exc as Error).message;
            if (
                message.includes('getaddrinfo') ||
                message.includes('EADDRNOTAVAIL')
            ) {
                wLogger.warn(
                    'Server failed to start: Incorrect IP address or URL'
                );
                return;
            }

            wLogger.error('Server experienced an error:', message);
            wLogger.debug('Server error details:', exc);
            return;
        }

        const ip = hostname === '0.0.0.0' ? 'localhost' : hostname;
        wLogger.info(`Dashboard server started on %http://${ip}:${port}%`);

        if (config.openDashboardOnStartup === true) {
            const platform = platformResolver(process.platform);
            exec(
                `${platform.command} http://${ip}:${port}`,
                { windowsHide: true },
                (error, stdout, stderr) => {
                    if (error || stderr) {
                        return;
                    }

                    wLogger.info(`Web dashboard opened successfully`);
                }
            );
        }
    }

    async stop() {
        if (!this.server) return;

        await this.server.stop(true);
        this.server = null;
    }

    private async handleRequest(
        request: Request,
        server: BunServer<WsData>
    ): Promise<Response | undefined> {
        const startTime = performance.now();
        const url = new URL(request.url);
        const method = request.method as HttpMethod;

        const respond = (response: Response) => {
            for (const [key, value] of Object.entries(CORS_HEADERS)) {
                response.headers.set(key, value);
            }

            const elapsedTime = (performance.now() - startTime).toFixed(2);
            wLogger.time(
                `Request processed in %${elapsedTime}ms%`,
                method,
                response.status,
                response.headers.get('content-type'),
                decodeURIComponent(url.pathname + url.search)
            );

            return response;
        };

        if (!isRequestAllowed(request.headers)) {
            wLogger.warn(
                `Blocked unauthorized request to %${url.pathname}${url.search}%`,
                {
                    origin: request.headers.get('origin'),
                    referer: request.headers.get('referer')
                }
            );

            return respond(new Response('Not Found', { status: 403 }));
        }

        if (request.headers.get('upgrade')?.toLowerCase() === 'websocket') {
            // Bun requires `undefined` after a successful upgrade.
            if (this.upgradeHandler?.(request, url, server)) return undefined;
            return respond(new Response('Not Found', { status: 404 }));
        }

        const query: Record<string, string> = {};
        url.searchParams.forEach((value, key) => (query[key] = value));

        const req: TosuRequest = {
            raw: request,
            method,
            url,
            pathname: url.pathname,
            query,
            params: {},
            headers: request.headers,
            body: BODY_METHODS.includes(method) ? await request.text() : '',
            remoteAddress: server.requestIP(request)?.address ?? '',
            instanceManager: this.instanceManager
        };

        const handler = this.match(url.pathname, method, req.params);
        if (!handler) return respond(new Response('Not Found', { status: 404 }));

        try {
            return respond(await handler(req));
        } catch (exc) {
            const message =
                typeof exc === 'string' ? exc : (exc as Error).message;
            const statusText =
                (exc as NodeJS.ErrnoException)?.code === 'ENOENT'
                    ? encodeURI(
                          `${url.pathname} ENOENT: no such file or directory`
                      )
                    : encodeURI(message);

            wLogger.warn(`Request to %${url.pathname}% failed:`, message);
            wLogger.debug(`Route handling error for %${url.pathname}%:`, exc);

            return respond(json({ error: message }, 500, statusText));
        }
    }

    private match(
        pathname: string,
        method: HttpMethod,
        params: Record<string, string>
    ): RouteHandler | undefined {
        const exact = this.staticRoutes.get(pathname)?.[method];
        if (exact) return exact;

        for (const route of this.regexRoutes) {
            if (route.method !== method) continue;

            const result = route.path.exec(pathname);
            if (!result) continue;

            for (const [key, value] of Object.entries(result.groups ?? {})) {
                if (value != null) params[key] = value;
            }

            return route.handler;
        }

        return undefined;
    }
}
```

- [ ] **Step 5: Run the test to verify it passes**

```bash
cd packages/server && bun test utils/http.test.ts
```

Expected: 8 tests pass. (Other files in `packages/server` still import `sendJson`/`ExtendedIncomingMessage`; they are migrated in Tasks 7–10 — `bun test` only loads the files under test.)

- [ ] **Step 6: Commit**

```bash
bun run prettier:fix
git add packages/server/utils/index.ts packages/server/utils/http.ts packages/server/utils/http.test.ts packages/server/utils/socket.ts
git commit -m "feat(server): http router on Bun.serve"
```

---

### Task 7: WebSocket endpoints on `Bun.serve`

**Files:**
- Create: `packages/server/utils/filters.ts`
- Create: `packages/server/utils/filters.test.ts`
- Modify: `packages/server/utils/socket.ts` (full rewrite)
- Modify: `packages/server/router/socket.ts` (full rewrite)
- Modify: `packages/server/utils/commands.ts`
- Create: `packages/server/utils/socket.test.ts`

**Interfaces:**
- Consumes: `HttpServer.onUpgrade`, `TosuRequest` (Task 6); `getUniqueID()` from `utils/hashing.ts`; `normalizeSocketCommand(data, pathname)` from `utils/scFilters.ts`; `getLocalCounters`, `saveSettings` (`utils/counters.ts`), `parseCounterSettings` (`utils/parseSettings.ts`).
- Produces:
  - `type Filter = string | { field: string; keys: Filter[] }`; `applyFilter(filters, data, value): void`
  - `type WsEndpoint = 'v1' | 'sc' | 'v2' | 'v2precise' | 'commands'`
  - `interface WsData { endpoint: WsEndpoint; id: string; pathname: string; query: Record<string, string>; filters: Filter[]; hostAddress: string; localAddress: string; originAddress: string; remoteAddress: string }`
  - `type TosuSocket = ServerWebSocket<WsData>`
  - `class Websocket { readonly endpoint; readonly topic; clients: Map<string, TosuSocket>; constructor({ endpoint, instanceManager, pollRateFieldName, stateFunctionName, onMessageCallback?, onConnectionCallback?, getServer }); open(ws); message(ws, data); close(ws, code, reason); setFilters(ws, filters): void; redispatch(fromId, command, overlayName, payload?): void }`
  - `createWebsocketHandler(endpoints: Record<WsEndpoint, Websocket>): WebSocketHandler<WsData>`
  - `buildSocket(app: HttpServer): void` (registers the upgrade handler)
  - `handleSocketCommands(data: string, socket: TosuSocket, ws: Websocket): void`

- [ ] **Step 1: Extract `applyFilter` and test it**

Create `packages/server/utils/filters.ts`:

```ts
export type Filter = string | { field: string; keys: Filter[] };

/**
 * Copies the requested keys from `data` into `value` (used by the `applyFilters` websocket command).
 */
export function applyFilter(filters: Filter[], data: any, value: any) {
    if (data === null || data === undefined) return;

    for (let i = 0; i < filters.length; i++) {
        const filter = filters[i];
        switch (typeof filter) {
            case 'string':
                value[filter] = data[filter];
                break;

            case 'object': {
                if (!(filter.field && Array.isArray(filter.keys))) break;
                if (
                    data[filter.field] === null ||
                    data[filter.field] === undefined
                )
                    break;

                value[filter.field] = {};
                applyFilter(filter.keys, data[filter.field], value[filter.field]);
            }
        }
    }
}
```

Create `packages/server/utils/filters.test.ts`:

```ts
import { describe, expect, test } from 'bun:test';

import { applyFilter } from './filters';

describe('applyFilter', () => {
    const data = {
        state: 2,
        menu: { name: 'song', bpm: 180, mods: { number: 64 } },
        play: { combo: 12 }
    };

    test('copies top-level keys', () => {
        const value = {};
        applyFilter(['state', 'play'], data, value);

        expect(value).toEqual({ state: 2, play: { combo: 12 } });
    });

    test('copies nested keys through field/keys objects', () => {
        const value = {};
        applyFilter(
            [
                {
                    field: 'menu',
                    keys: ['name', { field: 'mods', keys: ['number'] }]
                }
            ],
            data,
            value
        );

        expect(value).toEqual({ menu: { name: 'song', mods: { number: 64 } } });
    });

    test('ignores missing fields and null data', () => {
        const value = {};
        applyFilter([{ field: 'nope', keys: ['x'] }], data, value);
        applyFilter(['state'], null, value);

        expect(value).toEqual({});
    });
});
```

Run: `cd packages/server && bun test utils/filters.test.ts` — Expected: 3 tests pass.

- [ ] **Step 2: Write the failing websocket integration test**

Create `packages/server/utils/socket.test.ts`:

```ts
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import type { InstanceManager } from 'tosu/instances/manager';

import buildSocket from '../router/socket';
import { handleSocketCommands } from './commands';
import { HttpServer } from './http';
import { Websocket, createWebsocketHandler } from './socket';

const stateV2 = { menu: { name: 'song' }, play: { combo: 5 } };

const instanceManager = {
    focusedClient: 0,
    osuInstances: {},
    // /tokens polls getStateSC, /websocket/v2 polls getStateV2
    getInstance: () => ({
        getStateV2: () => stateV2,
        getStateSC: () => stateV2
    })
} as unknown as InstanceManager;

let app: HttpServer;
let base: string;

function connect(path: string): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
        const ws = new WebSocket(`${base}${path}`);
        ws.onopen = () => resolve(ws);
        ws.onerror = (event) => reject(event);
    });
}

function nextMessage(ws: WebSocket): Promise<string> {
    return new Promise((resolve) => {
        ws.onmessage = (event) => resolve(String(event.data));
    });
}

async function waitFor<T>(
    ws: WebSocket,
    predicate: (message: any) => T | undefined
): Promise<T> {
    for (let i = 0; i < 20; i++) {
        const result = predicate(JSON.parse(await nextMessage(ws)));
        if (result !== undefined) return result;
    }
    throw new Error('message not received');
}

beforeAll(() => {
    const getServer = () => app.server;
    const common = {
        instanceManager,
        onMessageCallback: handleSocketCommands,
        getServer
    };

    const endpoints = {
        v1: new Websocket({
            ...common,
            endpoint: 'v1',
            pollRateFieldName: 'pollRate',
            stateFunctionName: 'getState'
        }),
        sc: new Websocket({
            ...common,
            endpoint: 'sc',
            pollRateFieldName: 'pollRate',
            stateFunctionName: 'getStateSC'
        }),
        v2: new Websocket({
            ...common,
            endpoint: 'v2',
            pollRateFieldName: 'pollRate',
            stateFunctionName: 'getStateV2'
        }),
        v2precise: new Websocket({
            ...common,
            endpoint: 'v2precise',
            pollRateFieldName: 'preciseDataPollRate',
            stateFunctionName: 'getPreciseData'
        }),
        commands: new Websocket({
            ...common,
            endpoint: 'commands',
            pollRateFieldName: '',
            stateFunctionName: ''
        })
    } as const;

    app = new HttpServer({
        instanceManager,
        websocket: createWebsocketHandler(endpoints)
    });
    buildSocket(app);
    app.listen(0, '127.0.0.1');
    base = `ws://127.0.0.1:${app.server!.port}`;
});

afterAll(async () => {
    await app.stop();
});

describe('websocket endpoints', () => {
    test('/websocket/v2 streams the v2 state', async () => {
        const ws = await connect('/websocket/v2');
        const message = JSON.parse(await nextMessage(ws));
        ws.close();

        expect(message).toEqual(stateV2);
    });

    test('applyFilters narrows the payload for that client only', async () => {
        const filtered = await connect('/websocket/v2');
        const plain = await connect('/websocket/v2');

        filtered.send('applyFilters:["menu"]');
        const narrowed = await waitFor(filtered, (m) =>
            m.play === undefined ? m : undefined
        );
        const full = JSON.parse(await nextMessage(plain));

        filtered.close();
        plain.close();

        expect(narrowed).toEqual({ menu: { name: 'song' } });
        expect(full).toEqual(stateV2);
    });

    test('/tokens treats a bare JSON array as applyFilters', async () => {
        const ws = await connect('/tokens?l=test');
        ws.send('["play"]');
        const narrowed = await waitFor(ws, (m) =>
            m.menu === undefined ? m : undefined
        );
        ws.close();

        expect(narrowed).toEqual({ play: { combo: 5 } });
    });

    test('/websocket/commands answers commands', async () => {
        const ws = await connect('/websocket/commands?l=__ingame__');
        ws.send('getSettings:other-overlay');
        const reply = JSON.parse(await nextMessage(ws));
        ws.close();

        expect(reply).toEqual({
            command: 'getSettings',
            message: { error: 'Wrong overlay' }
        });
    });

    test('unknown websocket path is rejected', async () => {
        await expect(connect('/websocket/nope')).rejects.toBeDefined();
    });
});
```

Run: `cd packages/server && bun test utils/socket.test.ts` — Expected: FAIL (`Websocket` constructor signature / `createWebsocketHandler` missing).

- [ ] **Step 3: Rewrite `utils/socket.ts`**

Replace `packages/server/utils/socket.ts` with:

```ts
import { type ConfigKey, config, sleep, wLogger } from '@tosu/common';
import type {
    Server as BunServer,
    ServerWebSocket,
    WebSocketHandler
} from 'bun';
import type { AbstractInstance } from 'tosu/instances';
import type { InstanceManager } from 'tosu/instances/manager';

import { type Filter, applyFilter } from './filters';

export type WsEndpoint = 'v1' | 'sc' | 'v2' | 'v2precise' | 'commands';

export interface WsData {
    endpoint: WsEndpoint;
    id: string;
    /** Path + query string of the upgrade request, e.g. `/tokens?l=name`. */
    pathname: string;
    query: Record<string, string>;
    filters: Filter[];

    hostAddress: string;
    localAddress: string;
    originAddress: string;
    remoteAddress: string;
}

export type TosuSocket = ServerWebSocket<WsData>;

type StateFunctionKey<T> = {
    [K in keyof T]: T[K] extends (instanceManager: InstanceManager) => unknown
        ? K
        : never;
}[keyof T];

export type MessageCallback = (
    data: string,
    socket: TosuSocket,
    ws: Websocket
) => void;

export class Websocket {
    readonly endpoint: WsEndpoint;
    readonly topic: string;
    clients = new Map<string, TosuSocket>();

    private instanceManager: InstanceManager;
    private getServer: () => BunServer<WsData> | null;
    private onMessageCallback?: MessageCallback;
    private onConnectionCallback?: (id: string, url: string) => void;

    constructor({
        endpoint,
        instanceManager,
        pollRateFieldName,
        stateFunctionName,
        onMessageCallback,
        onConnectionCallback,
        getServer
    }: {
        endpoint: WsEndpoint;
        instanceManager: InstanceManager;
        pollRateFieldName: ConfigKey | '';
        stateFunctionName: StateFunctionKey<AbstractInstance> | '';
        onMessageCallback?: MessageCallback;
        onConnectionCallback?: (id: string, url: string) => void;
        getServer: () => BunServer<WsData> | null;
    }) {
        this.endpoint = endpoint;
        this.topic = `tosu:${endpoint}`;
        this.instanceManager = instanceManager;
        this.getServer = getServer;
        this.onMessageCallback = onMessageCallback;
        this.onConnectionCallback = onConnectionCallback;

        if (pollRateFieldName && stateFunctionName !== '') {
            this.start(pollRateFieldName, stateFunctionName);
        }
    }

    open(ws: TosuSocket) {
        this.clients.set(ws.data.id, ws);
        ws.subscribe(this.topic);

        wLogger.debug(`WebSocket client connected: %${ws.data.id}%`);

        this.onConnectionCallback?.(ws.data.id, ws.data.pathname);
    }

    message(ws: TosuSocket, data: string | Buffer) {
        this.onMessageCallback?.(data.toString(), ws, this);
    }

    close(ws: TosuSocket, code: number, reason: string) {
        this.clients.delete(ws.data.id);

        wLogger.debug(
            `WebSocket client disconnected: %${ws.data.id}%`,
            code,
            reason
        );
    }

    /** Filtered clients leave the broadcast topic and receive individual payloads. */
    setFilters(ws: TosuSocket, filters: Filter[]) {
        ws.data.filters = filters;

        if (filters.length > 0) ws.unsubscribe(this.topic);
        else ws.subscribe(this.topic);
    }

    /**
     * Re-runs a command for every other client as if that client had sent it.
     * `getSettings`/`updateSettings` only reach the overlay they are addressed to.
     */
    redispatch(
        fromId: string,
        command: string,
        overlayName: string,
        payload?: string
    ) {
        if (!this.onMessageCallback) return;

        for (const client of this.clients.values()) {
            if (client.data.id === fromId) continue;

            if (
                (command === 'getSettings' || command === 'updateSettings') &&
                overlayName !== decodeURI(client.data.query.l || '')
            )
                continue;

            this.onMessageCallback(
                [command, overlayName, payload].join(':'),
                client,
                this
            );
        }
    }

    async start(
        pollRateFieldName: ConfigKey,
        stateFunctionName: StateFunctionKey<AbstractInstance>
    ) {
        while (true) {
            try {
                const osuInstance = this.instanceManager.getInstance(
                    this.instanceManager.focusedClient
                );
                if (!osuInstance || this.clients.size === 0) {
                    await sleep(500);
                    continue;
                }

                const buildedData = osuInstance[stateFunctionName](
                    this.instanceManager
                );

                let broadcast: string | null = null;
                for (const client of this.clients.values()) {
                    if (client.data.filters.length > 0) {
                        const values = {};
                        applyFilter(client.data.filters, buildedData, values);

                        client.send(JSON.stringify(values));
                        continue;
                    }

                    broadcast ??= JSON.stringify(buildedData);
                }

                if (broadcast !== null) {
                    this.getServer()?.publish(this.topic, broadcast);
                }
            } catch (error) {
                wLogger.error(
                    'WebSocket data loop failed:',
                    (error as any).message
                );
                wLogger.debug('WebSocket loop error details:', error);
            }

            await sleep(config[pollRateFieldName] as number);
        }
    }
}

/** Single Bun.serve websocket handler that dispatches by endpoint. */
export function createWebsocketHandler(
    endpoints: Record<WsEndpoint, Websocket>
): WebSocketHandler<WsData> {
    return {
        open: (ws) => endpoints[ws.data.endpoint].open(ws),
        message: (ws, message) =>
            endpoints[ws.data.endpoint].message(ws, message),
        close: (ws, code, reason) =>
            endpoints[ws.data.endpoint].close(ws, code, reason)
    };
}
```

- [ ] **Step 4: Rewrite `router/socket.ts` (upgrade handler)**

Replace `packages/server/router/socket.ts` with:

```ts
import { wLogger } from '@tosu/common';

import { getUniqueID } from '../utils/hashing';
import type { HttpServer } from '../utils/http';
import type { WsData, WsEndpoint } from '../utils/socket';

const WS_PATHS: Record<string, WsEndpoint> = {
    '/ws': 'v1',
    '/tokens': 'sc',
    '/websocket/v2': 'v2',
    '/websocket/v2/precise': 'v2precise',
    '/websocket/commands': 'commands'
};

export default function buildSocket(app: HttpServer) {
    app.onUpgrade((request, url, server) => {
        const endpoint = WS_PATHS[url.pathname];
        if (!endpoint) return false;

        try {
            const query: Record<string, string> = {};
            url.searchParams.forEach((value, key) => (query[key] = value));

            const remote = server.requestIP(request);
            const data: WsData = {
                endpoint,
                id: getUniqueID(),
                pathname: url.pathname + url.search,
                query,
                filters: [],
                hostAddress: request.headers.get('host') || '',
                localAddress: `${server.hostname}:${server.port}`,
                originAddress: request.headers.get('origin') || '',
                remoteAddress: remote ? `${remote.address}:${remote.port}` : ''
            };

            return server.upgrade(request, { data });
        } catch (exc) {
            wLogger.error(
                `WebSocket upgrade failed for %${url.pathname}%:`,
                (exc as any).message
            );
            wLogger.debug(`WebSocket upgrade error details:`, exc);

            return false;
        }
    });
}
```

- [ ] **Step 5: Adapt `utils/commands.ts` to `TosuSocket`**

In `packages/server/utils/commands.ts`:

- change `import { type ModifiedWebsocket, Websocket } from './socket';` to `import { type TosuSocket, Websocket } from './socket';`
- change the signature to `export function handleSocketCommands(data: string, socket: TosuSocket, ws: Websocket)`
- replace `socket.pathname` with `socket.data.pathname`
- replace `const overlayFrom = decodeURI(socket.query?.l || '');` with `const overlayFrom = decodeURI(socket.data.query.l || '');`
- in `saveSettings` replace
  ```ts
  ws.socket.emit(
      'message',
      socket.id,
      'updateSettings',
      overlayName,
      payload
  );
  ```
  with
  ```ts
  ws.redispatch(socket.data.id, 'updateSettings', overlayName, payload);
  ```
- in `applyFilters` replace `socket.filters = json;` with `ws.setFilters(socket, json);` and `socket %${socket.id}%` with `socket %${socket.data.id}%`.

`socket.send(...)` stays (same method on `ServerWebSocket`).

- [ ] **Step 6: Run the websocket tests**

```bash
cd packages/server && bun test utils/socket.test.ts utils/filters.test.ts
```

Expected: 8 tests pass.

- [ ] **Step 7: Commit**

```bash
bun run prettier:fix
git add packages/server
git commit -m "feat(server): websocket endpoints on Bun.serve"
```

---

### Task 8: File routes return `Response`

**Files:**
- Create: `packages/server/utils/paths.ts`
- Modify: `packages/server/utils/directories.ts` (full rewrite)
- Modify: `packages/server/scripts/beatmapFile.ts` (full rewrite)
- Modify: `packages/server/router/assets.ts`, `packages/server/router/v1.ts`, `packages/server/router/v2.ts`, `packages/server/router/scApi.ts`
- Create: `packages/server/utils/directories.test.ts`

**Interfaces:**
- Consumes: `TosuRequest`, `HttpServer` (Task 6); `json`, `html`, `getContentType` (`utils/index.ts`); `OVERLAYS_STATIC` (`utils/homepage.ts`); `getStaticPath` (`@tosu/common`).
- Produces:
  - `SERVER_ASSETS_PATH: string`
  - `directoryWalker({ req, baseUrl, pathname, folderPath }): Promise<Response>`
  - `readDirectory(folderPath: string, url: string): Promise<string | Error>`
  - `addCounterMetadata(html: string, filePath: string): string` (unchanged)
  - `beatmapFileShortcut(req: TosuRequest, type: 'audio' | 'background' | 'file'): Response`
  - `buildAssetsApi(app: HttpServer)`, `buildV1Api(app)`, `buildV2Api(app)`, `buildSCApi(app)`

- [ ] **Step 1: Asset path resolution shared by every server module**

Create `packages/server/utils/paths.ts`:

```ts
import fs from 'node:fs';
import path from 'node:path';

// In the rolldown bundle (dist/index.js) and inside the compiled executable the
// dashboard assets are copied next to the bundle. When the sources run directly
// (bun test) fall back to the package's assets folder.
const bundledAssets = path.join(import.meta.dirname, 'assets');

export const SERVER_ASSETS_PATH = fs.existsSync(bundledAssets)
    ? bundledAssets
    : path.resolve(import.meta.dirname, '..', 'assets');
```

- [ ] **Step 2: Write the failing directoryWalker test**

Create `packages/server/utils/directories.test.ts`:

```ts
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import type { TosuRequest } from './http';
import { directoryWalker } from './directories';

let folder: string;

function request(pathname: string, headers: Record<string, string> = {}) {
    return {
        headers: new Headers(headers),
        pathname
    } as unknown as TosuRequest;
}

beforeAll(() => {
    folder = fs.mkdtempSync(path.join(os.tmpdir(), 'tosu-walker-'));
    fs.mkdirSync(path.join(folder, 'overlay'));
    fs.writeFileSync(path.join(folder, 'overlay', 'index.html'), '<h1>hi</h1>');
    fs.writeFileSync(path.join(folder, 'overlay', 'song.mp3'), Buffer.alloc(1000, 7));
});

afterAll(() => {
    fs.rmSync(folder, { recursive: true, force: true });
});

describe('directoryWalker', () => {
    test('serves html with the counter metadata script', async () => {
        const res = await directoryWalker({
            req: request('/overlay/index.html'),
            baseUrl: '/overlay/index.html',
            pathname: 'overlay/index.html',
            folderPath: folder
        });

        expect(res.status).toBe(200);
        expect(res.headers.get('content-type')).toBe('text/html; charset=utf-8');
        expect(await res.text()).toContain('window.COUNTER_PATH=');
    });

    test('redirects a directory without trailing slash', async () => {
        const res = await directoryWalker({
            req: request('/overlay'),
            baseUrl: '/overlay',
            pathname: 'overlay',
            folderPath: folder
        });

        expect(res.status).toBe(301);
        expect(res.headers.get('location')).toBe('/overlay/');
    });

    test('lists a directory with trailing slash', async () => {
        const res = await directoryWalker({
            req: request('/overlay/'),
            baseUrl: '/overlay/',
            pathname: 'overlay',
            folderPath: folder
        });

        expect(res.status).toBe(200);
        expect(await res.text()).toContain('song.mp3');
    });

    test('serves byte ranges for media files', async () => {
        const res = await directoryWalker({
            req: request('/overlay/song.mp3', { range: 'bytes=10-19' }),
            baseUrl: '/overlay/song.mp3',
            pathname: 'overlay/song.mp3',
            folderPath: folder
        });

        expect(res.status).toBe(206);
        expect(res.headers.get('content-range')).toBe('bytes 10-19/1000');
        expect((await res.arrayBuffer()).byteLength).toBe(10);
    });

    test('rejects ranges past the end', async () => {
        const res = await directoryWalker({
            req: request('/overlay/song.mp3', { range: 'bytes=999-2000' }),
            baseUrl: '/overlay/song.mp3',
            pathname: 'overlay/song.mp3',
            folderPath: folder
        });

        expect(res.status).toBe(416);
    });

    test('throws ENOENT for a missing file (mapped to 500/404 by the caller)', async () => {
        await expect(
            directoryWalker({
                req: request('/overlay/nope.png'),
                baseUrl: '/overlay/nope.png',
                pathname: 'overlay/nope.png',
                folderPath: folder
            })
        ).rejects.toMatchObject({ code: 'ENOENT' });
    });
});
```

Run: `cd packages/server && bun test utils/directories.test.ts` — Expected: FAIL (`directoryWalker` still expects `res`).

- [ ] **Step 3: Rewrite `utils/directories.ts`**

Replace `packages/server/utils/directories.ts` with:

```ts
import { getStaticPath, wLogger } from '@tosu/common';
import fs from 'node:fs';
import path from 'node:path';

import { getContentType, html } from '../utils';
import { OVERLAYS_STATIC } from './homepage';
import type { TosuRequest } from './http';

const allowedRangeExtensions = [
    '.mp3',
    '.wav',
    '.ogg',
    '.gif',
    '.webm',
    '.mp4',
    '.avi',
    '.webp'
];

export async function directoryWalker({
    req,
    baseUrl,
    folderPath,
    pathname
}: {
    req: TosuRequest;
    baseUrl: string;
    pathname: string;
    folderPath: string;
}): Promise<Response> {
    let cleanedUrl: string;
    try {
        cleanedUrl = decodeURIComponent(pathname);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
        return new Response('', {
            status: 404,
            headers: { 'Content-Type': getContentType('file.txt') }
        });
    }

    const contentType = getContentType(cleanedUrl);
    const filePath = path.join(folderPath, cleanedUrl);
    const isHTML = filePath.endsWith('.html');

    // Throws ENOENT for missing files; the router maps it to 500 (files API) or 404 (catch-all).
    const stat = await fs.promises.stat(filePath);

    if (stat.isDirectory()) {
        if (!baseUrl.endsWith('/')) {
            return new Response(null, {
                status: 301,
                headers: { Location: baseUrl + '/' }
            });
        }

        const listing = await readDirectory(filePath, baseUrl);
        if (listing instanceof Error) return html('404 Not Found', 404);

        return html(listing);
    }

    if (isHTML) {
        const content = await Bun.file(filePath).text();
        return html(addCounterMetadata(content, filePath));
    }

    const file = Bun.file(filePath);
    const range = req.headers.get('range');
    if (range) {
        const [startText, endText] = range.replace('bytes=', '').split('-');
        const start = parseInt(startText);
        const end = endText ? parseInt(endText) : stat.size - 1;

        if (start >= stat.size || end >= stat.size) {
            return new Response(null, {
                status: 416,
                headers: { 'Content-Range': `bytes */${stat.size}` }
            });
        }

        return new Response(file.slice(start, end + 1), {
            status: 206,
            headers: {
                'Accept-Ranges': 'bytes',
                'Content-Type': contentType,
                'Content-Range': `bytes ${start}-${end}/${stat.size}`,
                'Content-Length': String(end - start + 1)
            }
        });
    }

    const headers: Record<string, string> = {};
    if (contentType) headers['Content-Type'] = contentType;
    if (allowedRangeExtensions.includes(path.extname(pathname))) {
        headers['Accept-Ranges'] = 'bytes';
        headers['Content-Length'] = String(stat.size);
    }

    return new Response(file, { headers });
}

export async function readDirectory(
    folderPath: string,
    url: string
): Promise<string | Error> {
    let folders: string[];
    try {
        folders = await fs.promises.readdir(folderPath);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
        return new Error(`Files not found: ${folderPath}`);
    }

    const list = folders.map((r) => {
        const slashAtTheEnd = getContentType(r) === '' ? '/' : '';

        return `<li><a href="${url === '/' ? '' : url}${encodeURIComponent(r)}${slashAtTheEnd}">${r}</a></li>`;
    });

    return OVERLAYS_STATIC.replace('{OVERLAYS_LIST}', list.join('\n')).replace(
        '{PAGE_URL}',
        `tosu - ${url}`
    );
}

export function addCounterMetadata(html: string, filePath: string) {
    try {
        const staticPath = getStaticPath();

        const counterPath = path
            .dirname(filePath.replace(staticPath, ''))
            .replace(/^(\\\\\\|\\\\|\\|\/|\/\/)/, '')
            .replace(/\\/gm, '/');

        html += `\n\n\n<script>\rwindow.COUNTER_PATH=\`${counterPath}\`\r</script>\n`;

        return html;
    } catch (error) {
        wLogger.error(
            'Failed to add counter metadata:',
            (error as any).message
        );
        wLogger.debug('Counter metadata error details:', error);

        return '';
    }
}
```

The old `_htmlRedirect` branch is dropped: `statSync` threw ENOENT before it could ever run, so the observable behaviour (404 from the catch-all route) is unchanged.

- [ ] **Step 4: Rewrite `scripts/beatmapFile.ts`**

Replace `packages/server/scripts/beatmapFile.ts` with:

```ts
import fs from 'node:fs';
import path from 'node:path';

import type { TosuRequest } from '../utils/http';
import { json } from '../utils/index';

export function beatmapFileShortcut(
    req: TosuRequest,
    beatmapFileType: 'audio' | 'background' | 'file'
): Response {
    const osuInstance = req.instanceManager.getInstance(
        req.instanceManager.focusedClient
    );
    if (!osuInstance) {
        throw new Error('osu is not ready/running');
    }

    const { global, menu } = osuInstance.getServices(['global', 'menu']);
    if (
        (global.gameFolder === '' && global.skinFolder === '') ||
        (global.gameFolder == null && global.skinFolder == null)
    ) {
        throw new Error('osu is not ready/running');
    }

    const folder = path.join(global.songsFolder, menu.folder || '');
    let fileName = '';
    let fileMimetype = '';

    if (beatmapFileType === 'audio') {
        fileName = menu.audioFilename;
        fileMimetype = menu.audioFileMimetype;
    } else if (beatmapFileType === 'background') {
        fileName = menu.backgroundFilename;
        fileMimetype = menu.backgroundFileMimetype;
    } else if (beatmapFileType === 'file') {
        fileName = menu.filename;
        fileMimetype = 'text/plain; charset=utf-8';
    } else {
        return json({ error: 'Unknown file type' });
    }

    if (!folder || !fileName) {
        return new Response(null, { status: 404 });
    }

    const filePath = path.join(folder, fileName);
    if (!fs.existsSync(filePath)) {
        return new Response(null, {
            status: 404,
            headers: { 'Content-Type': fileMimetype }
        });
    }

    const fileStat = fs.statSync(filePath);
    if (!fileStat.isFile()) {
        return new Response(null, {
            status: 404,
            headers: { 'Content-Type': fileMimetype }
        });
    }

    const file = Bun.file(filePath);
    const range = req.headers.get('range');
    if (range) {
        const [startText, endText] = range.replace('bytes=', '').split('-');
        const start = parseInt(startText);
        const end = endText ? parseInt(endText) : fileStat.size - 1;

        if (start >= fileStat.size || end >= fileStat.size) {
            return new Response(null, {
                status: 416,
                headers: { 'Content-Range': `bytes */${fileStat.size}` }
            });
        }

        return new Response(file.slice(start, end + 1), {
            status: 206,
            headers: {
                'Accept-Ranges': 'bytes',
                'Content-Type': fileMimetype,
                'Content-Range': `bytes ${start}-${end}/${fileStat.size}`,
                'Content-Length': String(end - start + 1)
            }
        });
    }

    return new Response(file, {
        headers: {
            'Accept-Ranges': 'bytes',
            'Content-Type': fileMimetype,
            'Content-Length': String(fileStat.size)
        }
    });
}
```

- [ ] **Step 5: Rewrite the small routers**

Replace `packages/server/router/assets.ts` with:

```ts
import { wLogger } from '@tosu/common';
import path from 'node:path';

import { getContentType } from '../utils';
import type { HttpServer } from '../utils/http';
import { SERVER_ASSETS_PATH } from '../utils/paths';

export default function buildAssetsApi(app: HttpServer) {
    app.route(/^\/assets\/(?<filePath>.*)/, 'GET', async (req) => {
        const file = Bun.file(path.join(SERVER_ASSETS_PATH, req.params.filePath));

        if (!(await file.exists())) {
            wLogger.debug(
                `Asset retrieval error for %${req.params.filePath}%: not found`
            );

            return new Response('<html>page not found</html>', {
                status: 404,
                headers: { 'Content-Type': 'text/html' }
            });
        }

        return new Response(file, {
            headers: { 'Content-Type': getContentType(req.params.filePath) }
        });
    });
}
```

Replace `packages/server/router/v1.ts` with:

```ts
import type { HttpServer } from '../utils/http';
import { directoryWalker } from '../utils/directories';

export default function buildV1Api(app: HttpServer) {
    app.route(/^\/Songs\/(?<filePath>.*)/, 'GET', (req) => {
        const url = req.pathname || '/';
        const osuInstance = req.instanceManager.getInstance(
            req.instanceManager.focusedClient
        );
        if (!osuInstance) {
            throw new Error('osu is not ready/running');
        }

        const global = osuInstance.get('global');
        if (!global || global.songsFolder === '') {
            throw new Error('osu is not ready/running');
        }

        return directoryWalker({
            req,
            baseUrl: url,
            pathname: req.params.filePath,
            folderPath: global.songsFolder
        });
    });
}
```

Replace `packages/server/router/scApi.ts` with:

```ts
import { beatmapFileShortcut } from '../scripts/beatmapFile';
import { json } from '../utils';
import type { HttpServer } from '../utils/http';

export default function buildSCApi(app: HttpServer) {
    app.route('/json/sc', 'GET', (req) => {
        const osuInstance = req.instanceManager.getInstance(
            req.instanceManager.focusedClient
        );
        if (!osuInstance) {
            throw new Error('osu is not ready/running');
        }

        return json(osuInstance.getStateSC(req.instanceManager));
    });

    app.route('/backgroundImage', 'GET', (req) =>
        beatmapFileShortcut(req, 'background')
    );
}
```

Replace `packages/server/router/v2.ts` with:

```ts
import { ClientType } from '@tosu/common';
import path from 'node:path';

import { beatmapFileShortcut } from '../scripts/beatmapFile';
import { json } from '../utils';
import { directoryWalker } from '../utils/directories';
import type { HttpServer } from '../utils/http';

export default function buildV2Api(app: HttpServer) {
    app.route('/json/v2', 'GET', (req) => {
        const osuInstance = req.instanceManager.getInstance(
            req.instanceManager.focusedClient
        );
        if (!osuInstance) {
            throw new Error('osu is not ready/running');
        }

        return json(osuInstance.getStateV2(req.instanceManager));
    });

    app.route('/json/v2/precise', 'GET', (req) => {
        const osuInstance = req.instanceManager.getInstance(
            req.instanceManager.focusedClient
        );
        if (!osuInstance) {
            throw new Error('osu is not ready/running');
        }

        return json(osuInstance.getPreciseData(req.instanceManager));
    });

    app.route(
        /\/files\/beatmap\/(?<type>background|audio|file)/,
        'GET',
        (req) => beatmapFileShortcut(req, req.params.type as any)
    );

    app.route(/^\/files\/beatmap\/(?<filePath>.*)/, 'GET', (req) => {
        const url = req.pathname || '/';
        const osuInstance = req.instanceManager.getInstance(
            req.instanceManager.focusedClient
        );
        if (!osuInstance) {
            throw new Error('osu is not ready/running');
        }
        const global = osuInstance.get('global');
        if (!global || global.songsFolder === '') {
            throw new Error('osu is not ready/running');
        }

        return directoryWalker({
            req,
            baseUrl: url,
            pathname: req.params.filePath,
            folderPath: global.songsFolder
        });
    });

    app.route(/^\/files\/skin\/(?<filePath>.*)/, 'GET', (req) => {
        const url = req.pathname || '/';

        const osuInstance = req.instanceManager.getInstance(
            req.instanceManager.focusedClient
        );
        if (!osuInstance) {
            throw new Error('osu is not ready/running');
        }

        const global = osuInstance.get('global');
        if (
            !global ||
            (global.gameFolder === '' && global.skinFolder === '') ||
            (global.gameFolder == null && global.skinFolder == null)
        ) {
            throw new Error('osu is not ready/running');
        }

        // The lazer internal folder structure does not contain a "skins" folder, so we can't parse them.
        // https://osu.ppy.sh/wiki/en/Client/Release_stream/Lazer/File_storage
        if (global.game.client === ClientType.lazer) {
            throw new Error(
                'This endpoint is unavailable for the lazer client.'
            );
        }

        const folder = path.join(global.gameFolder, 'Skins', global.skinFolder);
        return directoryWalker({
            req,
            baseUrl: url,
            pathname: req.params.filePath,
            folderPath: folder
        });
    });
}
```

- [ ] **Step 6: Run the tests**

```bash
cd packages/server && bun test utils/directories.test.ts
```

Expected: 6 tests pass.

- [ ] **Step 7: Commit**

```bash
bun run prettier:fix
git add packages/server
git commit -m "feat(server): file routes return Response"
```

---

### Task 9: Dashboard, API routes and updater on `Bun.serve`

**Files:**
- Modify: `packages/server/utils/counters.ts:1-38` (imports), `:416-577` (`buildLocalCounters`, `buildExternalCounters`), `:578-985` (tails of `buildSettings`, `buildInstructionLocal`, `buildEmptyPage`)
- Modify: `packages/server/utils/report.ts:139-147`
- Modify: `packages/server/router/index.ts` (full rewrite)
- Modify: `packages/updater/index.ts` (full rewrite)

**Interfaces:**
- Consumes: `TosuRequest`, `HttpServer`, `json`, `html`, `SERVER_ASSETS_PATH`, `directoryWalker` (Tasks 6–8); `Websocket.redispatch` (Task 7); `Server` class fields `app`, `WS_COMMANDS` (Task 10 keeps these names).
- Produces:
  - `buildLocalCounters(address: string | undefined, query?: string): Promise<Response>`
  - `buildExternalCounters(address: string | undefined, query?: string): Promise<Response>`
  - `buildSettings(): Promise<Response>`, `buildInstructionLocal(): Promise<Response>`, `buildEmptyPage(): Promise<Response>`
  - `autoUpdater(from: 'server' | 'startup'): Promise<UpdateResult | Error>` where `type UpdateResult = { status: 'updated' | 'up-to-date' | 'noFiles' | 'unverified' }`
  - `buildBaseApi(server: Server)` registering all dashboard/API routes.

- [ ] **Step 1: `counters.ts` — imports and the shared homepage renderer**

At the top of `packages/server/utils/counters.ts` remove `import http from 'http';` and `const pkgAssetsPath = path.join(import.meta.dirname, 'assets');`, change `import { getContentType } from '../utils';` to `import { html } from '../utils';` and add `import { SERVER_ASSETS_PATH } from './paths';`. Then add after the imports:

```ts
async function renderHomepage(
    list: string,
    amounts: { local?: string; available?: string; search?: string } = {}
): Promise<Response> {
    let content: string;
    try {
        content = await Bun.file(
            path.join(SERVER_ASSETS_PATH, 'homepage.html')
        ).text();
    } catch (err) {
        wLogger.debug('Failed to read homepage.html:', err);
        return html('<html>page not found</html>', 404);
    }

    let page = content
        .replace('{{LOCAL_AMOUNT}}', amounts.local ?? '')
        .replace('{{AVAILABLE_AMOUNT}}', amounts.available ?? '')
        .replace('{{SEARCH}}', amounts.search ?? '')
        .replace('{{LIST}}', list);
    if (semver.gt(context.updateVersion, context.currentVersion)) {
        page = page
            .replace('{OLD}', context.currentVersion)
            .replace('{NEW}', context.updateVersion)
            .replace('hidden update-available', 'update-available');
    }

    return html(page);
}
```

- [ ] **Step 2: `counters.ts` — builders return `Response`**

Replace `buildLocalCounters` (lines 416–471) with:

```ts
export async function buildLocalCounters(
    address: string | undefined,
    query?: string
): Promise<Response> {
    const array = getLocalCounters();
    const build = rebuildJSON({
        array,
        address,
        external: false,
        query
    });

    if (query != null) return html(build || emptyCounters);

    return renderHomepage(build || emptyNotice, {
        local: ` (${array.length})`,
        available: '',
        search: searchBar
    });
}
```

Replace `buildExternalCounters` (lines 473–576) with:

```ts
export async function buildExternalCounters(
    address: string | undefined,
    query?: string
): Promise<Response> {
    let text = '';
    let totalLocal = 0;
    let totalAvailable = 0;

    try {
        const request = await fetch('https://tosu.app/api.json', {
            headers: {
                'User-Agent': `tosu/${context.currentVersion} (https://tosu.app; i@kotrik.ru)`
            }
        });
        const json = (await request.json()) as ICounter[];

        const exists = getLocalCounters();
        const array = json.map((r) => {
            const find = exists.find(
                (s) => s.name === r.name && s.author === r.author
            );

            if (
                r.version &&
                find &&
                r.version.toString().toLowerCase() !==
                    find.version.toString().toLowerCase()
            )
                r._updatable = true;

            if (find) r._downloaded = true;
            return r;
        });

        const build = rebuildJSON({
            array,
            address,
            external: true,
            query
        });

        if (query != null) return html(build || emptyCounters);

        text = build;

        totalLocal = exists.length;
        totalAvailable = json.length;
    } catch (error) {
        wLogger.error(
            'Failed to build external counters:',
            (error as Error).message
        );
        wLogger.debug('External counters build error details:', error);

        if (query != null) {
            return html((error as any).message || emptyCounters);
        }

        text = `Error: ${(error as any).message}`;
    }

    return renderHomepage(text || noMoreCounters, {
        local: ` (${totalLocal})`,
        available: ` (${totalAvailable})`,
        search: searchBar
    });
}
```

In `buildSettings`: change the signature to `export async function buildSettings(): Promise<Response> {`, keep the whole template body, and replace the final `fs.readFile(path.join(pkgAssetsPath, 'homepage.html'), 'utf8', (err, content) => { … });` block (from `fs.readFile(` to its closing `);`) with:

```ts
    return renderHomepage(settingsPage);
```

In `buildInstructionLocal`: signature `export async function buildInstructionLocal(): Promise<Response> {`, keep `pageContent`, replace the `fs.readFile(...)` block with:

```ts
    return renderHomepage(pageContent);
```

In `buildEmptyPage`: signature `export async function buildEmptyPage(): Promise<Response> {`, replace the whole body with:

```ts
    return renderHomepage('');
```

- [ ] **Step 3: `report.ts` asset path**

In `packages/server/utils/report.ts` replace `const pkgAssetsPath = path.join(import.meta.dirname, 'assets');` with `import { SERVER_ASSETS_PATH } from './paths';` (placed with the other relative imports) and change the `readFile` call to `path.join(SERVER_ASSETS_PATH, 'report.html')`.

- [ ] **Step 4: Rewrite the updater**

Replace `packages/updater/index.ts` with:

```ts
import {
    context,
    downloadFile,
    getProgramPath,
    platformResolver,
    sleep,
    unzip,
    verifyDownload,
    wLogger
} from '@tosu/common';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

export type UpdateResult = {
    status: 'updated' | 'up-to-date' | 'noFiles' | 'unverified';
};

const platform = platformResolver(process.platform);

const updateArchivePath = path.join(getProgramPath(), 'update.zip');
const backupExecutablePath = path.join(
    getProgramPath(),
    `tosu_old${platform.fileType}`
);
const executablePath = path.join(getProgramPath(), `tosu${platform.fileType}`);

const deleteNotLocked = async (filePath: string) => {
    try {
        await fs.promises.unlink(filePath);
    } catch (err) {
        if ((err as any).code === 'EPERM') {
            await sleep(1000);
            deleteNotLocked(filePath);
            return;
        }

        wLogger.error('Failed to delete unlocked file', (err as any).message);
        wLogger.debug('Delete failure details', err);
    }
};

export const checkUpdates = async (from: 'autoUpdater' | 'startup') => {
    wLogger.info('Checking for updates...');

    try {
        if (from === 'startup') {
            if (fs.existsSync(updateArchivePath)) {
                await deleteNotLocked(updateArchivePath);
            }

            if (fs.existsSync(backupExecutablePath)) {
                await deleteNotLocked(backupExecutablePath);
            }
        }

        if (platform.type === 'unknown') {
            wLogger.warn(
                `Unsupported platform (%${process.platform}%). Unable to run updater`
            );

            return new Error(
                `Unsupported platform (${process.platform}). Unable to run updater`
            );
        }

        const request = await fetch(
            `https://api.github.com/repos/tosuapp/tosu/releases/latest`
        );
        const json = (await request.json()) as any;
        const {
            assets,
            name: versionName
        }: {
            name: string;
            assets: {
                name: string;
                digest: `${string}:${string}`;
                browser_download_url: string;
            }[];
        } = json;

        context.updateVersion = versionName || context.currentVersion;

        if (versionName === null || versionName === undefined) {
            wLogger.info(
                `Failed to check updates for version %v${context.currentVersion}%`
            );

            return new Error('Version the same');
        }

        if (from === 'startup') {
            if (
                versionName.includes(context.currentVersion) ||
                context.currentVersion.includes('-forced')
            )
                wLogger.info(
                    `You're using the latest version (%v${context.currentVersion}%)`
                );
            else
                wLogger.warn(
                    `Update available: %v${context.currentVersion}% => %v${context.updateVersion}%`
                );
        }

        return { assets, versionName };
    } catch (exc) {
        wLogger.error(`Update check failed:`, (exc as any).message);
        wLogger.debug(`Update check error details:`, exc);

        context.updateVersion = context.currentVersion;

        return exc as Error;
    }
};

/** Spawns the freshly unpacked executable with the same arguments and exits. */
async function restartProcess() {
    wLogger.info('Restarting program to apply updates...');

    if (platform.type === 'linux') {
        const stats = await fs.promises.stat(backupExecutablePath);
        await fs.promises.chmod(executablePath, stats.mode).catch(() => null);
    }

    // shell + detached: the new console app gets its own window and outlives this process.
    spawn(`"${executablePath}"`, process.argv.slice(1), {
        detached: true,
        shell: true,
        stdio: 'ignore'
    }).unref();

    wLogger.info('Closing program...');

    await sleep(1000);

    process.exit();
}

export const autoUpdater = async (
    from: 'server' | 'startup'
): Promise<UpdateResult | Error> => {
    try {
        const check = await checkUpdates('autoUpdater');
        if (check instanceof Error) {
            return check;
        }

        const { assets, versionName } = check;
        if (
            versionName.includes(context.currentVersion) ||
            context.currentVersion.includes('-forced')
        ) {
            wLogger.info(
                `You're using the latest version (%v${context.currentVersion}%)`
            );

            if (fs.existsSync(updateArchivePath)) {
                await deleteNotLocked(updateArchivePath);
            }

            if (fs.existsSync(backupExecutablePath)) {
                await deleteNotLocked(backupExecutablePath);
            }

            return { status: 'up-to-date' };
        }

        const findAsset = assets.find(
            (r) => r.name.includes(platform.type) && r.name.endsWith('.zip')
        );
        if (!findAsset) {
            wLogger.info(
                `Update files not found for platform (%${platform.type}%)`
            );
            return { status: 'noFiles' };
        }

        await downloadFile(findAsset.browser_download_url, updateArchivePath);

        const verify = await verifyDownload(
            findAsset.digest,
            updateArchivePath
        );
        if (verify === false) {
            await fs.promises.rm(updateArchivePath);
            return { status: 'unverified' };
        }

        await fs.promises.rename(process.execPath, backupExecutablePath);
        await unzip(updateArchivePath, getProgramPath());

        if (from === 'startup') {
            await restartProcess();
            return { status: 'updated' };
        }

        // Let the HTTP response reach the dashboard before the process goes away.
        setTimeout(() => {
            restartProcess().catch((exc) => {
                wLogger.error('Restart failed:', (exc as any).message);
                wLogger.debug('Restart error details:', exc);
            });
        }, 100);

        return { status: 'updated' };
    } catch (exc) {
        wLogger.error('Auto-update failed:', (exc as any).message);
        wLogger.debug('Auto-update error details:', exc);

        return exc as Error;
    }
};
```

- [ ] **Step 5: Rewrite `router/index.ts`**

Replace `packages/server/router/index.ts` with:

```ts
import {
    type ConfigBinding,
    ConfigManager,
    JsonSafeParse,
    downloadFile,
    getCachePath,
    getProgramPath,
    getStaticPath,
    platformResolver,
    unzip,
    wLogger
} from '@tosu/common';
import { autoUpdater } from '@tosu/updater';
import { exec } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import rosu from 'rosu-pp-js';

import type { Server } from '../index';
import { html, json } from '../utils';
import {
    buildEmptyPage,
    buildExternalCounters,
    buildInstructionLocal,
    buildLocalCounters,
    buildSettings,
    getLocalCounters,
    saveSettings
} from '../utils/counters';
import { type ISettings } from '../utils/counters.types';
import { directoryWalker } from '../utils/directories';
import type { TosuRequest } from '../utils/http';
import { parseCounterSettings } from '../utils/parseSettings';
import { SERVER_ASSETS_PATH } from '../utils/paths';
import {
    type Report,
    generateReport,
    generateReportHTML
} from '../utils/report';

const execAsync = promisify(exec);

function requestAddress(req: TosuRequest) {
    const host = req.headers.get('host');
    const referer = req.headers.get('referer');

    return new URL(
        host ? `http://${host}/` : referer || `http://${req.remoteAddress}/`
    );
}

export default function buildBaseApi(server: Server) {
    server.app.route('/json', 'GET', (req) => {
        const osuInstance = req.instanceManager.getInstance(
            req.instanceManager.focusedClient
        );
        if (!osuInstance) {
            throw new Error('osu is not ready/running');
        }

        return json(osuInstance.getState(req.instanceManager));
    });

    server.app.route(
        /^\/api\/counters\/search\/(?<query>.*)/,
        'GET',
        (req) => {
            const query = decodeURI(req.params.query)
                .replace(/[^a-z0-9A-Z]/, '')
                .toLowerCase();

            const parseAddress = requestAddress(req);
            const parseReferer = new URL(
                req.headers.get('referer') || `http://${req.remoteAddress}/`
            );
            if (parseReferer.pathname === `/available`) {
                return buildExternalCounters(parseAddress.hostname, query);
            }

            return buildLocalCounters(parseAddress.hostname, query);
        }
    );

    server.app.route(
        /^\/api\/counters\/download\/(?<url>.*)/,
        'GET',
        async (req) => {
            const folderName = req.query.name;
            if (!folderName) {
                return json({ error: 'no folder name' });
            }

            const cacheFolder = getCachePath();
            const staticPath = getStaticPath();
            const folderPath = path.join(staticPath, decodeURI(folderName));

            const tempPath = path.join(cacheFolder, `${Date.now()}.zip`);

            if (fs.existsSync(folderPath) && req.query.update !== 'true') {
                return json({ error: 'Folder already exist' });
            }

            if (!fs.existsSync(cacheFolder)) fs.mkdirSync(cacheFolder);

            let result: string;
            try {
                result = await downloadFile(req.params.url, tempPath);
            } catch (reason) {
                wLogger.error(
                    `Failed to download counter %${folderName}%:`,
                    (reason as Error).message
                );
                wLogger.debug(`Counter download error details:`, reason);

                return json({ error: (reason as Error).message });
            }

            try {
                await unzip(result, folderPath);
            } catch (reason) {
                fs.unlinkSync(tempPath);

                wLogger.error(
                    `Failed to unzip counter %${folderName}%:`,
                    (reason as Error).message
                );
                wLogger.debug('Counter unzip error details:', reason);

                return json({ error: (reason as Error).message });
            }

            wLogger.info(
                `PP Counter %${folderName}% downloaded successfully (%${req.headers.get('referer')}%)`
            );
            fs.unlinkSync(tempPath);

            server.WS_COMMANDS.redispatch('unzip', 'getOverlays', `__ingame__`);

            return json({ status: 'Finished', path: result });
        }
    );

    server.app.route(
        /^\/api\/counters\/open\/(?<name>.*)/,
        'GET',
        async (req) => {
            const folderName = req.params.name;
            if (!folderName) {
                return json({ error: 'no folder name' });
            }

            const staticPath = getStaticPath();
            let folderPath = path.join(staticPath, decodeURI(folderName));
            if (folderName === 'tosu.exe') folderPath = getProgramPath();
            else if (folderName === 'static.exe') folderPath = getStaticPath();

            if (!fs.existsSync(folderPath)) {
                return json({ error: "Folder doesn't exists" });
            }

            wLogger.info(
                `Opening PP Counter folder: %${folderName}% (%${req.headers.get('referer')}%)`
            );

            const platform = platformResolver(process.platform);
            try {
                await execAsync(`${platform.command} "${folderPath}"`, {
                    windowsHide: true
                });
            } catch (err) {
                wLogger.error(
                    `Failed to open folder %${folderName}%:`,
                    (err as Error).message
                );
                wLogger.debug('Folder open error details:', err);

                return json({
                    error: `Error opening folder: ${(err as Error).message}`
                });
            }

            return json({ status: 'opened' });
        }
    );

    server.app.route(
        /^\/api\/counters\/delete\/(?<name>.*)/,
        'GET',
        (req) => {
            const folderName = req.params.name;
            if (!folderName) {
                return json({ error: 'no folder name' });
            }

            const staticPath = getStaticPath();
            const folderPath = path.join(staticPath, decodeURI(folderName));

            if (!fs.existsSync(folderPath)) {
                return json({ error: "Folder doesn't exists" });
            }

            wLogger.info(
                `PP Counter removed: %${folderName}% (%${req.headers.get('referer')}%)`
            );

            fs.rmSync(folderPath, { recursive: true, force: true });

            server.WS_COMMANDS.redispatch('remove', 'getOverlays', `__ingame__`);

            return json({ status: 'deleted' });
        }
    );

    server.app.route(
        /^\/api\/counters\/settings\/(?<name>.*)/,
        'GET',
        (req) => {
            const folderName = req.params.name;
            if (!folderName) {
                return json({ error: 'No folder name' });
            }

            const settings = parseCounterSettings(folderName, 'parse');
            if (settings instanceof Error) {
                wLogger.debug(
                    `Failed to parse settings for %${folderName}%:`,
                    settings
                );

                return json({ error: settings.message });
            }

            wLogger.info(
                `Settings accessed for %${folderName}% (%${req.headers.get('referer')}%)`
            );

            return json(settings);
        }
    );

    server.app.route(
        /^\/api\/counters\/settings\/(?<name>.*)/,
        'POST',
        (req) => {
            const body: ISettings[] | Error = JsonSafeParse({
                isFile: false,
                payload: req.body,
                defaultValue: new Error('Failed to parse body')
            });
            if (body instanceof Error) throw body;

            const folderName = req.params.name;
            if (!folderName) {
                return json({ error: 'no folder name' });
            }

            if (req.query.update === 'yes') {
                const result = parseCounterSettings(
                    folderName,
                    'dev/save',
                    body as any
                );
                if (result instanceof Error) {
                    wLogger.debug(
                        `Failed to update settings for %${folderName}%:`,
                        result
                    );

                    return json({ error: result.message });
                }

                wLogger.info(
                    `Settings re-created for %${folderName}% (%${req.headers.get('referer')}%)`
                );

                fs.writeFileSync(
                    result.settingsPath!,
                    JSON.stringify(result.settings),
                    'utf8'
                );

                return json({ result: 'success' });
            }

            wLogger.info(
                `Settings saved for %${folderName}% (%${req.headers.get('referer')}%)`
            );

            const saved = saveSettings(folderName, body as any);
            if (saved instanceof Error) {
                wLogger.debug(
                    `Failed to save settings for %${folderName}%:`,
                    saved
                );

                return json({ error: saved.message });
            }

            server.WS_COMMANDS.redispatch(
                'save settings',
                'getSettings',
                folderName
            );

            return json({ result: 'success' });
        }
    );

    server.app.route('/api/runUpdates', 'GET', async () => {
        const result = await autoUpdater('server');
        if (result instanceof Error) return json({ status: result.message });

        return json({ status: result.status });
    });

    server.app.route('/api/settingsSave', 'POST', (req) => {
        const body: Record<ConfigBinding, string> | Error = JsonSafeParse({
            isFile: false,
            payload: req.body,
            defaultValue: new Error('Failed to parse body')
        });
        if (body instanceof Error) throw body;

        ConfigManager.refreshConfig(body, true);
        return json({ status: 'updated' });
    });

    server.app.route('/api/calculate/pp', 'GET', (req) => {
        const query = req.query;

        const osuInstance = req.instanceManager.getInstance(
            req.instanceManager.focusedClient
        );
        if (!osuInstance) {
            throw new Error('osu is not ready/running');
        }

        const { global, menu, beatmapPP } = osuInstance.getServices([
            'global',
            'menu',
            'beatmapPP'
        ]);

        let beatmap: rosu.Beatmap;
        const exists = fs.existsSync(query.path);
        if (exists) {
            const beatmapFilePath = path.join(
                global.songsFolder,
                menu.folder,
                menu.filename
            );

            const beatmapContent = fs.readFileSync(beatmapFilePath, 'utf8');
            beatmap = new rosu.Beatmap(beatmapContent);
        } else {
            const beatmapContent: string | undefined = beatmapPP.beatmapContent;
            if (!beatmapContent) {
                throw new Error('No beatmap currently playing');
            }

            beatmap = new rosu.Beatmap(beatmapContent);
        }

        if (query.mode !== undefined) {
            beatmap.convert(Number.parseInt(query.mode));
        }

        const params: rosu.PerformanceArgs = {};

        if (query.ar !== undefined) params.ar = +query.ar;
        if (query.cs !== undefined) params.cs = +query.cs;
        if (query.hp !== undefined) params.hp = +query.hp;
        if (query.od !== undefined) params.od = +query.od;

        if (query.clockRate !== undefined) params.clockRate = +query.clockRate;
        if (query.passedObjects !== undefined)
            params.passedObjects = +query.passedObjects;
        if (query.combo !== undefined) params.combo = +query.combo;
        if (query.nMisses !== undefined) params.misses = +query.nMisses;
        if (query.n100 !== undefined) params.n100 = +query.n100;
        if (query.n300 !== undefined) params.n300 = +query.n300;
        if (query.n50 !== undefined) params.n50 = +query.n50;
        if (query.nGeki !== undefined) params.nGeki = +query.nGeki;
        if (query.nKatu !== undefined) params.nKatu = +query.nKatu;
        if (query.mods !== undefined) params.mods = +query.mods;
        if (query.acc !== undefined) params.accuracy = +query.acc;
        if (query.sliderEndHits !== undefined)
            params.sliderEndHits = +query.sliderEndHits;
        if (query.smallTickHits !== undefined)
            params.smallTickHits = +query.smallTickHits;
        if (query.largeTickHits !== undefined)
            params.largeTickHits = +query.largeTickHits;
        if (query.hitresultPriority !== undefined)
            params.hitresultPriority = +query.hitresultPriority;

        const calculate = new rosu.Performance(params).calculate(beatmap);
        const response = json(calculate);

        beatmap.free();
        calculate.free();

        return response;
    });

    server.app.route('/api/generateReport', 'GET', async (req) => {
        let report: Report;
        try {
            report = await generateReport(req.instanceManager);
        } catch (err) {
            return new Response(
                `Server Error: ${(err as Error).message || 'Unknown error'}`,
                {
                    status: 500,
                    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
                }
            );
        }

        // Report streaming can outlive the 30 s idle timeout.
        server.app.server?.timeout(req.raw, 0);

        const encoder = new TextEncoder();
        const generator = generateReportHTML(report);
        const stream = new ReadableStream<Uint8Array>({
            async pull(controller) {
                const { value, done } = await generator.next();
                if (done) {
                    controller.close();
                    return;
                }

                controller.enqueue(encoder.encode(value));
            },
            cancel() {
                wLogger.warn('Report download cancelled by the client');
                generator.return(undefined);
            }
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/html; charset=utf-8',
                'Content-Disposition': `attachment; filename="${encodeURIComponent(`tosu-report-${report.date.getTime()}.html`)}"`
            }
        });
    });

    server.app.route(/\/api\/ingame/, 'GET', async () => {
        let content: string;
        try {
            content = await Bun.file(
                path.join(SERVER_ASSETS_PATH, 'ingame.html')
            ).text();
        } catch (err) {
            wLogger.debug(`Failed to read ingame.html:`, err);

            return new Response(
                `Server Error: ${(err as NodeJS.ErrnoException).code}`,
                { status: 500 }
            );
        }

        const counters = getLocalCounters();
        content += `\n\n\n<script>\rwindow.COUNTERS = ${JSON.stringify(counters)}\r</script>\n`;

        return html(content);
    });

    server.app.route('/favicon.ico', 'GET', async () => {
        const file = Bun.file(path.join(SERVER_ASSETS_PATH, 'favicon.ico'));
        if (!(await file.exists())) {
            wLogger.debug(`Failed to read favicon.ico: not found`);

            return new Response('<html>page not found</html>', {
                status: 404,
                headers: { 'Content-Type': 'text/html' }
            });
        }

        return new Response(file, {
            headers: {
                'Content-Type': 'image/vnd.microsoft.icon; charset=utf-8'
            }
        });
    });

    server.app.route(/.*/, 'GET', async (req) => {
        const url = req.pathname || '/';
        try {
            if (url.startsWith(`/.well-know`)) {
                return new Response(null, {
                    status: 404,
                    statusText: 'Not Found'
                });
            }

            if (url === '/') {
                return buildLocalCounters(requestAddress(req).hostname);
            }

            if (url === '/settings') {
                if (req.query.overlay) return buildEmptyPage();
                return buildSettings();
            }
            if (url === '/local-overlays') return buildInstructionLocal();
            if (url === '/available') {
                return buildExternalCounters(requestAddress(req).hostname);
            }

            const staticPath = getStaticPath();

            const extension = path.extname(url);

            // ignore empty and one letter extension (extension returned with .)
            if (extension.length < 3 && !url.endsWith('/')) {
                return new Response(null, {
                    status: 301,
                    headers: { Location: url + '/' }
                });
            }

            const selectIndexHTML = url.endsWith('/')
                ? url + 'index.html'
                : url;
            return await directoryWalker({
                req,
                baseUrl: url,
                pathname: selectIndexHTML,
                folderPath: staticPath
            });
        } catch (error) {
            wLogger.warn(
                `Failed to process request for %${url}%:`,
                (error as Error).message
            );
            wLogger.debug(`Request error details for %${url}%:`, error);

            return new Response((error as Error).message || '', {
                status: 404
            });
        }
    });
}
```

- [ ] **Step 6: Typecheck the touched files by loading them**

```bash
cd packages/server && bun -e "await import('./router/index.ts'); await import('./utils/counters.ts'); console.log('ok')"
```

Expected: `ok` (no import/syntax errors). Route behaviour is verified end to end in Task 10's tests.

- [ ] **Step 7: Commit**

```bash
bun run prettier:fix
git add packages/server packages/updater
git commit -m "feat(server): dashboard and api routes on Bun.serve"
```

---

### Task 10: Wire `Server` on `Bun.serve` and drop `ws`

**Files:**
- Modify: `packages/server/index.ts` (full rewrite)
- Modify: `packages/server/package.json`
- Create: `packages/server/index.test.ts`

**Interfaces:**
- Consumes: `HttpServer`, `Websocket`, `createWebsocketHandler`, `buildSocket`, `buildAssetsApi`, `buildV1Api`, `buildSCApi`, `buildV2Api`, `buildBaseApi`, `handleSocketCommands` (Tasks 6–9).
- Produces: `class Server { instanceManager; app: HttpServer; WS_V1, WS_SC, WS_V2, WS_V2_PRECISE, WS_COMMANDS: Websocket; constructor({ instanceManager }); start(): void; restart(): Promise<void>; handleConfigUpdate(oldConfig: GlobalConfig): void }` — same public surface `packages/tosu/src/index.ts` already uses.

- [ ] **Step 1: Write the failing integration test**

Create `packages/server/index.test.ts`:

```ts
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { config, context } from '@tosu/common';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { InstanceManager } from 'tosu/instances/manager';

import { Server } from './index';

const instanceManager = {
    focusedClient: 0,
    osuInstances: {},
    getInstance: () => undefined
} as unknown as InstanceManager;

let server: Server;
let base: string;
let staticFolder: string;

beforeAll(() => {
    staticFolder = fs.mkdtempSync(path.join(os.tmpdir(), 'tosu-static-'));
    config.staticFolderPath = staticFolder;
    config.serverIP = '127.0.0.1';
    config.serverPort = 0;
    config.openDashboardOnStartup = false;
    context.currentVersion = '4.26.0';
    context.updateVersion = '4.26.0';

    server = new Server({ instanceManager });
    server.start();
    base = `http://127.0.0.1:${server.app.server!.port}`;
});

afterAll(async () => {
    await server.app.stop();
    fs.rmSync(staticFolder, { recursive: true, force: true });
});

describe('Server', () => {
    test('/json without a running osu! is a 500 JSON error', async () => {
        const res = await fetch(`${base}/json`);

        expect(res.status).toBe(500);
        expect(await res.json()).toEqual({ error: 'osu is not ready/running' });
    });

    test('/favicon.ico is served from the embedded assets', async () => {
        const res = await fetch(`${base}/favicon.ico`);

        expect(res.status).toBe(200);
        expect(res.headers.get('content-type')).toBe(
            'image/vnd.microsoft.icon; charset=utf-8'
        );
    });

    test('/assets/* serves dashboard files', async () => {
        const res = await fetch(`${base}/assets/homepage.js`);

        expect(res.status).toBe(200);
        expect(res.headers.get('content-type')).toBe(
            'text/javascript; charset=utf-8'
        );
    });

    test('/ renders the homepage with the counters list', async () => {
        const res = await fetch(`${base}/`);
        const body = await res.text();

        expect(res.status).toBe(200);
        expect(body).not.toContain('{{LIST}}');
        expect(body).toContain('<html');
    });

    test('/api/ingame injects window.COUNTERS', async () => {
        const res = await fetch(`${base}/api/ingame`);

        expect(res.status).toBe(200);
        expect(await res.text()).toContain('window.COUNTERS = [');
    });

    test('/.well-known/* is 404', async () => {
        const res = await fetch(`${base}/.well-known/anything`);

        expect(res.status).toBe(404);
    });

    test('websocket upgrade works through the full server', async () => {
        const ws = await new Promise<WebSocket>((resolve, reject) => {
            const socket = new WebSocket(
                `${base.replace('http', 'ws')}/websocket/commands?l=__ingame__`
            );
            socket.onopen = () => resolve(socket);
            socket.onerror = reject;
        });

        ws.send('getSettings:other');
        const reply = await new Promise<string>((resolve) => {
            ws.onmessage = (event) => resolve(String(event.data));
        });
        ws.close();

        expect(JSON.parse(reply)).toEqual({
            command: 'getSettings',
            message: { error: 'Wrong overlay' }
        });
    });
});
```

Run: `cd packages/server && bun test index.test.ts` — Expected: FAIL (`Server` still constructs `HttpServer` without options / `Websocket` old signature).

- [ ] **Step 2: Rewrite `packages/server/index.ts`**

```ts
import { type GlobalConfig, config, wLogger } from '@tosu/common';
import type { InstanceManager } from 'tosu/instances/manager';

import buildAssetsApi from './router/assets';
import buildBaseApi from './router/index';
import buildSCApi from './router/scApi';
import buildSocket from './router/socket';
import buildV1Api from './router/v1';
import buildV2Api from './router/v2';
import { handleSocketCommands } from './utils/commands';
import { HttpServer } from './utils/http';
import { Websocket, createWebsocketHandler } from './utils/socket';

export class Server {
    instanceManager: InstanceManager;
    app: HttpServer;

    WS_V1: Websocket;
    WS_SC: Websocket;
    WS_V2: Websocket;
    WS_V2_PRECISE: Websocket;
    WS_COMMANDS: Websocket;

    constructor({ instanceManager }: { instanceManager: InstanceManager }) {
        this.instanceManager = instanceManager;

        const getServer = () => this.app.server;
        const common = {
            instanceManager,
            onMessageCallback: handleSocketCommands,
            getServer
        };

        this.WS_V1 = new Websocket({
            ...common,
            endpoint: 'v1',
            pollRateFieldName: 'pollRate',
            stateFunctionName: 'getState'
        });
        this.WS_SC = new Websocket({
            ...common,
            endpoint: 'sc',
            pollRateFieldName: 'pollRate',
            stateFunctionName: 'getStateSC'
        });
        this.WS_V2 = new Websocket({
            ...common,
            endpoint: 'v2',
            pollRateFieldName: 'pollRate',
            stateFunctionName: 'getStateV2'
        });
        this.WS_V2_PRECISE = new Websocket({
            ...common,
            endpoint: 'v2precise',
            pollRateFieldName: 'preciseDataPollRate',
            stateFunctionName: 'getPreciseData'
        });
        this.WS_COMMANDS = new Websocket({
            ...common,
            endpoint: 'commands',
            pollRateFieldName: '',
            stateFunctionName: ''
        });

        this.app = new HttpServer({
            instanceManager,
            websocket: createWebsocketHandler({
                v1: this.WS_V1,
                sc: this.WS_SC,
                v2: this.WS_V2,
                v2precise: this.WS_V2_PRECISE,
                commands: this.WS_COMMANDS
            })
        });
    }

    start() {
        buildAssetsApi(this.app);
        buildV1Api(this.app);
        buildSCApi(this.app);

        buildV2Api(this.app);

        buildSocket(this.app);

        buildBaseApi(this);

        this.app.listen(config.serverPort, config.serverIP);
    }

    async restart() {
        await this.app.stop();
        this.app.listen(config.serverPort, config.serverIP);
    }

    handleConfigUpdate(oldConfig: GlobalConfig) {
        try {
            const ipChanged = oldConfig.serverIP !== config.serverIP;
            const portChanged = oldConfig.serverPort !== config.serverPort;

            if (ipChanged || portChanged) {
                this.restart().catch((exc) => {
                    wLogger.error(
                        'Failed to restart server:',
                        (exc as any).message
                    );
                    wLogger.debug('Server restart error details:', exc);
                });
            }
        } catch (exc) {
            wLogger.error(
                'Failed to handle server config update:',
                (exc as any).message
            );
            wLogger.debug('Server config update error details:', exc);
        }
    }
}

export * from './utils/http';
export * from './utils/socket';
export * from './utils/index';
```

- [ ] **Step 3: Drop `ws`**

In `packages/server/package.json` remove `"ws": "^8.21.2"` from `dependencies` and `"@types/ws": "^8.18.1"` from `devDependencies`, then:

```bash
bun install
grep -rn "from 'ws'" packages --include=*.ts --exclude-dir=node_modules
```

Expected: no matches.

- [ ] **Step 4: Run every server test and the dev build**

```bash
bun test
bun run start
```

Expected: all tests pass (`index.test.ts` 7 tests). `bun run start` prints `Dashboard server started on http://127.0.0.1:24050`; open the dashboard, the counters list renders, the settings page saves (`/api/settingsSave`), `/websocket/commands` messages appear in the log with `debugLog` on.

- [ ] **Step 5: Commit**

```bash
bun run prettier:fix
git add -A
git commit -m "feat(server): wire Server on Bun.serve, drop ws"
```

---

### Task 11: Download files with `fetch`

**Files:**
- Modify: `packages/common/utils/downloader.ts:1-93`
- Create: `packages/common/utils/downloader.test.ts`

**Interfaces:**
- Consumes: `progressManager` (`utils/progress.ts`).
- Produces: `downloadFile(url: string, destination: string): Promise<string>` (same signature; follows redirects, rejects on non-2xx); `verifyDownload` unchanged.

- [ ] **Step 1: Write the failing test**

Create `packages/common/utils/downloader.test.ts`:

```ts
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { downloadFile } from './downloader';

const payload = new Uint8Array(1024 * 256).map((_, i) => i % 251);
let server: ReturnType<typeof Bun.serve>;
let dir: string;

beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tosu-download-'));
    server = Bun.serve({
        port: 0,
        hostname: '127.0.0.1',
        fetch(req) {
            const url = new URL(req.url);
            if (url.pathname === '/redirect') {
                return Response.redirect(`${url.origin}/file.zip`, 302);
            }
            if (url.pathname === '/file.zip') {
                return new Response(payload, {
                    headers: { 'Content-Length': String(payload.byteLength) }
                });
            }
            return new Response('nope', { status: 404 });
        }
    });
});

afterAll(async () => {
    await server.stop(true);
    fs.rmSync(dir, { recursive: true, force: true });
});

describe('downloadFile', () => {
    test('writes the body to the destination and follows redirects', async () => {
        const destination = path.join(dir, 'out.zip');
        const result = await downloadFile(
            `${server.url.origin}/redirect`,
            destination
        );

        expect(result).toBe(destination);
        expect(new Uint8Array(fs.readFileSync(destination))).toEqual(payload);
    });

    test('rejects and removes the file on HTTP errors', async () => {
        const destination = path.join(dir, 'missing.zip');

        await expect(
            downloadFile(`${server.url.origin}/missing.zip`, destination)
        ).rejects.toThrow('Download failed: 404');
        expect(fs.existsSync(destination)).toBe(false);
    });
});
```

Run: `cd packages/common && bun test utils/downloader.test.ts` — Expected: the second test FAILS (the `https` implementation does not reject on 404 and does not clean up).

- [ ] **Step 2: Rewrite `downloadFile`**

Replace lines 1–93 of `packages/common/utils/downloader.ts` (everything before `export async function verifyDownload`) with:

```ts
import crypto from 'node:crypto';
import fs from 'node:fs';

import { wLogger } from './logger';
import { progressManager } from './progress';

const toMB = (bytes: number) => (bytes / 1024 / 1024).toFixed(2);

/**
 * Streams `url` into `destination` with a console progress bar.
 * @returns the destination path
 */
export const downloadFile = async (
    url: string,
    destination: string
): Promise<string> => {
    const response = await fetch(url, {
        headers: {
            Accept: 'application/octet-stream',
            'User-Agent': '@tosuapp/tosu'
        }
    });

    if (!response.ok || !response.body) {
        throw new Error(
            `Download failed: ${response.status} ${response.statusText}`
        );
    }

    const totalSize = parseInt(response.headers.get('content-length') || '0');
    const token = progressManager.start('Downloading File');
    const writer = Bun.file(destination).writer();
    let downloadedSize = 0;

    try {
        for await (const chunk of response.body) {
            writer.write(chunk);
            downloadedSize += chunk.byteLength;

            progressManager.update(
                token,
                totalSize > 0 ? downloadedSize / totalSize : 0,
                `| ${toMB(downloadedSize)} / ${toMB(totalSize)} MB`
            );
        }

        await writer.end();
        await progressManager.end(token, 'Download completed');

        return destination;
    } catch (err) {
        await writer.end().catch(() => null);
        await fs.promises.unlink(destination).catch(() => null);
        await progressManager.end(token, 'Download failed');

        throw err;
    }
};
```

(`verifyDownload` below it keeps using `crypto` and `fs`.)

- [ ] **Step 3: Run the tests**

```bash
cd packages/common && bun test utils/downloader.test.ts
```

Expected: 2 tests pass.

- [ ] **Step 4: Commit**

```bash
bun run prettier:fix
git add packages/common
git commit -m "feat(common): download files with fetch"
```

---

### Task 12: Overlay process spawn and IPC prototype

**Files:**
- Modify: `packages/ingame-overlay-updater/src/index.ts:103-119`
- Conditional (only if the gate in Step 3 fails): `packages/ingame-overlay/src/index.ts`, `packages/tosu/src/instances/manager.ts`, `packages/server/utils/socket.ts`, `packages/tosu/src/index.ts`

**Interfaces:**
- Consumes: `runOverlay(): Promise<ChildProcess | Error>` callers in `packages/tosu/src/instances/manager.ts` (`child.send({ cmd: 'add', pid })`, `child.on('exit')`, `child.kill()`).
- Produces: same `runOverlay` signature; the child's `channel` is set and `send` delivers JSON to the Electron `process.on('message')` handler.

- [ ] **Step 1: Spawn with JSON serialization**

In `packages/ingame-overlay-updater/src/index.ts` replace the `spawn(...)` call with:

```ts
        const child = spawn(
            path.join(gameOverlayPath, 'tosu-ingame-overlay.exe'),
            [],
            {
                detached: false,
                // Bun <-> Node.js (Electron) IPC must use JSON serialization.
                serialization: 'json',
                stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
                windowsHide: true,
                shell: false,
                env: {
                    // Force nvidia optimus to prefer dedicated gpu
                    SHIM_MCCOMPAT: '0x800000001',
                    // Force ipc fd to 3 just in case
                    NODE_CHANNEL_FD: '3',
                    ...process.env
                }
            }
        ) as ChildProcessByStdio<null, Readable, Readable>;
```

(`'overlapped'` is a Node/libuv-only stdio mode; `'pipe'` is the portable equivalent.)

- [ ] **Step 2: Build and run with the overlay enabled**

```bash
bun run build:win
```

Copy `packages/tosu/dist/tosu.exe` to a folder next to a `game-overlay/` directory taken from the v4.26.0 release zip (`tosu-overlay-*.zip` extracted, containing `tosu-ingame-overlay.exe` and a `version` file with `4.26.0`), set `ENABLE_INGAME_OVERLAY=true` in `tosu.env`, start `tosu.exe`, then start osu!.

- [ ] **Step 3: Gate**

Expected in the tosu console: `Launching in-game overlay...` and, after osu! is attached, `initializing ingame overlay pid: <pid>` followed by `Initialized successfully` (both relayed from the overlay's stdout by `runOverlay`). Pressing the keybind (`Ctrl+Shift+Space`) toggles the overlay editor in game. Changing `INGAME_OVERLAY_MAX_FPS` in the dashboard settings logs `MaxFps updated to …` from the overlay.

If instead the log shows `Could not spawn overlay process with Ipc`, or `initializing ingame overlay pid:` never appears while the overlay process is alive in Task Manager, execute Steps 4–6 (fallback Q20-A). Otherwise skip to Step 7.

- [ ] **Step 4 (fallback only): overlay listens on the commands WebSocket**

In `packages/ingame-overlay/src/index.ts`, replace the block

```ts
    } else if (!process.channel) {
        throw new Error('Failed to acquire IPC channel. Exiting...');
    }
```

with

```ts
    } else if (!process.channel && !process.env.TOSU_COMMANDS_URL) {
        throw new Error('Failed to acquire IPC channel. Exiting...');
    }
```

and replace `manager.runIpc();` with:

```ts
    if (process.env.TOSU_COMMANDS_URL) {
        manager.runWebSocket(process.env.TOSU_COMMANDS_URL);
    } else {
        manager.runIpc();
    }
```

In `packages/ingame-overlay/src/manager.ts` add to `OverlayManager`:

```ts
    runWebSocket(url: string) {
        const connect = () => {
            const socket = new WebSocket(url);

            socket.onmessage = async (event) => {
                try {
                    const msg = JSON.parse(String(event.data));
                    if (msg && typeof msg.cmd === 'string') {
                        await this.handleEvent(msg);
                    }
                } catch (exc) {
                    console.error(`WS:`, exc);
                }
            };
            socket.onclose = () => setTimeout(connect, 1000);
            socket.onerror = () => socket.close();
        };

        connect();
    }
```

- [ ] **Step 5 (fallback only): tosu side**

In `packages/server/utils/socket.ts` add to `Websocket`:

```ts
    /** Sends a control object to overlay processes attached with `?l=__ingame_control__`. */
    sendControl(message: Record<string, unknown>) {
        const payload = JSON.stringify(message);
        for (const client of this.clients.values()) {
            if (client.data.query.l === '__ingame_control__') {
                client.send(payload);
            }
        }
    }
```

In `packages/ingame-overlay-updater/src/index.ts` add `TOSU_COMMANDS_URL: \`ws://127.0.0.1:${config.serverPort}/websocket/commands?l=__ingame_control__\`` to the spawn `env` (import `config` from `@tosu/common`) and remove the `if (!child.channel) throw …` check.

In `packages/tosu/src/instances/manager.ts` add a field `overlayControl: ((message: Record<string, unknown>) => void) | null = null;` and a method:

```ts
    sendOverlay(message: Record<string, unknown>) {
        if (this.overlayProcess?.channel) {
            this.overlayProcess.send(message);
            return;
        }

        this.overlayControl?.(message);
    }
```

Replace the three `this.overlayProcess.send({...})` / `child.send({...})` / `proc.send({...})` calls in `manager.ts` with `this.sendOverlay({...})`. In `packages/tosu/src/index.ts`, after `const httpServer = new Server({ instanceManager });` add:

```ts
    instanceManager.overlayControl = (message) =>
        httpServer.WS_COMMANDS.sendControl(message);
```

The `handleSocketCommands` handler ignores incoming non-command JSON from this client (no `:` in the payload → early return), so the control client is inert on the command side.

- [ ] **Step 6 (fallback only): Re-run the gate**

Repeat Step 2 and Step 3. Expected: the same log lines through the WebSocket channel.

- [ ] **Step 7: Commit**

```bash
bun run prettier:fix
git add -A
git commit -m "fix(overlay-updater): json ipc serialization for bun"
```

(With the fallback: `feat(overlay): control channel over websocket commands`.)

---

### Task 13: Docs, cleanup and acceptance run

**Files:**
- Modify: `CLAUDE.md:26-40` (monorepo section), `DEVELOPMENT.md` (already rewritten in Task 2; verify), `.vscode/launch.json`
- Modify: `packages/tosu/package.json`, `packages/server/package.json` (dependency audit)

**Interfaces:**
- Consumes: everything above.
- Produces: green CI on `feat/bun`, PR ready for review with the acceptance checklist filled in.

- [ ] **Step 1: CLAUDE.md**

In `CLAUDE.md` replace `The project is structured as a pnpm workspace monorepo divided into the following modules:` with `The project is structured as a Bun workspace monorepo (\`bun install\`, \`bun test\`, \`bun build --compile\`) divided into the following modules:` and in the `C++ Native Addon (packages/tsprocess)` bullet append: `Built by \`packages/tsprocess/build.ts\` (MSVC on Windows, g++ on Linux) as an N-API addon; no node-gyp or Node.js is involved.`

In the `HTTP & WebSocket Server (packages/server)` bullet append: `Runs on \`Bun.serve\` with native WebSockets; handlers return \`Response\` objects.`

- [ ] **Step 2: VS Code launch config**

Replace `.vscode/launch.json` with:

```json
{
    "version": "0.2.0",
    "configurations": [
        {
            "type": "bun",
            "request": "launch",
            "name": "Debug tosu (bundle)",
            "program": "packages/tosu/dist/index.js",
            "cwd": "${workspaceFolder}/packages/tosu",
            "stopOnEntry": false,
            "watchMode": false
        },
        {
            "type": "bun",
            "request": "launch",
            "name": "Debug bun test",
            "runtimeArgs": ["test"],
            "cwd": "${workspaceFolder}",
            "stopOnEntry": false
        }
    ]
}
```

- [ ] **Step 3: Dependency audit**

```bash
grep -rn --include=package.json -E '"(tsx|cross-env|@yao-pkg/pkg|resedit|node-gyp|ws|@types/ws|tsconfig-paths)"' package.json packages/*/package.json
```

Expected: no matches. Then:

```bash
bun install
git status --short
```

Expected: only `bun.lock` changed (if at all).

- [ ] **Step 4: Full local verification**

```bash
bun run prettier:ci
bun run lint:ci
bun test
bun run build:win
```

Expected: all green; `dist/tosu.exe` produced.

- [ ] **Step 5: Acceptance checklist**

Run every item of the spec's "Acceptance checklist" (`docs/superpowers/specs/2026-08-25-bun-migration-design.md`) on Windows with osu!(stable) and osu!(lazer); run item 5 (Linux binary) via the CI artifact `tosu-linux-*` or a Linux machine. Record the results (pass/fail + notes) in the PR description under "Testing verification".

For item 2, with `DEBUG_LOG=true` in `tosu.env`, collect three `measureTime` lines for `OsuInstance`/`LazerInstance` state functions and add them to the PR description next to the same lines from a v4.26.0 build (the N-API overhead comparison from the spec's "Risks and gates").

- [ ] **Step 6: Commit and open the PR**

```bash
bun run prettier:fix
git add -A
git commit -m "docs: bun development guide"
git push
```

Mark the PR ready for review. PR body (project rule): summary of changes, problem solved, files affected, testing verification (checklist results), AI usage declaration.

---

## Self-review notes

- Spec coverage: Q1/Q10 → Tasks 6–11; Q2 → Task 2; Q3/Q12/Q17/Q18 → Tasks 1–2; Q5 → Task 4; Q6/Q14/Q19 → Tasks 3–4; Q7/Q20 → Task 12; Q8 → tests in Tasks 1, 3, 6–8, 10, 11 + checklist in Task 13; Q9 → single branch `feat/bun`; Q11 → `hideConsole: false` in Task 4; Q13 → unchanged C++ (Task 1 keeps `functions.cc`); Q15 → Task 6; Q16 → Task 7; Q21 → this file; CI → Task 5; docs → Tasks 2 and 13.
- Type consistency: `TosuRequest`, `RouteHandler`, `HttpServer.route/onUpgrade/listen/stop` (Task 6) are used unchanged in Tasks 7–10; `WsData`, `TosuSocket`, `Websocket.redispatch/setFilters`, `createWebsocketHandler` (Task 7) are used unchanged in Tasks 9–10 and 12; `json`/`html` (Task 6) in Tasks 8–9; `SERVER_ASSETS_PATH` (Task 8) in Task 9; `autoUpdater(from)` (Task 9) matches its call in `router/index.ts` and in `packages/tosu/src/index.ts` (`await autoUpdater('startup')` — return value ignored there, unchanged).
