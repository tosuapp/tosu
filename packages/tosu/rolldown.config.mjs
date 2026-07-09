// @ts-check
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { defineConfig } from 'rolldown';
import { replacePlugin } from 'rolldown/plugins';

export default defineConfig([
    {
        input: 'src/index.ts',
        platform: 'node',
        moduleTypes: {
            '.node': 'copy'
        },
        output: {
            minify: true,
            keepNames: true,
            sourcemap: true,
            sourcemapExcludeSources: true,
            format: 'esm',
            dir: 'dist',
            assetFileNames: '[name]-[hash][extname]'
        },
        plugins: [
            rosuPlugin(),
            replacePlugin({
                __dirname: 'import.meta.dirname'
            })
        ]
    }
]);

/**
 * rosu wasm import fix
 * @returns {import('rolldown').Plugin}
 */
function rosuPlugin() {
    const rosuDir = path.dirname(
        createRequire(import.meta.url).resolve('rosu-pp-js')
    );

    return {
        name: 'rosu-wasm-fix',

        buildStart() {
            this.addWatchFile(path.join(rosuDir, 'rosu_pp_js_bg.wasm'));
        },

        async generateBundle() {
            this.emitFile({
                type: 'asset',
                fileName: 'rosu_pp_js_bg.wasm',
                source: await fs.readFile(
                    path.join(rosuDir, 'rosu_pp_js_bg.wasm')
                )
            });
        }
    };
}
