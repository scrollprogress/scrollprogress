import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import { createDemoProjectEntries } from '../../playground/demo-tools/project.ts';
import { createStoredZip, crc32 } from '../../playground/demo-tools/zip.ts';

const repository = fileURLToPath(new URL('../../', import.meta.url));
const demosDirectory = join(repository, 'playground/demos');
const requiredFiles = ['markup.html', 'style.css', 'main.ts'];
const repositoryPackage = JSON.parse(readFileSync(join(repository, 'package.json'), 'utf8'));
const projectDependencies = {
    packageName: repositoryPackage.name,
    packageVersion: repositoryPackage.version,
    viteVersion: repositoryPackage.devDependencies.vite,
    typescriptVersion: repositoryPackage.devDependencies.typescript,
    tailwindVersion: repositoryPackage.devDependencies.tailwindcss,
    tailwindViteVersion: repositoryPackage.devDependencies['@tailwindcss/vite']
};

function demoDirectories() {
    return readdirSync(demosDirectory, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .flatMap((category) =>
            readdirSync(join(demosDirectory, category.name), { withFileTypes: true })
                .filter((entry) => entry.isDirectory())
                .map((entry) => ({
                    id: `${category.name}/${entry.name}`,
                    path: join(demosDirectory, category.name, entry.name)
                }))
        );
}

test('catalog IDs are unique, ordered and backed by complete demo folders', () => {
    const catalog = readFileSync(join(demosDirectory, 'catalog.ts'), 'utf8');
    const entries = [...catalog.matchAll(/id: '([^']+)'[\s\S]*?order: (\d+)/g)].map(
        ([, id, order]) => ({ id, order: Number(order) })
    );
    const ids = entries.map(({ id }) => id);

    assert.equal(new Set(ids).size, ids.length);
    assert.deepEqual(
        entries.map(({ order }) => order),
        [...entries].map(({ order }) => order).sort((left, right) => left - right)
    );
    assert.deepEqual(
        demoDirectories()
            .map(({ id }) => id)
            .sort(),
        [...ids].sort()
    );

    for (const demo of demoDirectories()) {
        for (const file of requiredFiles) assert.equal(existsSync(join(demo.path, file)), true);

        const source = readFileSync(join(demo.path, 'main.ts'), 'utf8');
        assert.doesNotMatch(source, /shared\.ts|src\/lib|\.\.\/\.\.\/\.\.\/src/);
        assert.match(source, /@scrollprogress\/scrollprogress/);
    }

    for (const file of ['posts-page-1.json', 'posts-page-2.json']) {
        assert.equal(
            readFileSync(join(demosDirectory, 'experiments/json-feed/assets', file), 'utf8'),
            readFileSync(join(repository, 'playground/public/data', file), 'utf8')
        );
    }
});

test('stored ZIP output is deterministic and uses valid signatures and CRC32', () => {
    const entries = [
        { name: 'src/main.ts', content: 'console.log("ok");\n' },
        { name: 'café.txt', content: 'UTF-8 name\n' }
    ];
    const first = createStoredZip(entries);
    const second = createStoredZip([...entries].reverse());
    const view = new DataView(first.buffer, first.byteOffset, first.byteLength);

    assert.deepEqual(first, second);
    assert.equal(view.getUint32(0, true), 0x04034b50);
    assert.equal(view.getUint32(first.length - 22, true), 0x06054b50);
    assert.equal(crc32(new TextEncoder().encode('123456789')), 0xcbf43926);
});

test('download projects contain the runnable Vite contract and root dependency versions', () => {
    const demo = {
        id: 'core/sample',
        category: 'core',
        title: 'Sample',
        order: 1,
        level: 'start-here',
        markup: '<main>Sample</main>',
        style: 'main { color: cyan; }',
        typescript: "import './style.css';\nconst value: number = 1;\n",
        javascript: "import './style.css';\nconst value = 1;\n"
    };
    const typescriptFiles = new Map(
        createDemoProjectEntries(demo, 'typescript', projectDependencies).map((entry) => [
            entry.name,
            entry.content
        ])
    );
    const javascriptFiles = new Map(
        createDemoProjectEntries(demo, 'javascript', projectDependencies).map((entry) => [
            entry.name,
            entry.content
        ])
    );
    const typescriptManifest = JSON.parse(typescriptFiles.get('package.json'));
    const javascriptManifest = JSON.parse(javascriptFiles.get('package.json'));

    assert.deepEqual([...typescriptFiles.keys()].sort(), [
        'README.md',
        'index.html',
        'package.json',
        'src/main.ts',
        'src/style.css',
        'tsconfig.json',
        'vite.config.ts'
    ]);
    assert.deepEqual([...javascriptFiles.keys()].sort(), [
        'README.md',
        'index.html',
        'package.json',
        'src/main.js',
        'src/style.css',
        'vite.config.js'
    ]);
    for (const manifest of [typescriptManifest, javascriptManifest]) {
        assert.equal(manifest.dependencies[repositoryPackage.name], repositoryPackage.version);
        assert.equal(manifest.devDependencies.vite, repositoryPackage.devDependencies.vite);
        assert.equal(
            manifest.devDependencies.tailwindcss,
            repositoryPackage.devDependencies.tailwindcss
        );
        assert.equal(
            manifest.devDependencies['@tailwindcss/vite'],
            repositoryPackage.devDependencies['@tailwindcss/vite']
        );
    }
    assert.equal(
        typescriptManifest.devDependencies.typescript,
        repositoryPackage.devDependencies.typescript
    );
    assert.equal('typescript' in javascriptManifest.devDependencies, false);
    assert.equal(javascriptManifest.scripts.build, 'vite build');
    assert.match(javascriptFiles.get('index.html'), /src\/main\.js/);
    assert.match(typescriptFiles.get('index.html'), /src\/main\.ts/);
    assert.match(
        typescriptFiles.get('README.md'),
        /npm install[\s\S]*npm run dev[\s\S]*npm run build/
    );
    assert.match(javascriptFiles.get('src/style.css'), /@import 'tailwindcss'/);
    assert.doesNotMatch(javascriptFiles.get('src/main.js'), /: number/);
    assert.match(
        javascriptFiles.get('README.md'),
        /package must be\s+available from npm before `npm install` can complete/
    );
});
