import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
    accumulateDomMutationRecords,
    checkScrollOffset,
    countMutationSubtreeNodes,
    medianOfSortedSamples
} from '../browser/benchmark-metrics.js';
import {
    assertValidBenchmarkScenario,
    benchmarkSuites,
    getBenchmarkScenarios
} from '../browser/benchmark-scenarios.js';
import browserBenchmarkConfig from '../browser/vite.config.mjs';

test('provides a fast local benchmark server backed by the built library', () => {
    const packageManifest = JSON.parse(
        readFileSync(new URL('../../package.json', import.meta.url), 'utf8')
    );
    const aliasTargets = new Map(
        browserBenchmarkConfig.resolve.alias.map(({ find, replacement }) => [find, replacement])
    );

    assert.match(packageManifest.scripts['benchmark:browser'], /lib:build/);
    assert.match(packageManifest.scripts['benchmark:browser'], /tests\/browser\/vite\.config\.mjs/);
    assert.equal(browserBenchmarkConfig.server.host, '127.0.0.1');
    assert.equal(browserBenchmarkConfig.server.port, 4175);
    assert.equal(browserBenchmarkConfig.server.strictPort, true);
    assert.match(aliasTargets.get(packageManifest.name), /dist\/index\.js$/);
    assert.match(aliasTargets.get(`${packageManifest.name}/debug/palette`), /dist\/debug\/palette/);
});

test('keeps the complete performance summary and JSON report independently collapsible', () => {
    const html = readFileSync(new URL('../browser/benchmark.html', import.meta.url), 'utf8');

    assert.match(html, /<details id="benchmark-summary" open>/);
    assert.match(html, /<tbody id="benchmark-summary-body">/);
    assert.match(html, /<th>Median<\/th>/);
    assert.match(html, /<th>p95<\/th>/);
    assert.match(html, /<th>Palette DOM churn<\/th>/);
    assert.match(html, /<details id="benchmark-json">/);
    assert.match(html, /<pre id="results">Ready<\/pre>/);
});

test('defines stable core, debug-isolation and combined benchmark suites', () => {
    assert.deepEqual(
        benchmarkSuites.core.map((scenario) => scenario.id),
        ['core-1', 'core-100', 'core-300', 'core-1-subscribers-1000']
    );
    assert.deepEqual(
        benchmarkSuites.debug.map((scenario) => scenario.id),
        [
            'debug-reference-core-100',
            'debug-bridge-100',
            'debug-bridge-overlay-100',
            'debug-bridge-palette-100',
            'debug-bridge-palette-overlay-25',
            'debug-bridge-palette-overlay-100'
        ]
    );

    const all = getBenchmarkScenarios('all');
    assert.equal(all.length, benchmarkSuites.core.length + benchmarkSuites.debug.length);
    assert.equal(new Set(all.map((scenario) => scenario.id)).size, all.length);
    assert.throws(() => getBenchmarkScenarios('unknown'), /Unknown benchmark suite/);
});

test('keeps every benchmark scenario valid and debug views backed by the bridge', () => {
    for (const scenario of getBenchmarkScenarios('all')) {
        assert.doesNotThrow(() => assertValidBenchmarkScenario(scenario));
        if (scenario.debug.palette || scenario.debug.overlay) {
            assert.equal(scenario.debug.bridge, true);
        }
    }

    const base = {
        id: 'invalid',
        label: 'Invalid',
        count: 1,
        subscribersPerTracker: 0,
        debug: { bridge: false, palette: false, overlay: false }
    };
    assert.throws(() => assertValidBenchmarkScenario({ ...base, count: 0 }), /positive count/);
    assert.throws(
        () =>
            assertValidBenchmarkScenario({
                ...base,
                debug: { bridge: false, palette: true, overlay: false }
            }),
        /requires the bridge/
    );
    assert.throws(
        () => assertValidBenchmarkScenario({ ...base, trackerOptions: { root: null } }),
        /cannot override trackerOptions.root/
    );
});

test('accepts exact scroll positions and flags small subpixel differences', () => {
    assert.equal(checkScrollOffset(0, 0), false);
    assert.equal(checkScrollOffset(40, 40), false);
    for (const [actual, expected] of [
        [40.1002, 40],
        [39.9, 40],
        [0.1, 0],
        [-0.1, 0],
        [39, 40],
        [41, 40]
    ]) {
        assert.equal(checkScrollOffset(actual, expected), true);
    }
});

test('rejects absent scroll, large deviations and invalid measurements', () => {
    for (const actual of [0, 20, 38.9, 41.1, NaN, Infinity, -Infinity]) {
        assert.throws(
            () => checkScrollOffset(actual, 40),
            /Benchmark requires real 0\/40px scroll offsets/
        );
    }
    assert.throws(() => checkScrollOffset(40, 0), /expected 0px, received 40px/);
});

test('calculates the median for one, odd and even sample counts, including 30 and 60 frames', () => {
    assert.equal(medianOfSortedSamples([8]), 8);
    assert.equal(medianOfSortedSamples([2, 5, 20]), 5);
    assert.equal(medianOfSortedSamples([2, 6, 10, 100]), 8);
    assert.equal(medianOfSortedSamples(Array.from({ length: 30 }, (_, i) => i + 1)), 15.5);
    assert.equal(medianOfSortedSamples(Array.from({ length: 60 }, (_, i) => i + 1)), 30.5);
});

test('rejects an empty measurement instead of reporting NaN', () => {
    assert.throws(() => medianOfSortedSamples([]), /without samples/);
});

test('counts complete added and removed DOM subtrees', () => {
    const nodes = [{ querySelectorAll: () => [{}, {}] }, { querySelectorAll: () => [{}] }, {}];
    assert.equal(countMutationSubtreeNodes(nodes), 6);

    const counts = { records: 0, addedNodes: 0, removedNodes: 0 };
    accumulateDomMutationRecords(counts, [
        {
            addedNodes: nodes,
            removedNodes: [{ querySelectorAll: () => [{}, {}, {}] }]
        },
        { addedNodes: [], removedNodes: [] }
    ]);
    assert.deepEqual(counts, { records: 2, addedNodes: 6, removedNodes: 4 });
});
