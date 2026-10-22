import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import test from 'node:test';
import { build } from 'vite';
import { assertDemoSelectors } from '../../playground/tooling/vite/demo-retention.ts';

test('a private playground boundary retains bare-import demo initialization', async (t) => {
    const directory = realpathSync(mkdtempSync(path.join(tmpdir(), 'scrollprogress-effects-')));
    t.after(() => rmSync(directory, { recursive: true, force: true }));
    writeFileSync(
        path.join(directory, 'package.json'),
        JSON.stringify({ type: 'module', sideEffects: ['**/*.css'] })
    );
    const playground = path.join(directory, 'playground');
    mkdirSync(playground);
    writeFileSync(
        path.join(playground, 'index.html'),
        '<script type="module" src="./page.js"></script>'
    );
    writeFileSync(
        path.join(playground, 'page.js'),
        "import './demo.js'; globalThis.applicationMarker = true;"
    );
    writeFileSync(path.join(playground, 'demo.js'), 'globalThis.demoMarker = true;');
    const assertRetained = (context) => assert.equal(context.demoMarker, true);
    for (const boundary of [false, true]) {
        if (boundary)
            writeFileSync(
                path.join(playground, 'package.json'),
                JSON.stringify({ private: true, type: 'module', sideEffects: true })
            );
        const result = await build({
            configFile: false,
            root: playground,
            logLevel: 'silent',
            build: { write: false, modulePreload: false }
        });
        const code = result.output
            .filter((item) => item.type === 'chunk')
            .map((item) => item.code)
            .join('\n');
        const context = {};
        vm.runInNewContext(code, context);
        assert.equal(context.applicationMarker, true);
        if (boundary) assertRetained(context);
        else assert.throws(() => assertRetained(context));
    }
});

test('displayed source strings cannot stand in for executable demo selectors', () => {
    const selector = '[data-debug-target]';
    assertDemoSelectors(`document.querySelector('${selector}')`, [selector], 'debug');
    assertDemoSelectors(
        `document.querySelector<HTMLElement>('${selector}')`,
        [selector],
        'typed debug'
    );
    assert.throws(
        () =>
            assertDemoSelectors(
                `globalThis.displayedSource = ${JSON.stringify(`document.querySelector('${selector}')`)};`,
                [selector],
                'debug'
            ),
        /Missing executable/
    );
});

test('retention follows renamed build inputs and requires every declared demo import', async (t) => {
    const { validateDemoRetention } =
        await import('../../playground/tooling/vite/demo-retention.ts');
    const { demoMarkerPattern } = await import('../../playground/tooling/vite/demo-includes.ts');
    const directory = realpathSync(mkdtempSync(path.join(tmpdir(), 'scrollprogress-demo-graph-')));
    t.after(() => rmSync(directory, { recursive: true, force: true }));
    const demo = path.join(directory, 'demos/core/sample');
    mkdirSync(demo, { recursive: true });
    writeFileSync(path.join(demo, 'main.ts'), "document.querySelector('[data-sample]');");
    const htmlPath = path.join(directory, 'renamed.html');
    writeFileSync(
        htmlPath,
        '<!-- playground-demo:core/sample --><script type="module" src="./different.ts"></script>'
    );
    const entry = path.join(directory, 'different.ts');
    writeFileSync(entry, "import './demos/core/sample/main';");
    const plugin = validateDemoRetention(directory);
    plugin.configResolved({
        root: directory,
        build: { rolldownOptions: { input: { added: htmlPath } } }
    });
    const bundle = {
        'renamed.html': {
            type: 'asset',
            source: '<script type="module" src="/nested-base/assets/entry.js"></script>'
        },
        'assets/entry.js': {
            type: 'chunk',
            imports: [],
            code: "document.querySelector('[data-sample]');"
        }
    };
    demoMarkerPattern.lastIndex = 10;
    plugin.writeBundle({}, bundle);
    plugin.writeBundle({}, bundle);
    demoMarkerPattern.lastIndex = 0;
    writeFileSync(entry, 'globalThis.viewer = "import \'./demos/core/sample/main\';";');
    assert.throws(() => plugin.writeBundle({}, bundle), /Missing declared demo import/);
    rmSync(entry);
    assert.throws(() => plugin.writeBundle({}, bundle), /Missing demo source script/);
    writeFileSync(htmlPath, '<!-- playground-demo:core/sample -->');
    assert.throws(() => plugin.writeBundle({}, bundle), /Missing demo module script/);
    writeFileSync(htmlPath, '<p>A demo-free landing page</p>');
    plugin.writeBundle({}, bundle);
    rmSync(htmlPath);
    assert.throws(() => plugin.writeBundle({}, bundle), /ENOENT/);
});
