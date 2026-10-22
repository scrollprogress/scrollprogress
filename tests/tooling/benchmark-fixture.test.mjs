import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { withBenchmarkFixture, scrollSyncOffset } from '../browser/benchmark-fixture.js';
import {
    BROWSER_FIXTURE_FILES,
    BENCHMARK_FIXTURE_FILES,
    DIAGNOSTIC_FIXTURE_FILES,
    DIAGNOSTIC_IDENTITY_FILES,
    copyFixtureFiles,
    hashFixtureFiles
} from '../browser/tooling/browser-fixture-hash.mjs';
import { localBrowserPackageInfo } from '../browser/tooling/vite/local-package-info.mjs';

test('isolates consecutive scenarios and cleans resources in reverse order, including errors', async () => {
    let offset = 900,
        children = ['old'];
    const destroyed = [];
    const config = {
        content: {
            replaceChildren() {
                children = [];
            }
        },
        createContent() {
            assert.deepEqual(children, []);
            children.push('new');
        },
        startOffset: 200,
        setOffset(value) {
            offset = value;
        },
        getOffset: () => offset,
        async stabilize() {
            assert.equal(offset, 200);
        }
    };
    for (const fail of [false, true, false]) {
        const run = withBenchmarkFixture(config, async ({ resources, firstOffset }) => {
            assert.equal(firstOffset, 200);
            assert.deepEqual(children, ['new']);
            resources.push(
                {
                    destroy() {
                        destroyed.push(1);
                    }
                },
                {
                    destroy() {
                        destroyed.push(2);
                    }
                }
            );
            offset = 600;
            if (fail) throw new Error('measurement');
            return 42;
        });
        if (fail) await assert.rejects(run, /measurement/);
        else assert.equal(await run, 42);
        assert.equal(offset, 200);
        assert.deepEqual(children, []);
    }
    assert.deepEqual(destroyed, [2, 1, 2, 1, 2, 1]);
    await assert.rejects(
        withBenchmarkFixture({ ...config, getOffset: () => 0 }, () => {}),
        /first scroll offset/
    );
    await assert.rejects(
        withBenchmarkFixture(config, ({ resources }) => {
            resources.push({
                destroy() {
                    throw new Error('cleanup');
                }
            });
            throw new Error('measure');
        }),
        (error) => error instanceof AggregateError && error.errors.length === 2
    );
});

test('uses one inversion and returns to the start without approaching scroll limits', () => {
    const offsets = Array.from({ length: 60 }, (_, i) => scrollSyncOffset(i, 60, 200, 400));
    assert.equal(offsets[0], 200);
    assert.equal(offsets[59], 200);
    assert.equal(Math.max(...offsets), 600);
    assert(offsets.slice(1, 30).every((v, i) => v > offsets[i]));
    assert(offsets.slice(30).every((v, i) => v < offsets[i + 29]));
});

test('centralizes copied files and hashes benchmark independently of smoke', (t) => {
    const directory = mkdtempSync(path.join(os.tmpdir(), 'scroll-fixture-'));
    t.after(() => rmSync(directory, { recursive: true, force: true }));
    assert(BENCHMARK_FIXTURE_FILES.includes('benchmark-fixture.js'));
    for (const file of BROWSER_FIXTURE_FILES) {
        mkdirSync(path.dirname(path.join(directory, file)), { recursive: true });
        writeFileSync(path.join(directory, file), file);
    }
    const full = hashFixtureFiles(directory);
    const benchmark = hashFixtureFiles(directory, BENCHMARK_FIXTURE_FILES);
    assert.equal(full, hashFixtureFiles(directory, [...BROWSER_FIXTURE_FILES].reverse()));
    writeFileSync(path.join(directory, 'smoke.js'), 'changed');
    assert.notEqual(full, hashFixtureFiles(directory));
    assert.equal(benchmark, hashFixtureFiles(directory, BENCHMARK_FIXTURE_FILES));
    writeFileSync(path.join(directory, 'benchmark-fixture.js'), 'changed');
    assert.notEqual(benchmark, hashFixtureFiles(directory, BENCHMARK_FIXTURE_FILES));
    let middleware;
    localBrowserPackageInfo({
        browserDirectory: directory,
        distributionDirectory: directory,
        packageName: 'test',
        packageVersion: '1'
    }).configureServer({
        middlewares: {
            use(fn) {
                middleware = fn;
            }
        }
    });
    let info;
    middleware(
        { url: '/package-info.json' },
        {
            setHeader() {},
            end(json) {
                info = JSON.parse(json);
            }
        }
    );
    assert.equal(info.fixtureSha256, hashFixtureFiles(directory));
    assert.equal(info.benchmarkFixtureSha256, hashFixtureFiles(directory, BENCHMARK_FIXTURE_FILES));
    assert.equal(
        info.diagnosticFixtureSha256,
        hashFixtureFiles(directory, DIAGNOSTIC_IDENTITY_FILES)
    );
});

test('keeps the diagnostic out of the benchmark identity but tracks its shared modules', (t) => {
    const directory = mkdtempSync(path.join(os.tmpdir(), 'scroll-fixture-'));
    t.after(() => rmSync(directory, { recursive: true, force: true }));
    for (const file of DIAGNOSTIC_FIXTURE_FILES) {
        assert(BROWSER_FIXTURE_FILES.includes(file));
        assert(!BENCHMARK_FIXTURE_FILES.includes(file));
    }
    for (const file of BROWSER_FIXTURE_FILES) {
        mkdirSync(path.dirname(path.join(directory, file)), { recursive: true });
        writeFileSync(path.join(directory, file), file);
    }
    const benchmark = hashFixtureFiles(directory, BENCHMARK_FIXTURE_FILES);
    const diagnostic = hashFixtureFiles(directory, DIAGNOSTIC_IDENTITY_FILES);
    writeFileSync(path.join(directory, 'diagnostics/scroll-sync-trace-analysis.js'), 'changed');
    assert.equal(hashFixtureFiles(directory, BENCHMARK_FIXTURE_FILES), benchmark);
    assert.notEqual(hashFixtureFiles(directory, DIAGNOSTIC_IDENTITY_FILES), diagnostic);
    const changedDiagnostic = hashFixtureFiles(directory, DIAGNOSTIC_IDENTITY_FILES);
    writeFileSync(path.join(directory, 'benchmark-fixture.js'), 'changed');
    assert.notEqual(hashFixtureFiles(directory, DIAGNOSTIC_IDENTITY_FILES), changedDiagnostic);
});

test('copies nested diagnostic modules into a fresh consumer directory', (t) => {
    const destination = mkdtempSync(path.join(os.tmpdir(), 'scroll-consumer-'));
    t.after(() => rmSync(destination, { recursive: true, force: true }));
    const source = path.resolve('tests/browser');
    copyFixtureFiles(source, path.join(destination, 'browser'));
    for (const file of BROWSER_FIXTURE_FILES) {
        const copied = path.join(destination, 'browser', file);
        assert(existsSync(copied), file);
        assert(readFileSync(copied).equals(readFileSync(path.join(source, file))), file);
    }
    // Every relative module or page the diagnostic entry references must be copied too.
    const copied = new Set(BROWSER_FIXTURE_FILES);
    const entry = readFileSync(path.join(source, 'scroll-sync-diagnostic.html'), 'utf8');
    const references = [...entry.matchAll(/(?:src|href)="\.?\/?([^"#?]+)"/g)].map((m) => m[1]);
    assert(references.includes('diagnostics/scroll-sync-trace.js'));
    for (const reference of references) assert(copied.has(reference), reference);
    for (const module of DIAGNOSTIC_FIXTURE_FILES.filter((file) => file.endsWith('.js'))) {
        const code = readFileSync(path.join(source, module), 'utf8');
        for (const [, specifier] of code.matchAll(/from '(\.{1,2}\/[^']+)'/g)) {
            const resolved = path.posix.normalize(
                path.posix.join(path.posix.dirname(module), specifier)
            );
            assert(copied.has(resolved), `${module} imports ${specifier}`);
        }
    }
    for (const page of ['index.html', 'benchmark.html']) {
        const html = readFileSync(path.join(source, page), 'utf8');
        assert(html.includes('href="scroll-sync-diagnostic.html"'), page);
        // The link must never be picked up as a benchmark suite button.
        assert(!/data-benchmark-suite="[^"]*diagnostic/.test(html), page);
    }
});
