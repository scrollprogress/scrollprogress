import { defineConfig } from 'vite';
import { configDefaults } from 'vitest/config';

export default defineConfig({
    publicDir: false,
    build: {
        target: ['chrome111', 'edge111', 'firefox114', 'safari16.4', 'ios16.4'],
        minify: 'oxc',
        lib: {
            entry: {
                index: 'src/lib/index.ts',
                'debug/index': 'src/lib/debug/index.ts',
                'debug/registry/index': 'src/lib/debug/registry/index.ts',
                'debug/palette/index': 'src/lib/debug/palette/index.ts',
                'debug/console/index': 'src/lib/debug/console/index.ts',
                'debug/overlay/index': 'src/lib/debug/overlay/index.ts',
                'debug/session/index': 'src/lib/debug/session/index.ts'
            },
            formats: ['es'],
            fileName: (_format, entryName) => `${entryName}.js`
        },
        outDir: 'dist',
        emptyOutDir: true
    },
    test: {
        include: ['src/tests/**/*.test.ts'],
        exclude: [...configDefaults.exclude, 'tests/entries/**']
    }
});
