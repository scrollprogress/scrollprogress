import assert from 'node:assert/strict';
import {
    copyFileSync,
    cpSync,
    existsSync,
    mkdirSync,
    mkdtempSync,
    readFileSync,
    realpathSync,
    rmSync,
    symlinkSync,
    writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { build, resolveConfig } from 'vite';

const repository = fileURLToPath(new URL('../../', import.meta.url));
const fixtureHtml = '<!doctype html><html><body>Playground fixture</body></html>';
const playgroundPages = [
    'index.html',
    'core.html',
    'experiments.html',
    'debug.html',
    'viewport-x.html'
];

function createPlaygroundFixture(t) {
    const directory = realpathSync(mkdtempSync(join(tmpdir(), 'scrollprogress-playground-test-')));

    t.after(() => rmSync(directory, { recursive: true, force: true }));

    const playground = join(directory, 'playground');
    const configFile = join(directory, 'vite.config.ts');

    mkdirSync(playground);
    copyFileSync(join(repository, 'vite.config.ts'), configFile);
    copyFileSync(join(repository, 'package.json'), join(directory, 'package.json'));
    cpSync(join(repository, 'playground/tooling'), join(playground, 'tooling'), {
        recursive: true
    });

    symlinkSync(join(repository, 'node_modules'), join(directory, 'node_modules'), 'junction');

    for (const page of playgroundPages) {
        writeFileSync(join(playground, page), fixtureHtml);
    }

    const config = {
        root: playground,
        configFile,
        logLevel: 'silent'
    };

    return {
        directory,
        playground,
        config,

        runBuild(outDir) {
            return build({
                ...config,
                build: outDir === undefined ? {} : { outDir }
            });
        }
    };
}

test('builds in playground/dist and replaces only generated output', async (t) => {
    const app = createPlaygroundFixture(t);
    const output = join(app.playground, 'dist');

    mkdirSync(output);
    writeFileSync(join(output, 'stale.txt'), 'Old generated output');

    await app.runBuild();

    for (const page of playgroundPages) {
        assert.equal(existsSync(join(output, page)), true);
    }
    assert.equal(existsSync(join(output, 'stale.txt')), false);
    assert.equal(readFileSync(join(app.playground, 'index.html'), 'utf8'), fixtureHtml);

    const resolvedFromRepository = await resolveConfig(
        { ...app.config, root: app.directory },
        'build'
    );

    assert.equal(resolve(resolvedFromRepository.root, resolvedFromRepository.build.outDir), output);
});

test('accepts custom output directories inside playground', async (t) => {
    const app = createPlaygroundFixture(t);

    for (const outDir of ['build', 'previews/desktop', join(app.playground, 'absolute-build')]) {
        await app.runBuild(outDir);

        const output = resolve(app.playground, outDir);

        for (const page of playgroundPages) {
            assert.equal(existsSync(join(output, page)), true);
        }
    }
});

test('rejects the playground root and outside paths without changing their files', async (t) => {
    const app = createPlaygroundFixture(t);
    const outside = join(app.directory, 'outside');

    mkdirSync(outside);
    writeFileSync(join(outside, 'keep.txt'), 'Keep me');

    for (const outDir of ['.', '..', '../outside', '../playground-other', outside]) {
        await assert.rejects(app.runBuild(outDir), /outDir must be a subdirectory of playground/);

        assert.equal(readFileSync(join(outside, 'keep.txt'), 'utf8'), 'Keep me');
        assert.equal(readFileSync(join(app.playground, 'index.html'), 'utf8'), fixtureHtml);
    }

    assert.equal(existsSync(join(app.directory, 'playground-other')), false);
});

test('rejects output paths through existing and broken directory links', async (t) => {
    const app = createPlaygroundFixture(t);
    const outside = join(app.directory, 'outside');
    const missing = join(app.directory, 'missing');

    mkdirSync(outside);
    writeFileSync(join(outside, 'keep.txt'), 'Keep me');

    symlinkSync(outside, join(app.playground, 'linked'), 'junction');
    symlinkSync(missing, join(app.playground, 'broken'), 'junction');

    for (const outDir of ['linked', 'linked/nested', 'broken/nested']) {
        await assert.rejects(app.runBuild(outDir), /outDir cannot use symbolic links/);
    }

    assert.equal(readFileSync(join(outside, 'keep.txt'), 'utf8'), 'Keep me');
    assert.equal(existsSync(join(outside, 'nested')), false);
    assert.equal(existsSync(missing), false);
});

test('reports missing and duplicate demo include markers', async (t) => {
    const missing = createPlaygroundFixture(t);
    writeFileSync(
        join(missing.playground, 'index.html'),
        '<!-- playground-demo:core/not-there -->'
    );
    await assert.rejects(missing.runBuild(), /Missing markup for demo "core\/not-there"/);

    const duplicate = createPlaygroundFixture(t);
    const demoDirectory = join(duplicate.playground, 'demos/core/sample');
    mkdirSync(demoDirectory, { recursive: true });
    writeFileSync(join(demoDirectory, 'markup.html'), '<p>Sample</p>');
    writeFileSync(
        join(duplicate.playground, 'index.html'),
        '<!-- playground-demo:core/sample --><!-- playground-demo:core/sample -->'
    );
    await assert.rejects(duplicate.runBuild(), /Duplicate demo marker: core\/sample/);
});
