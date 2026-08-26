import fs from 'node:fs';
import path from 'node:path';

// In the rolldown bundle (dist/index.js) and inside the compiled executable the
// dashboard assets are copied next to the bundle. When the sources run directly
// (bun test) fall back to the package's assets folder.
const bundledAssets = path.join(import.meta.dirname, 'assets');

export const SERVER_ASSETS_PATH = fs.existsSync(bundledAssets)
    ? bundledAssets
    : path.resolve(import.meta.dirname, '..', 'assets');
