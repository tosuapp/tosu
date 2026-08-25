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
