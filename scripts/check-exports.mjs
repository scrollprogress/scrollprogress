const coreExports = ['readScrollProgress', 'trackScrollProgress'];

const debugExports = ['debugScrollProgress'];

const registryExports = [
    'getScrollProgressDebugRegistryState',
    'registerScrollProgressDebugItem',
    'selectScrollProgressDebugItem',
    'subscribeScrollProgressDebugRegistry'
];

const paletteExports = ['createDebugPalette', 'registerDebugPaletteControlGroup'];

const consoleExports = ['createDebugConsoleLogger'];

const overlayExports = ['createDebugOverlay'];

const sessionExports = ['createScrollProgressDebugger'];

const exportChecks = [
    {
        specifier: '@scrollprogress/scrollprogress',
        expected: coreExports
    },
    {
        specifier: '@scrollprogress/scrollprogress/debug',
        expected: debugExports
    },
    {
        specifier: '@scrollprogress/scrollprogress/debug/registry',
        expected: registryExports
    },
    {
        specifier: '@scrollprogress/scrollprogress/debug/palette',
        expected: paletteExports
    },
    {
        specifier: '@scrollprogress/scrollprogress/debug/console',
        expected: consoleExports
    },
    {
        specifier: '@scrollprogress/scrollprogress/debug/overlay',
        expected: overlayExports
    },
    {
        specifier: '@scrollprogress/scrollprogress/debug/session',
        expected: sessionExports
    }
];

let hasFailed = false;

for (const check of exportChecks) {
    const moduleExports = await import(check.specifier);
    const exportNames = Object.keys(moduleExports).sort();

    console.log(`\n${check.specifier}`);
    console.log(exportNames);

    for (const expectedExport of check.expected) {
        if (!(expectedExport in moduleExports)) {
            hasFailed = true;
            console.error(`Missing export: ${expectedExport}`);
        }
    }

    for (const unexpectedExport of exportNames) {
        if (!check.expected.includes(unexpectedExport)) {
            hasFailed = true;
            console.error(`Unexpected export: ${unexpectedExport}`);
        }
    }
}

if (hasFailed) {
    process.exitCode = 1;
}
