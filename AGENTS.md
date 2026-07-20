# tosu Agent & Development Reference Guide

This document provides a comprehensive guide to the **tosu** codebase architecture, system modules, memory-reading workflow, and development workflows. It serves as an entry point for developers and AI agents to understand the project structure and rules for contributions.

For environment setup, running in development mode, and compiling binaries, see [DEVELOPMENT.md](DEVELOPMENT.md).

## Software Description

**tosu** is a real-time memory reader and overlay host for osu! (supporting both stable and lazer). The software attaches to a running osu! process and scans its memory space using pre-configured signature patterns to resolve base pointers. It walks these pointers to read real-time game state data (such as hit statistics and key presses) while side-loading the active beatmap from disk to calculate performance point (PP) attributes. Finally, this compiled state is exposed over HTTP and WebSockets to be consumed by client overlays.

> **Terminology Note:** In the osu! community, the terms "PP counters" and "overlays" are used interchangeably. Historically, they were called "PP counters" because they only showed the calculated performance points (PP) value, but **tosu** refers to them as "overlays" since they now display rich multi-domain game statistics (or might not even include PP).

## Game Clients: stable vs lazer

osu! is a rhythm game where players tap circles, slide sliders, and spin spinners to the beat of the music. The game has two primary client versions that tosu must support:

* **osu! stable**
  A 32-bit application written in C# utilizing XNA and .NET Framework 4.x. It is a legacy, long-standing game client that is mature and highly optimized but frozen in terms of major feature updates.
* **osu! lazer**
  A 64-bit application built on the custom osu!framework and .NET 8. It is the new, open-source, modern iteration of osu! that is actively developed and cross-platform.

Because stable and lazer have completely different codebases, rendering engines, and memory layouts, tosu must implement different reader paths. Lazer introduces many features (like custom mods, rulesets, and multiplayer structures) that stable does not have, while some legacy stable features may not be present in lazer yet. Feature and data field non-parity between the two clients is expected and normal.

## Monorepo Directory Structure

The project is structured as a pnpm workspace monorepo divided into the following modules:

* **Core Orchestrator (packages/tosu)**
  Handles process detection, memory reading, state management, and serializing outputs.
  reference: [packages/tosu/src/index.ts](packages/tosu/src/index.ts)
* **C++ Native Addon (packages/tsprocess)**
  Interacts directly with the OS to find processes, check window focus, read memory buffers, and run fast pattern scans.
  reference: [packages/tsprocess/src/index.ts](packages/tsprocess/src/index.ts)
* **HTTP & WebSocket Server (packages/server)**
  Exposes the compiled game state data to external overlays and serves the dashboard.
  reference: [packages/server/index.ts](packages/server/index.ts)
* **In-Game Overlay (packages/ingame-overlay)**
  An optional Electron desktop application that renders a transparent overlay window directly on top of the active osu! game window.
  reference: [packages/ingame-overlay/src/index.ts](packages/ingame-overlay/src/index.ts)
* **Shared & Supporting Packages**
  `packages/common` contains shared configurations, dot-env bindings, and loggers. `packages/updater` handles application self-updates on startup, and `packages/ingame-overlay-updater` handles launcher/updater logic for the Electron overlay.

## Dashboard Application

The dashboard is a built-in administration interface served directly by the web server (`packages/server`). It is built using static HTML and client-side JavaScript that dynamically replaces placeholder text with JS-computed HTML (client-side DOM replacement and rendering). The dashboard is used for toggling tosu settings, managing installed overlays, and easing the download of new overlays from the official tosu overlay repository.

## WebSocket Endpoints

The server exposes several WebSocket endpoints for overlays and client connections:

* **v1 Compatibility Layer (`/ws`)**
  A legacy compatibility endpoint for overlays built for older/alternative readers like gosumemory. This should not be modified for new features; rely entirely on v2 for active development.
* **StreamCompanion Wrapper (`/tokens`)**
  A compatibility endpoint specifically designed for overlays built for StreamCompanion, behaving as a wrapper around the `/ws` (v1) legacy layer.
* **v2 Native Endpoint (`/websocket/v2`)**
  The native, actively maintained general data endpoint that broadcasts general game state updates.
* **v2 Precise Endpoint (`/websocket/v2/precise`)**
  A high-frequency native endpoint designed for rapid data streaming of indicators that must be fetched faster (such as hit errors and key presses).
* **Commands Channel (`/websocket/commands`)**
  An internal command/control endpoint used by the dashboard and the in-game overlay to receive control notifications (such as overlay list refreshes and settings updates) rather than game state data.

## Performance Points (PP) Calculations

Performance Points (PP) measure a player's accuracy, difficulty, and speed on a beatmap. tosu calculates PP using two systems:

* **tosu PP Processor (`@tosuapp/lazer-calculator-prebuilt`)**
  A custom, stripped-down version of the osu!lazer game processor maintained directly by the tosu team. It is packaged as a prebuilt native addon for performance.
* **Legacy PP Calculator (`rosu-pp-js`)**
  An external third-party library used only for legacy and non-migrated code paths, such as the `/api/calculate/pp` HTTP endpoint.

To ensure stability, tosu side-loads beatmap content. Instead of reading files from memory, the reader extracts the beatmap file path from the game's memory, reads the physical `.osu` file from disk via `fs.readFileSync`, and passes the content to the native `@tosuapp/lazer-calculator-prebuilt` parser to compute strains, difficulty, and PP attributes.

## Memory Reading Lifecycle

At startup, the instance manager discovers the osu! process and opens a native handle to it. The memory reader then runs a synchronous signature scan to resolve the base addresses of game structures in memory. Once validated, tosu starts polling loops that walk these memory pointers to extract real-time values (such as combo, accuracy, or play time). It uses helpers to decode complex C# structures, such as strings and dictionary pointers, matching the process bitness.

## Contribution Standards

* **Commit Messages**: All commits must follow the Conventional Commits standard (e.g., `feat:`, `fix:`, `refactor:`, `chore:`) with no co-authoring footers.
* **Pull Requests**: Pull Requests must include a summary of changes, the problem solved, files affected, testing verification, and an AI usage declaration (specifying company, model, and version).
