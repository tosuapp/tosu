# tosu Development Guide

This guide walks you through setting up your local environment, running the application in development mode, and compiling binaries.

## System Prerequisites

To build and run tosu locally, you need the following tools installed on your system:

* **Node.js**: Version 24 or newer is recommended.
* **pnpm**: The package manager used by the monorepo workspace.
* **Rust Toolchain**: Required to compile the `tsprocess` native C++ addon.
* **C++ Build Tools**: Such as Visual Studio Build Tools (Windows) or build-essential (Linux) for Node-GYP.

## Project Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/tosuapp/tosu.git
   cd tosu
   ```

2. Install dependencies (this will automatically build the native `tsprocess` C++ addon):
   ```bash
   pnpm install
   ```

## Running in Development

To start tosu in development mode with hot-reloading:
```bash
pnpm run start
```
This compiles the packages and runs the main server. The software will poll for a running osu! or osu!lazer process and attach to it automatically.

### Running Specific Files
If you are developing or testing specific components, you can use the sub-package ts runners:
```bash
pnpm --filter tosu run ts:run <file-path>
```

## Compilation

You can compile a single self-contained binary file. The build outputs will be placed in `packages/tosu/dist/`.

* **For Windows**:
  ```bash
  pnpm build:win
  ```

* **For Linux**:
  ```bash
  pnpm build:linux
  ```
