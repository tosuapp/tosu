import { bytecodePlugin, defineConfig } from 'electron-vite';
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
            rollupOptions: {
                external: [
                    '@asdf-overlay/core',
                ]
            }
        },
        plugins: [bytecodePlugin()],
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
                entry: './src/preload.ts',
                formats: ['cjs']
            },
            outDir: 'dist/preload',
            minify: true
        }
    }
});
