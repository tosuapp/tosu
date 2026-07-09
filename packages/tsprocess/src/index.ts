import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

export default require('./lib/tsprocess.node');
export * from './process';
