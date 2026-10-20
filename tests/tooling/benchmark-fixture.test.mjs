import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { withBenchmarkFixture, scrollSyncOffset } from '../browser/benchmark-fixture.js';
import {
    BROWSER_FIXTURE_FILES,
    BENCHMARK_FIXTURE_FILES,
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
    for (const file of BROWSER_FIXTURE_FILES) writeFileSync(path.join(directory, file), file);
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
});
