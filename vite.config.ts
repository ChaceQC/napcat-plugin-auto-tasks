import { defineConfig } from 'vite';
import nodeResolve from '@rollup/plugin-node-resolve';
import { builtinModules } from 'module';

export default defineConfig({
    build: {
        target: 'esnext',
        minify: false,
        lib: {
            entry: 'src/index.ts',
            formats: ['es'],
            fileName: () => 'index.mjs',
        },
        rollupOptions: {
            external: [...builtinModules, ...builtinModules.map(m => `node:${m}`), 'napcat-types'],
        },
        emptyDirBeforeWrite: true,
    },
    plugins: [nodeResolve()],
});