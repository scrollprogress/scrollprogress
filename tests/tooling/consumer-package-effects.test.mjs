import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, mkdtempSync, writeFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
    assertBareBundle,
    assertConsumerBundle,
    assertReaderBundle,
    assertThemeCss,
    consumerBundleCases
} from '../../scripts/consumer-bundle-cases.mjs';

const control = "globalThis.scrollprogressProbe = 'control';";
const marker = "globalThis.scrollprogressProbe = 'bare-palette';";
const chunk = (code) => ({ type: 'chunk', code });
const asset = (source) => ({ type: 'asset', fileName: 'theme.css', source });

test('bare imports preserve application code and reject residual implementation', () => {
    assertBareBundle('bare-palette', marker, control);
    for (const code of [
        '',
        `${marker} ['a', 'b'].join(', ');`,
        `${marker} const css = '.spdp-content {}';`,
        `${marker} function tracker() {}`
    ]) {
        assert.throws(() => assertBareBundle('bare-palette', code, control));
    }
});

test('both real themes support zero-JS output and reject missing or swapped CSS', () => {
    for (const theme of ['neon-grid', 'paper']) {
        const css = readFileSync(
            new URL(`../../src/lib/debug/themes/${theme}.css`, import.meta.url),
            'utf8'
        );
        assertConsumerBundle(`css-${theme}`, [asset(css)]);
        assert.throws(() => assertConsumerBundle(`css-${theme}`, []));
        assert.throws(() => assertThemeCss(css, theme === 'paper' ? 'neon-grid' : 'paper'));
        assert.throws(() =>
            assertThemeCss(css.replaceAll('--sp-debug-overlay-target-color', '--removed'), theme)
        );
        assert.throws(() => assertConsumerBundle('core', [chunk(css)]));
        assert.throws(() =>
            assertConsumerBundle('core', [chunk('globalThis.ok = true;'), asset(css)])
        );
    }
});

test('reader checks require a working function and reject retained tracker mechanisms', () => {
    assert.throws(() => assertReaderBundle('globalThis.scrollprogress = {};'));
    assert.throws(() =>
        assertReaderBundle('globalThis.scrollprogress = { readScrollProgress: () => 0 };')
    );
    assert.throws(() => assertReaderBundle('requestAnimationFrame(() => {});'), /tracker/);
});

test('case definitions preserve namespace probes and cover every unused runtime entry', () => {
    const cases = consumerBundleCases('example');
    assert.match(cases.core, /import \* as api/);
    assert.match(cases.theme, /scrollprogressTheme/);
    assert.equal(Object.keys(cases).filter((name) => name.startsWith('bare-')).length, 7);
    assert.equal(cases['css-paper'], "import 'example/debug/themes/paper.css';");
});

test('production theme HTML must reference the emitted stylesheet and script', async () => {
    const { productionThemeEntry, assertThemeHtml } =
        await import('../../scripts/consumer-theme-builds.mjs');
    for (const theme of ['paper', 'neon-grid']) {
        const entry = productionThemeEntry('example', theme);
        assert.match(entry.javascript, /createDebugPalette/);
        assert.match(entry.javascript, /finally/);
        const css = readFileSync(
            new URL(`../../src/lib/debug/themes/${theme}.css`, import.meta.url),
            'utf8'
        );
        const output = [
            asset(css),
            {
                type: 'asset',
                fileName: 'index.html',
                source: '<link rel="stylesheet" href="./theme.css"><script type="module" src="./app.js"></script>'
            },
            { ...chunk(''), fileName: 'app.js' }
        ];
        assertThemeHtml(output, theme);
        assert.throws(() => assertThemeHtml(output.slice(1), theme));
        assert.throws(() => assertThemeHtml(output.slice(0, 2), theme));
        assert.throws(() =>
            assertThemeHtml([{ type: 'asset', fileName: 'index.html', source: entry.html }], theme)
        );
    }
});

test('production HTML builds work through a temporary-directory alias outside the repository', async (t) => {
    const { buildConsumerThemes } = await import('../../scripts/consumer-theme-builds.mjs');
    const directory = mkdtempSync(path.join(tmpdir(), 'scrollprogress-theme-build-'));
    t.after(() => rmSync(directory, { recursive: true, force: true }));
    const consumer = path.join(directory, 'consumer');
    const installed = path.join(consumer, 'node_modules', 'theme-fixture');
    mkdirSync(installed, { recursive: true });
    writeFileSync(
        path.join(consumer, 'package.json'),
        JSON.stringify({ private: true, type: 'module' })
    );
    writeFileSync(
        path.join(installed, 'package.json'),
        JSON.stringify({
            name: 'theme-fixture',
            type: 'module',
            sideEffects: ['**/*.css'],
            exports: {
                './debug/themes/paper.css': './paper.css',
                './debug/themes/neon-grid.css': './neon-grid.css',
                './debug/palette': './view.js',
                './debug/overlay': './view.js'
            }
        })
    );
    writeFileSync(
        path.join(installed, 'view.js'),
        'export const createDebugPalette = () => ({ destroy() {} }); export const createDebugOverlay = createDebugPalette;'
    );
    for (const theme of ['paper', 'neon-grid']) {
        writeFileSync(
            path.join(installed, `${theme}.css`),
            readFileSync(new URL(`../../src/lib/debug/themes/${theme}.css`, import.meta.url))
        );
    }
    const alias = path.join(directory, 'alias');
    symlinkSync(consumer, alias, 'junction');
    const reports = await buildConsumerThemes(alias, 'theme-fixture');
    assert.deepEqual(Object.keys(reports), ['neon-grid', 'paper']);
    assert(Object.values(reports).every((report) => report.assets['index.html']));
});

test('theme selectors accept CSS quotes but not a backslash as a quote', () => {
    for (const theme of ['paper', 'neon-grid']) {
        const css = readFileSync(
            new URL(`../../src/lib/debug/themes/${theme}.css`, import.meta.url),
            'utf8'
        );
        for (const quote of ['', String.fromCharCode(34), String.fromCharCode(39)]) {
            assertThemeCss(css.replaceAll(`'${theme}'`, `${quote}${theme}${quote}`), theme);
        }
        assert.throws(() => assertThemeCss(css.replaceAll(`'${theme}'`, `\\${theme}\\`), theme));
    }
});
