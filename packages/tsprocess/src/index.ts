// Resolves from both src/ (bun test) and dist/ (tsc output): <pkg>/dist/lib/tsprocess.node
export default require('../dist/lib/tsprocess.node');
export * from './process';
