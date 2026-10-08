import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import { playgroundDemoIncludes } from './playground/tooling/vite/demo-includes';
import { playgroundDemoJavaScript } from './playground/tooling/vite/demo-javascript';
import { validatePlaygroundOutput } from './playground/tooling/vite/validate-output';

const playgroundDirectory = fileURLToPath(new URL('./playground', import.meta.url));
const repositoryPackage = JSON.parse(
    readFileSync(fileURLToPath(new URL('./package.json', import.meta.url)), 'utf8')
);
const demoProjectDependencies = {
    packageName: repositoryPackage.name,
    packageVersion: repositoryPackage.version,
    viteVersion: repositoryPackage.devDependencies.vite,
    typescriptVersion: repositoryPackage.devDependencies.typescript,
    tailwindVersion: repositoryPackage.devDependencies.tailwindcss,
    tailwindViteVersion: repositoryPackage.devDependencies['@tailwindcss/vite']
};
export default defineConfig({
    define: {
        'globalThis.__SCROLLPROGRESS_DEMO_PROJECT_DEPENDENCIES__':
            JSON.stringify(demoProjectDependencies)
    },

    plugins: [
        playgroundDemoJavaScript(),
        playgroundDemoIncludes(playgroundDirectory),
        tailwindcss(),
        validatePlaygroundOutput(playgroundDirectory)
    ],

    resolve: {
        alias: [
            {
                find: '@scrollprogress/scrollprogress/debug/themes/neon-grid.css',
                replacement: resolve(playgroundDirectory, '../src/lib/debug/themes/neon-grid.css')
            },
            {
                find: '@scrollprogress/scrollprogress/debug/themes/paper.css',
                replacement: resolve(playgroundDirectory, '../src/lib/debug/themes/paper.css')
            },
            {
                find: '@scrollprogress/scrollprogress/debug/palette',
                replacement: resolve(playgroundDirectory, '../src/lib/debug/palette/index.ts')
            },
            {
                find: '@scrollprogress/scrollprogress/debug/console',
                replacement: resolve(playgroundDirectory, '../src/lib/debug/console/index.ts')
            },
            {
                find: '@scrollprogress/scrollprogress/debug/overlay',
                replacement: resolve(playgroundDirectory, '../src/lib/debug/overlay/index.ts')
            },
            {
                find: '@scrollprogress/scrollprogress/debug/registry',
                replacement: resolve(playgroundDirectory, '../src/lib/debug/registry/index.ts')
            },
            {
                find: '@scrollprogress/scrollprogress/debug',
                replacement: resolve(playgroundDirectory, '../src/lib/debug/index.ts')
            },
            {
                find: '@scrollprogress/scrollprogress',
                replacement: resolve(playgroundDirectory, '../src/lib/index.ts')
            }
        ]
    },

    build: {
        outDir: resolve(playgroundDirectory, 'dist'),
        emptyOutDir: true,
        rolldownOptions: {
            input: {
                main: resolve(playgroundDirectory, 'index.html'),
                core: resolve(playgroundDirectory, 'core.html'),
                experiments: resolve(playgroundDirectory, 'experiments.html'),
                debug: resolve(playgroundDirectory, 'debug.html'),
                viewportX: resolve(playgroundDirectory, 'viewport-x.html')
            }
        }
    }
});
