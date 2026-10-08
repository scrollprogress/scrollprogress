import type { PlaygroundDemo } from '../demos/types.ts';
import { createStoredZip, type ZipEntry } from './zip.ts';

export type DemoProjectLanguage = 'typescript' | 'javascript';
export interface DemoProjectDependencies {
    packageName: string;
    packageVersion: string;
    viteVersion: string;
    typescriptVersion: string;
    tailwindVersion: string;
    tailwindViteVersion: string;
}

declare global {
    var __SCROLLPROGRESS_DEMO_PROJECT_DEPENDENCIES__: DemoProjectDependencies | undefined;
}

function getProjectDependencies(dependencies?: DemoProjectDependencies): DemoProjectDependencies {
    const resolved = dependencies ?? globalThis.__SCROLLPROGRESS_DEMO_PROJECT_DEPENDENCIES__;

    if (!resolved) throw new Error('Missing ScrollProgress demo project dependencies.');
    return resolved;
}

function projectIndex(demo: PlaygroundDemo, language: DemoProjectLanguage): string {
    const extension = language === 'typescript' ? 'ts' : 'js';

    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${demo.title} · ScrollProgress demo</title>
    <script type="module" src="/src/main.${extension}"></script>
  </head>
  <body>
${demo.markup.trim()}
  </body>
</html>
`;
}

export function createDemoProjectEntries(
    demo: PlaygroundDemo,
    language: DemoProjectLanguage = 'typescript',
    dependencies?: DemoProjectDependencies
): ZipEntry[] {
    const {
        packageName,
        packageVersion,
        viteVersion,
        typescriptVersion,
        tailwindVersion,
        tailwindViteVersion
    } = getProjectDependencies(dependencies);
    const usesTypeScript = language === 'typescript';
    const packageJson = {
        name: `scrollprogress-${demo.id.replaceAll('/', '-')}-demo`,
        private: true,
        version: '0.0.0',
        type: 'module',
        scripts: {
            dev: 'vite',
            build: usesTypeScript ? 'tsc --noEmit && vite build' : 'vite build'
        },
        dependencies: { [packageName]: packageVersion },
        devDependencies: {
            '@tailwindcss/vite': tailwindViteVersion,
            tailwindcss: tailwindVersion,
            vite: viteVersion,
            ...(usesTypeScript ? { typescript: typescriptVersion } : {})
        }
    };
    const tsconfig = {
        compilerOptions: {
            target: 'ES2023',
            module: 'ESNext',
            lib: ['ES2023', 'DOM', 'DOM.Iterable'],
            moduleResolution: 'Bundler',
            strict: true,
            noEmit: true,
            types: ['vite/client']
        },
        include: ['src']
    };
    const viteConfig = `import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({ plugins: [tailwindcss()] });
`;
    const readme = `# ${demo.title} · ${usesTypeScript ? 'TypeScript' : 'JavaScript'}

Standalone ScrollProgress demo.

This project uses \`@scrollprogress/scrollprogress@${packageVersion}\`. The package must be
available from npm before \`npm install\` can complete.

\`\`\`sh
npm install
npm run dev
npm run build
\`\`\`
`;

    const entries: ZipEntry[] = [
        { name: 'README.md', content: readme },
        { name: 'index.html', content: projectIndex(demo, language) },
        { name: 'package.json', content: `${JSON.stringify(packageJson, null, 2)}\n` },
        {
            name: usesTypeScript ? 'src/main.ts' : 'src/main.js',
            content: usesTypeScript ? demo.typescript : demo.javascript
        },
        {
            name: 'src/style.css',
            content: `@import 'tailwindcss';

html { color-scheme: dark; }
body {
    margin: 0;
    min-height: 160vh;
    padding: 10vh 1.5rem;
    background: #0a0a0a;
    color: #fafafa;
    font-family: ui-sans-serif, system-ui, sans-serif;
}

${demo.style}`
        },
        { name: usesTypeScript ? 'vite.config.ts' : 'vite.config.js', content: viteConfig },
        ...(demo.assets ?? []).map((asset) => ({ name: asset.path, content: asset.content }))
    ];

    if (usesTypeScript) {
        entries.push({ name: 'tsconfig.json', content: `${JSON.stringify(tsconfig, null, 2)}\n` });
    }

    return entries;
}

export function createDemoProjectZip(
    demo: PlaygroundDemo,
    language: DemoProjectLanguage = 'typescript',
    dependencies?: DemoProjectDependencies
): Uint8Array {
    return createStoredZip(createDemoProjectEntries(demo, language, dependencies));
}
