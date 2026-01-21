import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { type PluginOption, type UserConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

import packageJSON from './package.json';

export default {
    define: {
        'import.meta.env.TOSU_VERSION': JSON.stringify(packageJSON.version)
    },
    build: {
        target: 'node20',
        ssr: true,
        outDir: 'dist',
        assetsDir: 'assets',
        ssrEmitAssets: true,
        rollupOptions: {
            input: 'src/index.ts',
            output: {
                format: 'cjs'
            }
        },
        commonjsOptions: {
            include: [
                /node_modules/,
                /* Explicit patterns to include the co-located dependencies */
                /tsprocess/
            ],
            requireReturnsDefault: 'auto'
        }
    },
    appType: 'custom',
    ssr: {
        target: 'node',
        noExternal: true
    },
    plugins: [tsconfigPaths(), nativeFilesPlugin()],
    esbuild: {
        platform: 'node',
        target: 'node20'
    }
} satisfies UserConfig;

// quick hack https://github.com/vitejs/vite/issues/14289#issuecomment-2420109786
function nativeFilesPlugin(): PluginOption {
    const files = new Map<
        string,
        { readonly fileName: string; readonly fileContent: Buffer }
    >();

    return {
        name: 'node-binaries-plugin',
        async load(id) {
            if (!id.endsWith('.node')) {
                return null;
            }

            const fileContent = await fs.readFile(id);
            const hash = createHash('sha256')
                .update(fileContent)
                .digest('hex')
                .slice(0, 8);
            const fileName = `${path.basename(id, '.node')}.${hash}.node`;
            files.set(id, { fileName, fileContent });

            return `export default require('./${fileName}');`;
        },

        generateBundle(_, bundle) {
            for (const [id, { fileName, fileContent }] of files.entries()) {
                this.emitFile({ type: 'asset', fileName, source: fileContent });
                delete bundle[id];
            }
        }
    };
}
