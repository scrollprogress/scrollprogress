import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, existsSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { build } from 'vite';
import { assertThemeCss } from './consumer-bundle-cases.mjs';

export function productionThemeEntry(packageName, theme) {
    assert(['paper', 'neon-grid'].includes(theme), 'Unknown production theme');
    // Independent expectations: review these when intentionally changing theme tokens.
    const expected =
        theme === 'paper'
            ? { accent: '#2563eb', target: '#ca8a04', radius: '8px' }
            : { accent: '#22d3ee', target: '#22d3ee', radius: '10px' };
    return {
        html: '<!doctype html><html><head><meta charset="utf-8"><title>Packaged theme check</title></head><body><pre id="result">Running</pre><script type="module" src="./main.js"></script></body></html>',
        javascript: `import '${packageName}/debug/themes/${theme}.css';
import { createDebugPalette } from '${packageName}/debug/palette';
import { createDebugOverlay } from '${packageName}/debug/overlay';
const result = { theme: ${JSON.stringify(theme)}, passed: false };
const expected = ${JSON.stringify(expected)};
let palette, overlay;
function assert(value, message) { if (!value) throw new Error(message); }
try {
    palette = createDebugPalette({ theme: result.theme });
    overlay = createDebugOverlay({ theme: result.theme });
    const paletteElement = document.querySelector('.scroll-progress-debug-palette');
    const overlayElement = document.querySelector('.scroll-progress-debug-overlay');
    const paletteStyle = getComputedStyle(paletteElement);
    const overlayStyle = getComputedStyle(overlayElement);
    result.accent = paletteStyle.getPropertyValue('--sp-debug-palette-accent').trim();
    result.target = overlayStyle.getPropertyValue('--sp-debug-overlay-target-color').trim();
    result.radius = paletteStyle.borderRadius;
    assert(result.accent === expected.accent, 'Palette theme variable');
    assert(result.target === expected.target, 'Overlay theme variable');
    assert(result.radius === expected.radius, 'Visible palette radius');
    assert(paletteElement.querySelector('style')?.textContent.includes('.scroll-progress-debug-palette'), 'Embedded palette styles');
    assert(overlayElement.querySelector('style')?.textContent.includes('.scroll-progress-debug-overlay'), 'Embedded overlay styles');
    result.passed = true;
} catch (error) { result.error = String(error); }
finally {
    try { overlay?.destroy(); } catch (error) { result.passed = false; result.cleanupError = String(error); }
    try { palette?.destroy(); } catch (error) { result.passed = false; result.cleanupError = String(error); }
    result.cleaned = !document.querySelector('.scroll-progress-debug-palette, .scroll-progress-debug-overlay');
    result.passed = result.passed && result.cleaned;
    globalThis.scrollprogressThemeResult = result;
    document.querySelector('#result').textContent = JSON.stringify(result, null, 2);
}
`
    };
}

export function assertThemeHtml(output, theme) {
    const html = output.find((item) => item.type === 'asset' && item.fileName === 'index.html');
    assert(html, 'Missing production HTML');
    const links = [...String(html.source).matchAll(/<link\b[^>]*href="([^"?]+\.css)"[^>]*>/g)];
    assert(links.length > 0, 'Missing production stylesheet link');
    for (const [, href] of links) {
        const css = output.find((item) => item.type === 'asset' && `./${item.fileName}` === href);
        assert(css, `Missing linked stylesheet: ${href}`);
        assertThemeCss(String(css.source), theme);
    }
    for (const [, src] of String(html.source).matchAll(/<script\b[^>]*src="([^"]+)"/g)) {
        assert(
            output.some((item) => `./${item.fileName}` === src),
            `Missing linked script: ${src}`
        );
    }
}

export async function buildConsumerThemes(directory, packageName) {
    directory = realpathSync(directory);
    const reports = {};
    for (const theme of ['neon-grid', 'paper']) {
        const entry = productionThemeEntry(packageName, theme);
        const root = path.join(directory, 'theme-inputs', theme);
        const outDir = path.join(directory, 'browser', 'production-themes', theme);
        mkdirSync(root, { recursive: true });
        writeFileSync(path.join(root, 'index.html'), entry.html);
        writeFileSync(path.join(root, 'main.js'), entry.javascript);
        const result = await build({
            configFile: false,
            root,
            base: './',
            publicDir: false,
            logLevel: 'error',
            build: {
                outDir,
                emptyOutDir: true,
                target: ['chrome111', 'edge111', 'firefox114', 'safari16.4', 'ios16.4']
            }
        });
        assertThemeHtml(result.output, theme);
        const hashes = {};
        for (const item of result.output) {
            const file = path.join(outDir, item.fileName);
            assert(existsSync(file), `Missing written asset: ${file}`);
            hashes[item.fileName] = createHash('sha256').update(readFileSync(file)).digest('hex');
        }
        reports[theme] = {
            html: `production-themes/${theme}/index.html`,
            inputSha256: createHash('sha256')
                .update(entry.html)
                .update('\0')
                .update(entry.javascript)
                .digest('hex'),
            assets: hashes
        };
    }
    return reports;
}
