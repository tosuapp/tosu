import childProcess, { type ChildProcess } from 'node:child_process';
import { watch } from 'rolldown';

import rolldownConfig from './rolldown.config.mjs';

const watcher = watch(rolldownConfig);

let tosuProcess: ChildProcess | null = null;
watcher.on('event', (event) => {
    switch (event.code) {
        case 'BUNDLE_START': {
            // Kill tosu process before running bundler to avoid file lock
            if (tosuProcess) {
                tosuProcess.kill('SIGINT');
                tosuProcess = null;
            }
            break;
        }

        case 'END': {
            // Start tosu process after bundler has finished
            tosuProcess = childProcess.spawn(
                'node',
                ['--enable-source-maps', 'dist/index.js'],
                {
                    stdio: 'inherit'
                }
            );
            break;
        }

        default:
            break;
    }
});
