// Builds lib/*.cc into dist/lib/tsprocess.node without node-gyp or Node.js.
// Windows: MSVC from Visual Studio Build Tools; node.exe is delay-loaded and
// resolved to the running executable by lib/win_delay_load_hook.cc (as node-gyp does).
// Linux: g++ shared library; napi_* symbols resolve against the host executable.
// The Windows build is x64-only (vcvarsall x64, /machine:x64).
// Windows compiles with /EHsc while Linux uses -fno-exceptions; both pair this with
// NAPI_DISABLE_CPP_EXCEPTIONS by design.
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
    options: {
        windowsVerbatimArguments?: boolean;
        env?: NodeJS.ProcessEnv;
    } = {}
) {
    const result = spawnSync(command, args, {
        cwd: root,
        stdio: 'inherit',
        ...options
    });
    if (result.error) throw result.error;
    if (result.status !== 0) {
        throw new Error(
            `${command} exited with ${result.status === null ? `signal ${result.signal}` : `code ${result.status}`}`
        );
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
    // A machine without Visual Studio has no vswhere.exe at all, so spawnSync
    // fails with ENOENT before it can report a missing workload.
    if ((query.error as NodeJS.ErrnoException | undefined)?.code === 'ENOENT') {
        throw new Error(
            `vswhere.exe not found at ${vswhere} -- install the Visual Studio Build Tools with the "Desktop development with C++" workload`
        );
    }
    if (query.error) throw query.error;

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
        `/Fo"${buildDir}\\\\"`
    ].join(' ');
    const importLib = `lib /nologo /def:"${buildDir}\\node.def" /out:"${buildDir}\\node.lib" /machine:x64`;
    const link = [
        'link',
        '/nologo',
        '/DLL',
        `/OUT:"${output}"`,
        `/IMPLIB:"${buildDir}\\tsprocess.lib"`,
        `"${buildDir}\\functions.obj"`,
        `"${buildDir}\\memory_windows.obj"`,
        `"${buildDir}\\win_delay_load_hook.obj"`,
        `"${buildDir}\\node.lib"`,
        'delayimp.lib',
        'kernel32.lib',
        'user32.lib',
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
        {
            windowsVerbatimArguments: true,
            env: {
                ...process.env,
                PATH: `${path.dirname(vswhere)};${process.env.PATH ?? ''}`
            }
        }
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
rmSync(output, { force: true });
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
