// Scroll-sync diagnostic: repeats the viewport runScrollSyncCase() workload from
// benchmark.js without changing it and adds an opt-in trace of geometry and callbacks.
// It runs in any browser; its outcome describes one run, never a release decision.
import { readScrollProgress, trackScrollProgress } from '@scrollprogress/scrollprogress';
import { scrollSyncOffset, withBenchmarkFixture } from '../benchmark-fixture.js';
import { checkScrollOffset, medianOfSortedSamples } from '../benchmark-metrics.js';
import { getBenchmarkScenarios } from '../benchmark-scenarios.js';
import { createBrowserReport } from '../reporting.js';
import {
    SCROLL_SYNC_ANALYSIS_VERSION,
    SCROLL_SYNC_TRACE_VERSION,
    analyzeScrollSyncTrace,
    createScrollSyncTrace,
    markSettleStart,
    recordDelivery,
    recordRunnerFrame,
    recordSample
} from './scroll-sync-trace-analysis.js';

const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));
const frames = 60;
const warmupFrames = 12;
const settleFrames = 5;
const tracedScenarioId = 'scroll-sync-viewport-300-transform';
// Scenarios that precede the traced one in the scroll-sync suite order.
const preambleIds = [
    'scroll-sync-viewport-100-none',
    'scroll-sync-viewport-100-transform',
    'scroll-sync-viewport-300-none'
];

const output = document.querySelector('#results');
const summary = document.querySelector('#trace-summary');
const runButton = document.querySelector('#run-trace');
const traceInput = document.querySelector('#record-trace');
const preambleInput = document.querySelector('#run-preamble');
const saveButton = document.querySelector('#save-report');
const reporting = await createBrowserReport('scroll-sync-diagnostic', output);
const scenarios = new Map(
    getBenchmarkScenarios('scroll-sync').map((scenario) => [scenario.id, scenario])
);

async function runScrollSyncTraceCase(scenario, { traced }) {
    // Same workload, offsets and counter boundaries as runScrollSyncCase() in benchmark.js.
    if (scenario.rootMode !== 'viewport') {
        throw new Error(`Diagnostic supports viewport scenarios only: ${scenario.id}`);
    }
    const height = document.documentElement.clientHeight;
    const startOffset = 2 * height;
    const travelDistance = 4 * height;
    const host = document.createElement('div');
    const setOffset = (offset) => window.scrollTo(0, offset);
    const getOffset = () => window.scrollY;
    Object.assign(host.style, { position: 'relative', height: `${12 * height}px` });
    document.body.append(host);
    const elements = [];
    const trackerIndex = new Map();
    const trace = traced
        ? createScrollSyncTrace(scenario.count * (frames + settleFrames) * 2)
        : null;
    let recording = false;
    let currentFrame = -1;
    let reads = 0;
    const original = Element.prototype.getBoundingClientRect;
    Element.prototype.getBoundingClientRect = function () {
        reads++;
        const rect = original.call(this);
        if (recording) {
            // The tracker reads scrollY right after this call, so this read adds no new
            // layout dependency to its sample.
            recordSample(
                trace,
                currentFrame,
                trackerIndex.get(this) ?? -1,
                rect.top,
                window.scrollY
            );
        }
        return rect;
    };
    try {
        return await withBenchmarkFixture(
            {
                content: host,
                startOffset,
                setOffset,
                getOffset,
                createContent() {
                    for (let index = 0; index < scenario.count; index++) {
                        const element = document.createElement('div');
                        Object.assign(element.style, {
                            position: 'absolute',
                            top: `${(index / scenario.count) * 10 * height}px`,
                            width: '20px',
                            height: '20px'
                        });
                        host.append(element);
                        elements.push(element);
                        trackerIndex.set(element, index);
                    }
                },
                async stabilize() {
                    await frame();
                    await frame();
                }
            },
            async ({ resources, firstOffset }) => {
                // One layout read before tracker creation and outside the counted window.
                const hostTop = original.call(host).top + window.scrollY;
                let deliveries = 0;
                const trackers = [];
                const createStart = performance.now();
                elements.forEach((element, index) => {
                    // Write a child transform so the measured target geometry stays fixed.
                    const visual = document.createElement('div');
                    element.append(visual);
                    const tracker = trackScrollProgress(element, {
                        root: null,
                        onUpdate(state) {
                            deliveries++;
                            if (recording) recordDelivery(trace, currentFrame, index, state);
                            if (scenario.callbackMode === 'transform')
                                visual.style.transform = `translateX(${state.progress * 10}px)`;
                        }
                    });
                    resources.push(tracker);
                    trackers.push(tracker);
                });
                const createMs = performance.now() - createStart;
                for (let index = 0; index < warmupFrames; index++) await frame();
                reads = 0;
                deliveries = 0;
                recording = traced;
                const intervals = [],
                    workSamples = [],
                    plannedOffsets = [],
                    scrollOffsets = [];
                let last = performance.now();
                for (let index = 0; index < frames; index++) {
                    const expected = scrollSyncOffset(index, frames, startOffset, travelDistance);
                    currentFrame = index;
                    const start = performance.now();
                    setOffset(expected);
                    const actual = getOffset();
                    checkScrollOffset(actual, expected);
                    plannedOffsets.push(expected);
                    scrollOffsets.push(actual);
                    workSamples.push(performance.now() - start);
                    if (recording) recordRunnerFrame(trace, index, expected, actual);
                    await frame();
                    const now = performance.now();
                    intervals.push(now - last);
                    last = now;
                }
                // The benchmark reports these values at this point; settling is diagnostic only.
                const measuredDeliveries = deliveries;
                const geometryReads = reads;
                intervals.sort((a, b) => a - b);
                const result = {
                    ...scenario,
                    traced,
                    createMs,
                    geometryReads,
                    readsPerFrame: geometryReads / frames,
                    deliveries: measuredDeliveries,
                    medianFrameMs: medianOfSortedSamples(intervals),
                    p95FrameMs: intervals[Math.ceil(frames * 0.95) - 1],
                    meanScheduleMs: workSamples.reduce((a, b) => a + b, 0) / frames,
                    startOffset,
                    travelDistance,
                    firstOffset,
                    plannedOffsets,
                    scrollOffsets,
                    fixtureSize: { width: document.documentElement.clientWidth, height },
                    hostTop,
                    rootSize: window.innerHeight
                };
                if (!traced) return result;

                // Let pending frames and observer callbacks drain without scrolling.
                markSettleStart(trace, scrollOffsets[frames - 1]);
                for (let index = 0; index < settleFrames; index++) {
                    currentFrame = frames + index;
                    await frame();
                }
                recording = false;
                trace.settle.scrollY = window.scrollY;
                // Snapshot automatic state before any public geometry probe.
                trace.settle.states = trackers.map((tracker) => tracker.getState());
                trace.settle.probes = trackers.map((tracker) =>
                    readScrollProgress(tracker.getElement(), tracker.getConfig())
                );
                return {
                    ...result,
                    trace,
                    analysis: analyzeScrollSyncTrace({
                        trace,
                        count: scenario.count,
                        height,
                        hostTop,
                        rootSize: result.rootSize,
                        frames,
                        measuredDeliveries
                    })
                };
            }
        );
    } finally {
        recording = false;
        Element.prototype.getBoundingClientRect = original;
        host.remove();
        window.scrollTo(0, 0);
    }
}

// Capture warnings invalidate a run as evidence even when its values show no issue.
function renderSummary(results, warnings) {
    const rows = results.map((result) => {
        const analysis = result.analysis;
        return [
            result.id,
            result.traced ? 'traced' : 'untraced',
            String(result.deliveries),
            result.readsPerFrame.toFixed(4),
            analysis ? analysis.outcome : '—',
            [
                ...(analysis?.reasons ?? []),
                ...warnings.map((warning) => `capture warning: ${warning}`)
            ].join('; ') || '—'
        ];
    });
    summary.replaceChildren(
        ...rows.map((values) => {
            const row = document.createElement('tr');
            for (const value of values) {
                const cell = document.createElement('td');
                cell.textContent = value;
                row.append(cell);
            }
            return row;
        })
    );
}

async function runDiagnostic() {
    runButton.disabled = true;
    reporting.start();
    const traced = traceInput.checked;
    const preamble = preambleInput.checked;
    const ids = [...(preamble ? preambleIds : []), tracedScenarioId];
    const results = [];
    const warnings = new Set();
    if (document.visibilityState !== 'visible') warnings.add('Page was not visible at the start');
    const onVisibility = () =>
        warnings.add('Page visibility changed during measurement; repeat this run');
    const onResize = () => warnings.add('Viewport resized during measurement; repeat this run');
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('resize', onResize);
    const details = () => ({
        diagnostic: 'scroll-sync-trace',
        traceVersion: SCROLL_SYNC_TRACE_VERSION,
        analysisVersion: SCROLL_SYNC_ANALYSIS_VERSION,
        baseBenchmarkVersion: 5,
        configuration: { traced, preamble, scenarioIds: ids },
        frames,
        warmupFrames,
        settleFrames,
        results,
        warnings: [...warnings]
    });
    reporting.publish('running', details());
    saveButton.disabled = true;
    try {
        for (const id of ids) {
            // Preamble scenarios reproduce suite ordering effects and are never traced.
            results.push(
                await runScrollSyncTraceCase(scenarios.get(id), {
                    traced: traced && id === tracedScenarioId
                })
            );
            renderSummary(results, [...warnings]);
            reporting.publish('running', details());
            saveButton.disabled = true;
        }
        reporting.publish('complete', details());
        output.dataset.result = 'complete';
    } catch (error) {
        reporting.publish('failed', { ...details(), error: String(error) });
        output.dataset.result = 'failed';
    } finally {
        document.removeEventListener('visibilitychange', onVisibility);
        window.removeEventListener('resize', onResize);
        runButton.disabled = false;
    }
}

runButton.addEventListener('click', () => {
    void runDiagnostic();
});
