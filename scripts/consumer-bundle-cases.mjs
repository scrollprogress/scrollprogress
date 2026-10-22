import assert from 'node:assert/strict';
import vm from 'node:vm';
import ts from 'typescript';

export const runtimeEntries = {
    core: '',
    bridge: '/debug',
    registry: '/debug/registry',
    console: '/debug/console',
    palette: '/debug/palette',
    overlay: '/debug/overlay',
    session: '/debug/session'
};

export function consumerBundleCases(packageName) {
    const pkg = { name: packageName };
    const cases = {
        core: `import * as api from '${pkg.name}'; globalThis.scrollprogress = api;`,
        registry: `import * as api from '${pkg.name}/debug/registry'; globalThis.scrollprogress = api;`,
        bridge: `import * as api from '${pkg.name}/debug'; globalThis.scrollprogress = api;`,
        console: `import * as api from '${pkg.name}/debug/console'; globalThis.scrollprogress = api;`,
        palette: `import * as api from '${pkg.name}/debug/palette'; globalThis.scrollprogress = api;`,
        overlay: `import * as api from '${pkg.name}/debug/overlay'; globalThis.scrollprogress = api;`,
        session: `import * as api from '${pkg.name}/debug/session'; globalThis.scrollprogress = api;`,
        theme: `import '${pkg.name}/debug/themes/neon-grid.css'; globalThis.scrollprogressTheme = 'neon-grid';`,
        combined: `import * as core from '${pkg.name}'; import * as debug from '${pkg.name}/debug'; import * as registry from '${pkg.name}/debug/registry'; import * as palette from '${pkg.name}/debug/palette'; import * as overlay from '${pkg.name}/debug/overlay'; import * as session from '${pkg.name}/debug/session'; globalThis.scrollprogress = {core, debug, registry, palette, overlay, session};`
    };

    cases.control = `globalThis.scrollprogressProbe = 'control';`;
    for (const [name, entry] of Object.entries(runtimeEntries)) {
        cases[`bare-${name}`] =
            `import '${packageName}${entry}'; globalThis.scrollprogressProbe = 'bare-${name}';`;
    }
    cases.reader = `import { readScrollProgress } from '${packageName}'; globalThis.scrollprogress = { readScrollProgress };`;
    for (const theme of ['neon-grid', 'paper']) {
        cases[`css-${theme}`] = `import '${packageName}/debug/themes/${theme}.css';`;
    }
    // Build the marker-only control before the removal probes.
    return { control: cases.control, ...cases };
}

export function bundleOutput(output) {
    const chunks = output.filter((item) => item.type === 'chunk');
    const assets = output.filter((item) => item.type === 'asset' && item.fileName.endsWith('.css'));
    const code = chunks.map((chunk) => chunk.code).join('\n');
    const css = assets.map((asset) => String(asset.source)).join('\n');
    return { chunks, assets, code, css, bundledSource: `${code}\n${css}` };
}

export function assertThemeCss(css, theme) {
    assert(['neon-grid', 'paper'].includes(theme), 'Unknown theme');
    for (const component of ['palette', 'overlay']) {
        assert(
            new RegExp(
                `\\.scroll-progress-debug-${component}\\[data-scroll-progress-debug-theme=["']?${theme}["']?\\]`
            ).test(css),
            `Missing ${theme} ${component} selector`
        );
    }
    assert(css.includes('--sp-debug-palette-accent'), 'Missing palette variables');
    assert(css.includes('--sp-debug-overlay-target-color'), 'Missing overlay variables');
    const other = theme === 'paper' ? 'neon-grid' : 'paper';
    assert(
        !new RegExp(`data-scroll-progress-debug-theme=["']?${other}`).test(css),
        'Unexpected other theme'
    );
}

function normalizedProgram(code) {
    const source = ts.createSourceFile(
        'bundle.js',
        code,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.JS
    );
    return ts.createPrinter({ removeComments: true }).printFile(source);
}

export function assertBareBundle(name, code, control) {
    const context = {};
    vm.runInNewContext(code, context, { timeout: 1000 });
    assert.equal(context.scrollprogressProbe, name, 'Application marker missing');
    assert.equal(
        normalizedProgram(code.replaceAll(name, 'control')),
        normalizedProgram(control),
        'Unused JS remains'
    );
}

export function assertReaderBundle(code) {
    assert(
        !/IntersectionObserver|ResizeObserver|requestAnimationFrame|addEventListener|non-positive/.test(
            code
        ),
        'Reader retains tracker code'
    );
    // Minimal DOM geometry needed by a public one-shot read.
    // (viewport * start - top) / (size + viewport * start - viewport * end)
    // = (1000 * 1 - 500) / (100 + 1000 * 1 - 1000 * 0) = 5 / 11.
    const context = { window: { innerWidth: 1000, innerHeight: 1000 }, document: {} };
    class Element {}
    class HTMLElement extends Element {
        ownerDocument = context.document;
        isConnected = true;
        getClientRects() {
            return [{}];
        }
        getBoundingClientRect() {
            return { top: 500, left: 500, width: 100, height: 100 };
        }
    }
    Object.assign(context, { Element, HTMLElement });
    vm.runInNewContext(code, context, { timeout: 1000 });
    assert.equal(
        context.scrollprogress.readScrollProgress(new HTMLElement(), { start: 1, end: 0 }),
        5 / 11
    );
}

export function assertConsumerBundle(name, output, control) {
    const { chunks, code, css, bundledSource, assets } = bundleOutput(output);
    const theme = name === 'theme' ? 'neon-grid' : name.startsWith('css-') ? name.slice(4) : null;
    if (!name.startsWith('css-'))
        assert.equal(chunks.length, 1, 'Static JS imports should produce one bundle');
    if (theme) {
        assert(assets.length > 0, 'Missing emitted CSS');
        assertThemeCss(css, theme);
    } else {
        assert(
            !/data-scroll-progress-debug-theme=["']?(?:neon-grid|paper)/.test(bundledSource),
            `${name} bundles optional themes`
        );
        assert.equal(css, '', 'Unexpected stylesheet');
    }
    if (name === 'core' || name === 'reader' || name.startsWith('bare-')) {
        assert(
            !/scroll-progress-debug|spdp-|spdo-|console\.table/.test(code),
            `${name} bundles debug`
        );
    }
    if (name.startsWith('bare-')) assertBareBundle(name, code, control);
    if (name === 'reader') assertReaderBundle(code);
    return {
        chunks: chunks.length,
        cssAssets: assets.map((asset) => asset.fileName),
        passed: true
    };
}
