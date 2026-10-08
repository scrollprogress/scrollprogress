import { trackScrollProgress } from '@scrollprogress/scrollprogress';
import { debugScrollProgress } from '@scrollprogress/scrollprogress/debug';
import { createDebugPalette } from '@scrollprogress/scrollprogress/debug/palette';
import { createDebugOverlay } from '@scrollprogress/scrollprogress/debug/overlay';
import { createBrowserReport } from './reporting.js';
import {
    accumulateDomMutationRecords,
    checkScrollOffset,
    medianOfSortedSamples
} from './benchmark-metrics.js';
import { getBenchmarkScenarios } from './benchmark-scenarios.js';

const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));
const fixture = document.querySelector('#fixture');
const content = document.querySelector('#benchmark-content');
const output = document.querySelector('#results');
const summaryBody = document.querySelector('#benchmark-summary-body');
const runButtons = [...document.querySelectorAll('[data-benchmark-suite]')];
const reporting = await createBrowserReport('benchmark', output);
const frames = 60;
const warmupFrames = 12;

function formatMilliseconds(value) {
    return value === undefined ? 'Waiting…' : `${value.toFixed(2)} ms`;
}

function describeDebug(debug) {
    const enabled = ['bridge', 'palette', 'overlay'].filter((feature) => debug[feature]);
    return enabled.length ? enabled.join(' + ') : '—';
}

function describePaletteDomChurn(mutations) {
    if (!mutations) return '—';
    return `${(mutations.addedNodes + mutations.removedNodes).toLocaleString()} nodes`;
}

function renderSummary(scenarios, results) {
    const resultsById = new Map(results.map((result) => [result.id, result]));
    summaryBody.replaceChildren(
        ...scenarios.map((scenario) => {
            const result = resultsById.get(scenario.id);
            const row = document.createElement('tr');
            const values = [
                scenario.label,
                scenario.count.toLocaleString(),
                scenario.subscribersPerTracker.toLocaleString(),
                describeDebug(scenario.debug),
                formatMilliseconds(result?.medianFrameMs),
                formatMilliseconds(result?.p95FrameMs),
                formatMilliseconds(result?.meanScheduleMs),
                result ? describePaletteDomChurn(result.paletteDomMutations) : 'Waiting…'
            ];
            for (const value of values) {
                const cell = document.createElement('td');
                cell.textContent = value;
                row.append(cell);
            }
            return row;
        })
    );
}

async function runCase(scenario, warnings) {
    const resources = [];
    const elements = [];
    const trackers = [];
    const cleanupErrors = [];
    const paletteDomMutations = scenario.debug.palette
        ? { records: 0, addedNodes: 0, removedNodes: 0 }
        : null;
    let paletteMutationObserver = null;
    let result;
    let reads = 0;
    let deliveries = 0;
    const original = Element.prototype.getBoundingClientRect;
    Element.prototype.getBoundingClientRect = function () {
        reads += 1;
        return original.call(this);
    };
    fixture.scrollTop = 0;
    const createStart = performance.now();

    try {
        for (let index = 0; index < scenario.count; index++) {
            const element = document.createElement('div');
            element.className = 'target';
            content.append(element);
            elements.push(element);

            const tracker = trackScrollProgress(element, {
                ...scenario.trackerOptions,
                root: fixture,
                onUpdate: () => {
                    deliveries += 1;
                }
            });
            resources.push(tracker);
            trackers.push(tracker);

            for (
                let subscriberIndex = 0;
                subscriberIndex < scenario.subscribersPerTracker;
                subscriberIndex++
            ) {
                tracker.subscribe(() => {
                    deliveries += 1;
                });
            }

            if (scenario.debug.bridge) {
                resources.push(debugScrollProgress(tracker, { label: `Tracker ${index}` }));
            }
        }

        if (scenario.debug.palette) {
            resources.push(createDebugPalette());
        }
        if (scenario.debug.overlay) {
            resources.push(createDebugOverlay());
        }

        const createMs = performance.now() - createStart;

        for (let index = 0; index < warmupFrames; index++) {
            await frame();
        }

        if (paletteDomMutations) {
            const palette = document.querySelector('[data-scroll-progress-debug-palette]');
            if (!palette) {
                throw new Error(`Benchmark scenario ${scenario.id} did not mount the palette`);
            }
            paletteMutationObserver = new MutationObserver((records) => {
                accumulateDomMutationRecords(paletteDomMutations, records);
            });
            paletteMutationObserver.observe(palette, { childList: true, subtree: true });
        }

        reads = 0;
        deliveries = 0;
        const intervals = [];
        const workSamples = [];
        const scrollOffsets = new Set();
        let last = performance.now();

        for (let index = 0; index < frames; index++) {
            const expectedOffset = index % 2 ? 40 : 0;
            fixture.scrollTop = expectedOffset;
            const offset = fixture.scrollTop;
            if (checkScrollOffset(offset, expectedOffset)) {
                warnings.add(
                    'Scroll offsets differ by at most 1 CSS pixel; actual values are recorded'
                );
            }
            scrollOffsets.add(offset);

            const start = performance.now();
            trackers.forEach((tracker) => tracker.update({}));
            workSamples.push(performance.now() - start);

            await frame();
            const now = performance.now();
            intervals.push(now - last);
            last = now;
        }

        if (paletteMutationObserver && paletteDomMutations) {
            accumulateDomMutationRecords(
                paletteDomMutations,
                paletteMutationObserver.takeRecords()
            );
        }

        intervals.sort((a, b) => a - b);
        result = {
            id: scenario.id,
            label: scenario.label,
            count: scenario.count,
            subscribersPerTracker: scenario.subscribersPerTracker,
            trackerOptions: scenario.trackerOptions ?? {},
            debug: { ...scenario.debug },
            createMs,
            geometryReads: reads,
            readsPerFrame: reads / frames,
            deliveries,
            medianFrameMs: medianOfSortedSamples(intervals),
            p95FrameMs: intervals[Math.ceil(frames * 0.95) - 1],
            meanScheduleMs: workSamples.reduce((total, value) => total + value, 0) / frames,
            paletteDomMutations,
            scrollOffsets: [...scrollOffsets],
            fixtureSize: { width: fixture.clientWidth, height: fixture.clientHeight }
        };
    } finally {
        if (paletteMutationObserver && paletteDomMutations) {
            accumulateDomMutationRecords(
                paletteDomMutations,
                paletteMutationObserver.takeRecords()
            );
            paletteMutationObserver.disconnect();
        }

        // Always restore the instrumented native method, even if teardown fails.
        try {
            for (const resource of resources.reverse()) {
                try {
                    resource.destroy();
                } catch (error) {
                    cleanupErrors.push(String(error));
                }
            }
            elements.forEach((element) => element.remove());
        } finally {
            Element.prototype.getBoundingClientRect = original;
        }
    }

    // A measurement error propagates through finally unchanged; report cleanup
    // failures here only when measurement itself completed.
    if (cleanupErrors.length) {
        throw new Error(`Benchmark cleanup failed: ${cleanupErrors.join('; ')}`);
    }

    return result;
}

async function runSuite(suiteId) {
    runButtons.forEach((button) => {
        button.disabled = true;
    });
    reporting.start();

    const results = [];
    const warnings = new Set();
    const scenarios = getBenchmarkScenarios(suiteId);
    renderSummary(scenarios, results);

    if (document.visibilityState !== 'visible') {
        warnings.add('Page was not visible at the start');
    }

    const onVisibility = () => {
        warnings.add('Page visibility changed during measurement; repeat this run');
    };
    const onResize = () => {
        warnings.add('Viewport resized during measurement; repeat this run');
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('resize', onResize);

    const details = () => ({
        benchmarkVersion: 3,
        suite: suiteId,
        scenarioIds: scenarios.map((scenario) => scenario.id),
        frames,
        warmupFrames,
        results,
        warnings: [...warnings]
    });

    reporting.publish('running', details());

    try {
        for (const scenario of scenarios) {
            results.push(await runCase(scenario, warnings));
            renderSummary(scenarios, results);
            reporting.publish('running', details());
        }
        reporting.publish('complete', details());
        output.dataset.result = 'complete';
    } catch (error) {
        reporting.publish('failed', { ...details(), error: String(error) });
        output.dataset.result = 'failed';
    } finally {
        document.removeEventListener('visibilitychange', onVisibility);
        window.removeEventListener('resize', onResize);
        runButtons.forEach((button) => {
            button.disabled = false;
        });
    }
}

for (const button of runButtons) {
    button.addEventListener('click', () => {
        void runSuite(button.dataset.benchmarkSuite);
    });
}
