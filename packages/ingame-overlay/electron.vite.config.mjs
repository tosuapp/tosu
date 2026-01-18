import { defineConfig } from 'electron-vite';
import path from 'node:path';

export default defineConfig({
    main: {
        build: {
            lib: {
                entry: './src/index.ts',
                formats: ['cjs']
            },
            outDir: 'dist/src',
            minify: true,
            bytecode: true,
            rollupOptions: {
                external: ['@asdf-overlay/core']
            }
        },
        resolve: {
            alias: {
                '@assets': path.resolve('./assets')
            }
        },
        assetsInclude: ['./assets/*']
    },
    preload: {
        build: {
            lib: {
                entry: './preload/index.ts',
                formats: ['cjs']
            },
            outDir: 'dist/preload',
            minify: true
        }
    },
    renderer: {
        root: './renderer',
        build: {
            minify: true,
            rollupOptions: {
                input: {
                    index: './renderer/index.html'
                }
            },
            outDir: 'dist/renderer'
        }
    }
});
