import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const repositoryRoot = new URL('../../', import.meta.url);

function readRepositoryFile(path) {
    return readFileSync(new URL(path, repositoryRoot), 'utf8');
}

function getCustomPropertyDeclarations(source, prefix) {
    return Array.from(source.matchAll(new RegExp(`(${prefix}[a-z0-9-]+):\\s*([^;]+);`, 'g'))).map(
        ([, name, value]) => `${name}: ${value.replace(/\s+/g, ' ').trim()}`
    );
}

const components = [
    {
        name: 'palette',
        prefix: '--sp-debug-palette-',
        defaultTheme: 'src/lib/debug/palette/styles/_default-theme.scss',
        template: 'docs/examples/debug-palette-theme.css'
    },
    {
        name: 'overlay',
        prefix: '--sp-debug-overlay-',
        defaultTheme: 'src/lib/debug/overlay/styles/_default-theme.scss',
        template: 'docs/examples/debug-overlay-theme.css'
    }
];

for (const component of components) {
    test(`keeps the ${component.name} template aligned with its default theme`, () => {
        const defaultTheme = readRepositoryFile(component.defaultTheme);
        const template = readRepositoryFile(component.template);
        const defaultDeclarations = getCustomPropertyDeclarations(defaultTheme, component.prefix);
        const templateDeclarations = getCustomPropertyDeclarations(template, component.prefix);

        assert.deepEqual(templateDeclarations, defaultDeclarations);
        assert.notEqual(templateDeclarations.length, 0);
        assert.equal(template.includes(`${component.prefix}default-`), false);
        assert.equal(template.includes(`${component.prefix}token-`), false);
    });
}

const optionalThemes = [
    {
        name: 'neon-grid',
        path: 'src/lib/debug/themes/neon-grid.css'
    },
    {
        name: 'paper',
        path: 'src/lib/debug/themes/paper.css'
    }
];

const publicProperties = new Set(
    components.flatMap((component) => {
        return getCustomPropertyDeclarations(
            readRepositoryFile(component.template),
            component.prefix
        ).map((declaration) => declaration.slice(0, declaration.indexOf(':')));
    })
);

const layoutProperties = new Set([
    '--sp-debug-palette-viewport-spacing',
    '--sp-debug-palette-z-index',
    '--sp-debug-palette-width',
    '--sp-debug-palette-max-height',
    '--sp-debug-palette-padding',
    '--sp-debug-overlay-z-index',
    '--sp-debug-overlay-label-padding',
    '--sp-debug-overlay-label-offset'
]);

for (const theme of optionalThemes) {
    test(`keeps the ${theme.name} theme scoped to public visual properties`, () => {
        const source = readRepositoryFile(theme.path);

        assert(source.includes(`data-scroll-progress-debug-theme='${theme.name}'`));
        assert(
            source.includes(
                `.scroll-progress-debug-palette[data-scroll-progress-debug-theme='${theme.name}']`
            )
        );
        assert(
            source.includes(
                `.scroll-progress-debug-overlay[data-scroll-progress-debug-theme='${theme.name}']`
            )
        );

        const paletteDeclarations = getCustomPropertyDeclarations(source, '--sp-debug-palette-');
        const overlayDeclarations = getCustomPropertyDeclarations(source, '--sp-debug-overlay-');
        const declarations = [...paletteDeclarations, ...overlayDeclarations];

        assert.notEqual(paletteDeclarations.length, 0);
        assert.notEqual(overlayDeclarations.length, 0);

        for (const declaration of declarations) {
            const property = declaration.slice(0, declaration.indexOf(':'));

            assert(publicProperties.has(property), `Unknown theme property: ${property}`);
            assert.equal(
                layoutProperties.has(property),
                false,
                `Theme changes layout: ${property}`
            );
            assert.equal(property.includes('-default-'), false);
            assert.equal(property.includes('-token-'), false);
        }
    });
}
