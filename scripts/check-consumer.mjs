import { consumerCandidateMetadata } from './candidate-identity.mjs';
import { buildConsumerThemes } from './consumer-theme-builds.mjs';
import {
    consumerBundleCases,
    bundleOutput,
    assertConsumerBundle
} from './consumer-bundle-cases.mjs';
import {
    copyFixtureFiles,
    fixtureIdentity
} from '../tests/browser/tooling/browser-fixture-hash.mjs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
    copyFileSync,
    mkdirSync,
    readFileSync,
    writeFileSync,
    realpathSync,
    existsSync
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { gzipSync } from 'node:zlib';
import { parseArgs } from 'node:util';
import { build, createServer } from 'vite';
import { createConsumerWorkspace } from './consumer-workspace.mjs';
import { checkPlaygroundDemoProjects } from './check-playground-demos.mjs';

const { values: options } = parseArgs({
    options: {
        serve: { type: 'boolean', default: false },
        external: { type: 'boolean', default: false },
        name: { type: 'string', default: 'consumer' },
        host: { type: 'string', default: '127.0.0.1' }
    }
});
// npm supplies its JS entry point to scripts on macOS, Linux and Windows.
// Running it with Node avoids shell quoting and the Windows npm.cmd wrapper.
const npmCli = process.env.npm_execpath;
assert(npmCli, 'Run npm run consumer:check or npm run consumer:browser from the repository root.');
const repository = process.cwd();
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const resultsDirectory = path.join(repository, 'test-results');
mkdirSync(resultsDirectory, { recursive: true });
let server;
const workspace = createConsumerWorkspace(repository, () => server?.close(), options);
const { directory } = workspace;
console.log(
    options.external
        ? `Temporary consumer (removed on exit): ${directory}`
        : `Consumer directory (kept after exit): ${directory}`
);
const cache = path.join(directory, 'cache');
function command(executable, args, cwd = directory) {
    const result = spawnSync(executable, args, { cwd, encoding: 'utf8' });
    if (result.error) throw result.error;
    if (result.status !== 0) {
        process.stderr.write(result.stdout ?? '');
        process.stderr.write(result.stderr ?? '');
        throw new Error(`${executable} ${args.join(' ')} exited ${result.status}`);
    }
    return result.stdout;
}
const packed = JSON.parse(
    command(
        process.execPath,
        [
            npmCli,
            'pack',
            '--json',
            '--ignore-scripts',
            '--cache',
            cache,
            '--pack-destination',
            directory
        ],
        repository
    )
)[0];
const tarball = path.join(directory, packed.filename);
for (const { path: file } of packed.files) {
    const isPackagedDebugTheme = /^src\/lib\/debug\/themes\/(?:neon-grid|paper)\.css$/.test(file);

    assert(
        isPackagedDebugTheme ||
            !/\.map$|\.DS_Store|(?:^|\/)(?:src|tests|scripts|playground|artifacts|test-results|\.git|\.npmrc)(?:\/|$)/.test(
                file
            ),
        `Unwanted file: ${file}`
    );
}
for (const file of ['README.md', 'CHANGELOG.md'])
    assert(
        packed.files.some((item) => item.path === file),
        `Missing ${file}`
    );
// LICENSE is mandatory only once a publication license has been selected.
if (!pkg.private)
    assert(
        packed.files.some((item) => item.path === 'LICENSE'),
        'Public package requires LICENSE'
    );
writeFileSync(
    path.join(directory, 'package.json'),
    JSON.stringify({ private: true, type: 'module' }, null, 2)
);
command(process.execPath, [
    npmCli,
    'install',
    '--offline',
    '--ignore-scripts',
    '--no-audit',
    '--no-fund',
    '--cache',
    cache,
    tarball
]);
const installed = path.join(directory, 'node_modules', pkg.name);
assert.equal(
    realpathSync(installed),
    path.join(realpathSync(directory), 'node_modules', pkg.name),
    'Package must not be a workspace symlink'
);
const installedPackage = JSON.parse(readFileSync(path.join(installed, 'package.json'), 'utf8'));
assert.equal(installedPackage.name, pkg.name);
assert.equal(installedPackage.version, pkg.version);
assert.deepEqual(installedPackage.sideEffects, ['**/*.css']);
assert(!installedPackage.dependencies || Object.keys(installedPackage.dependencies).length === 0);
for (const entry of Object.values(installedPackage.exports)) {
    if (typeof entry === 'string') {
        assert(existsSync(path.join(installed, entry)));
        continue;
    }

    assert(existsSync(path.join(installed, entry.import)));
    assert(existsSync(path.join(installed, entry.types)));
}
// Check the relative inline file links used by the distributed Markdown guides.
// This does not claim to validate remote URLs or Markdown heading anchors.
for (const { path: file } of packed.files.filter((item) => item.path.endsWith('.md'))) {
    const markdown = readFileSync(path.join(installed, file), 'utf8');
    for (const match of markdown.matchAll(/\]\(([^\s)]+)\)/g)) {
        const link = match[1];
        if (/^(?:[a-z][a-z\d+.-]*:|#|\/\/)/i.test(link)) continue;
        const target = decodeURIComponent(link.split(/[?#]/)[0]);
        assert(
            existsSync(path.resolve(installed, path.dirname(file), target)),
            `Broken packaged link in ${file}: ${link}`
        );
    }
}
writeFileSync(path.join(directory, 'exports.mjs'), readFileSync('scripts/check-exports.mjs'));
command(process.execPath, ['exports.mjs']); // All JavaScript entries, without window/document.
const playgroundDemoCheck = await checkPlaygroundDemoProjects({
    repository,
    consumerDirectory: directory,
    tarball,
    npmCli,
    packageManifest: pkg
});

const types = `import { readScrollProgress, trackScrollProgress,
    type ReadScrollProgressOptions,
    type ScrollDirection, type ScrollProgressAxis, type ScrollProgressCssVar,
    type ScrollProgressDestroyCallback,
    type ScrollProgressDirection, type ScrollProgressObserverThreshold,
    type ScrollProgressRange, type ScrollProgressRoot, type ScrollProgressRootMargin,
    type ScrollProgressState, type ScrollProgressTracker, type TrackScrollProgressConfig,
    type TrackScrollProgressOptions,
    type ScrollProgressStateSubscriber, type ScrollProgressUnsubscribe } from '${pkg.name}';
import * as debug from '${pkg.name}/debug';
import { registerScrollProgressDebugItem, type ScrollProgressDebugItemController, type ScrollProgressDebugRegistrySubscriber } from '${pkg.name}/debug/registry';
import { createDebugPalette, registerDebugPaletteControlGroup, type ScrollProgressDebugPaletteOptions, type ScrollProgressDebugPaletteController } from '${pkg.name}/debug/palette';
import { createDebugConsoleLogger, type ScrollProgressDebugConsoleLoggerController, type ScrollProgressDebugConsoleLoggerOptions } from '${pkg.name}/debug/console';
import * as overlay from '${pkg.name}/debug/overlay';
import { createScrollProgressDebugger, type ScrollProgressDebuggerController, type ScrollProgressDebuggerOptions, type ScrollProgressDebuggerSingleTrackerOptions, type ScrollProgressDebuggerToolsOptions, type ScrollProgressDebuggerTrackerController, type ScrollProgressDebuggerTrackerRegistration } from '${pkg.name}/debug/session';
const options: TrackScrollProgressOptions = { axis: 'x', root: document, start: 1.2, end: -0.1, observerThreshold: [0, 1] };
const tracker: ScrollProgressTracker = trackScrollProgress(document.body, options);
const config: TrackScrollProgressConfig = tracker.getConfig();
const state: ScrollProgressState | null = tracker.getState();
const fn: ScrollProgressStateSubscriber = state => console.log(state.progress);
const onDestroy: ScrollProgressDestroyCallback = () => console.log('destroyed');
const unsubscribe: ScrollProgressUnsubscribe = tracker.subscribe(fn);
const unsubscribeDestroy = tracker.onDestroy(onDestroy);
const bridge: debug.ScrollProgressDebugBridgeController = debug.debugScrollProgress(tracker, { label: 'consumer' });
const readOptions: ReadScrollProgressOptions = { start: 1, end: 0, axis: 'y', root: null };
const debugItem: ScrollProgressDebugItemController = registerScrollProgressDebugItem({ element: document.body, label: 'consumer item' });
const registrySubscriber: ScrollProgressDebugRegistrySubscriber = registryState => console.log(registryState.selectedId);
const controls = registerDebugPaletteControlGroup({ label: 'Consumer', controls: [{ id: 'copy', type: 'button', label: 'Copy', onActivate: ({ selectedItem }) => console.log(selectedItem) }] });
const palette: ScrollProgressDebugPaletteController = createDebugPalette({ theme: 'consumer' } satisfies ScrollProgressDebugPaletteOptions);
const loggerOptions: ScrollProgressDebugConsoleLoggerOptions = { throttleMs: 100 };
const logger: ScrollProgressDebugConsoleLoggerController = createDebugConsoleLogger(loggerOptions);
const view: overlay.ScrollProgressDebugOverlay = overlay.createDebugOverlay({ theme: 'consumer', visibleLayers: ['target'], colors: { target: { color: 'red' } } });
const sessionTools: ScrollProgressDebuggerToolsOptions = { palette: false, overlay: true, console: { throttleMs: 100 } };
const sessionTrackers: ScrollProgressDebuggerTrackerRegistration[] = [{ tracker, label: 'session consumer' }];
const sessionOptions: ScrollProgressDebuggerOptions = { trackers: sessionTrackers, ...sessionTools };
const singleSessionOptions: ScrollProgressDebuggerSingleTrackerOptions = { label: 'single consumer', palette: true };
const debuggerSession: ScrollProgressDebuggerController = createScrollProgressDebugger(sessionOptions);
const singleDebuggerSession: ScrollProgressDebuggerController = createScrollProgressDebugger(tracker, singleSessionOptions);
const sessionTracker: ScrollProgressDebuggerTrackerController = debuggerSession.addTracker(tracker, { label: 'dynamic consumer' });
// @ts-expect-error Session controllers intentionally do not expose owned tool controllers.
void debuggerSession.tools;
const measured: number | null = readScrollProgress(document.body, readOptions);
console.log(measured, config, state);
void registrySubscriber;
// @ts-expect-error Public state snapshots are read-only.
if (state) state.progress = 1;
unsubscribe(); unsubscribeDestroy(); sessionTracker.detach(); debuggerSession.destroy(); singleDebuggerSession.destroy(); controls.destroy(); debugItem.destroy(); view.destroy(); palette.destroy(); logger.destroy(); bridge.destroy(); tracker.destroy();
`;
writeFileSync(path.join(directory, 'types.ts'), types);
const typescriptCompilers = [
    { packageDirectory: 'typescript-5-5', version: '5.5.4' },
    { packageDirectory: 'typescript-5-9', version: '5.9.3' },
    { packageDirectory: 'typescript', version: '6.0.3' }
];
for (const compiler of typescriptCompilers) {
    const compilerDirectory = path.join(repository, 'node_modules', compiler.packageDirectory);
    const compilerPackage = JSON.parse(
        readFileSync(path.join(compilerDirectory, 'package.json'), 'utf8')
    );
    assert.equal(
        compilerPackage.version,
        compiler.version,
        `Expected TypeScript ${compiler.version}, received ${compilerPackage.version}`
    );
    const tsc = path.join(compilerDirectory, 'bin/tsc');
    for (const mode of ['Bundler', 'NodeNext']) {
        const config = `tsconfig.typescript-${compiler.version}.${mode.toLowerCase()}.json`;
        writeFileSync(
            path.join(directory, config),
            JSON.stringify(
                {
                    files: ['types.ts'],
                    compilerOptions: {
                        noEmit: true,
                        strict: true,
                        skipLibCheck: false,
                        target: 'ES2023',
                        lib: ['ES2023', 'DOM', 'DOM.Iterable'],
                        types: [],
                        module: mode === 'Bundler' ? 'ESNext' : 'NodeNext',
                        moduleResolution: mode
                    }
                },
                null,
                2
            )
        );
        command(process.execPath, [tsc, '--project', config]);
    }
}
const cases = consumerBundleCases(pkg.name);
const controls = {};
const probeResults = {};
const sizes = {};
for (const [name, source] of Object.entries(cases)) {
    const input = path.join(directory, `${name}.js`);
    writeFileSync(input, source);
    sizes[name] = {};
    for (const minify of [false, 'oxc']) {
        const result = await build({
            configFile: false,
            root: directory,
            publicDir: false,
            logLevel: 'error',
            build: {
                target: ['chrome111', 'edge111', 'firefox114', 'safari16.4', 'ios16.4'],
                minify,
                write: false,
                rolldownOptions: { input },
                sourcemap: false
            }
        });
        const { code, bundledSource } = bundleOutput(result.output);
        const mode = minify ? 'minified' : 'unminified';
        if (name === 'control') controls[mode] = code;
        probeResults[`${name}:${mode}`] = assertConsumerBundle(name, result.output, controls[mode]);

        sizes[name][minify ? 'minified' : 'unminified'] = Buffer.byteLength(bundledSource);
        if (minify) sizes[name].gzip = gzipSync(bundledSource, { level: 9 }).length;
    }
}

const productionThemes = await buildConsumerThemes(directory, pkg.name);

// Copy the committed browser fixture so every browser import resolves from this
// real installation. No repository source aliases or package symlinks are used.
copyFixtureFiles(path.join(repository, 'tests/browser'), path.join(directory, 'browser'));
const report = {
    time: new Date().toISOString(),
    node: process.version,
    platform: `${os.platform()} ${os.release()} ${os.arch()}`,
    package: `${pkg.name}@${pkg.version}`,
    directory,
    mode: options.external ? 'external-isolated' : 'project-local',
    cleanup: options.external
        ? 'Removed on exit; interrupted runs recovered on the next run for this checkout.'
        : 'Kept after exit. Replaced on the next run with the same name; safe to delete when no command is using it.',
    tarball: path.join(resultsDirectory, 'consumer-latest.tgz'),
    sha256: createHash('sha256').update(readFileSync(tarball)).digest('hex'),
    pack: {
        files: packed.files.length,
        bytes: packed.size,
        unpackedBytes: packed.unpackedSize,
        integrity: packed.integrity
    },
    checks: [
        'real tarball installed without symlinks',
        'packaged Markdown relative file links',
        'exact exports and DOM-free import',
        `${playgroundDemoCheck.demos} playground demos against the packed package`,
        `${playgroundDemoCheck.projects} generated download project builds`,
        ...typescriptCompilers.flatMap(({ version }) => [
            `TypeScript ${version} Bundler`,
            `TypeScript ${version} NodeNext`
        ]),
        'consumer bundles',
        'installed sideEffects CSS declaration',
        'both optional CSS theme exports and production HTML links',
        'unused runtime entries match marker-only controls',
        'reader executes without tracker/debug code',
        'core excludes debug'
    ],
    sizes,
    probeResults,
    productionThemes,
    ...consumerCandidateMetadata(options, repository),
    pending: [
        'physical iOS Safari / Android Chrome viewport x',
        ...(pkg.private ? ['npm scope permissions and publication authorization'] : [])
    ]
};
writeFileSync(
    path.join(directory, 'browser/package-info.json'),
    JSON.stringify(
        {
            package: report.package,
            sha256: report.sha256,
            mode: report.mode,
            preparedAt: report.time,
            ...fixtureIdentity(path.join(repository, 'tests/browser'))
        },
        null,
        2
    ) + '\n'
);
// Replace fixed filenames only after a successful check; do not accumulate archives.
const reportFile = path.join(resultsDirectory, 'consumer-latest.json');
copyFileSync(tarball, report.tarball);
writeFileSync(
    path.join(directory, 'report.json'),
    JSON.stringify({ ...report, tarball }, null, 2) + '\n'
);
writeFileSync(reportFile, JSON.stringify(report, null, 2) + '\n');
if (!options.serve) {
    console.log(JSON.stringify(report, null, 2));
    workspace.cleanup();
    console.log(
        options.external
            ? 'Temporary consumer removed. Results: test-results/consumer-latest.json'
            : `Consumer files kept: ${directory}\nResults: test-results/consumer-latest.json`
    );
} else {
    console.log(`\nConsumer checks passed: ${report.package}`);
    console.log(`Tarball SHA-256: ${report.sha256}`);
    console.log('Full report: test-results/consumer-latest.json');
    console.log(`Installed consumer: ${directory}`);
    server = await createServer({
        configFile: false,
        root: path.join(directory, 'browser'),
        publicDir: false,
        clearScreen: false,
        server: { host: options.host, port: 4174, open: false }
    });
    await server.listen();
    console.log('\nOpen one of these HTTP links in your browser:');
    for (const base of [...server.resolvedUrls.local, ...server.resolvedUrls.network]) {
        console.log(`  Smoke tests:  ${base}`);
        console.log(`  Manual checks: ${new URL('manual.html', base).href}`);
        console.log(`  Benchmarks:    ${new URL('benchmark.html', base).href}`);
        console.log(`  Diagnostics:   ${new URL('scroll-sync-diagnostic.html', base).href}`);
    }
    console.log('\nKeep this terminal open. Press Ctrl+C to stop.');
    console.log(
        'After changing the library or tests, stop and run npm run consumer:browser again.'
    );
}
