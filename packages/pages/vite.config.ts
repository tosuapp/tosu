import vue from '@vitejs/plugin-vue';
import autoprefixer from 'autoprefixer';
import { type UserConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default {
    build: {
        outDir: 'dist',
        assetsDir: 'assets',
        rollupOptions: {
            input: ['homepage.html', 'ingame.html', 'report.html']
        }
    },
    css: {
        postcss: {
            plugins: [autoprefixer]
        }
    },
    plugins: [tsconfigPaths(), vue()]
} satisfies UserConfig;
