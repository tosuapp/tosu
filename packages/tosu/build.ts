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
    throw: false,
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

for (const log of result.logs) console.error(log);

if (!result.success) {
    console.error('Compile failed');
    process.exit(1);
}

console.log(`Compiled ${result.outputs[0].path}`);
console.log(`Embedded: ${assets.join(', ')}`);
