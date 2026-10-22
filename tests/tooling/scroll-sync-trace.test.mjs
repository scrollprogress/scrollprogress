import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import {
    analyzeScrollSyncTrace,
    createScrollSyncTrace,
    expectedProgress,
    markSettleStart,
    recordDelivery,
    recordRunnerFrame,
    recordSample
} from '../browser/diagnostics/scroll-sync-trace-analysis.js';
import {
    readTarEntries,
    verifyInstalledPackage
} from '../../scripts/prepare-scroll-sync-trace.mjs';
import { replayScrollSyncReport } from '../../scripts/analyze-scroll-sync-trace.mjs';

const count = 10;
const height = 1000;
const offsets = [2000, 2150, 2300, 2450, 2600, 2750, 2900, 3050];
const frames = offsets.length;
// Progress travel length for the default 0.8/0.4 range and 20px targets.
const travel = 20 + height * 0.4;

/**
 * Builds the input of a healthy run in which every sample follows the runner and every
 * sampled progress change is delivered. Hooks inject the defects under test.
 */
function buildInput({
    sample = (read) => read,
    deliver = () => true,
    deliveredProgress = (progress) => progress,
    observerResample = () => false,
    skipSample = () => false,
    settleProgress = (expected) => expected,
    capacity = 10_000
} = {}) {
    const trace = createScrollSyncTrace(capacity);
    const previous = new Map();
    let measuredDeliveries = 0;
    const deliverState = (frame, tracker, progress, top, settling) => {
        recordDelivery(trace, frame, tracker, {
            progress,
            progressDirection: 'forward',
            scrollDirection: 'forward',
            isInObservationArea: top + 20 >= 0 && top <= height,
            intersectionRatio: 1,
            isTracking: true
        });
        if (!settling) measuredDeliveries++;
    };
    const visit = (frame, offset, settling) => {
        for (let tracker = 0; tracker < count; tracker++) {
            // A skipped sample models a tracker that did not run in that frame.
            if (skipSample({ tracker, frame })) continue;
            const read = sample({
                tracker,
                frame,
                top: tracker * height - offset,
                scrollY: offset
            });
            recordSample(trace, frame, tracker, read.top, read.scrollY);
            const progress = expectedProgress(read.top, height);
            if (progress !== previous.get(tracker) && deliver({ tracker, frame })) {
                const delivered = deliveredProgress(progress, { tracker, frame });
                deliverState(frame, tracker, delivered, read.top, settling);
            }
            previous.set(tracker, progress);
            if (observerResample({ tracker, frame })) {
                // A native observer callback requests another sample; only flags change.
                recordSample(trace, frame, tracker, read.top, read.scrollY);
                deliverState(frame, tracker, progress, read.top, settling);
            }
        }
    };
    offsets.forEach((offset, frame) => {
        recordRunnerFrame(trace, frame, offset, offset);
        visit(frame, offset, false);
    });
    const finalOffset = offsets.at(-1);
    markSettleStart(trace, finalOffset);
    visit(frames, finalOffset, true);
    trace.settle.scrollY = finalOffset;
    trace.settle.states = Array.from({ length: count }, (_, tracker) => {
        const top = tracker * height - finalOffset;
        return {
            progress: settleProgress(expectedProgress(top, height), tracker),
            isInObservationArea: top + 20 >= 0 && top <= height
        };
    });
    trace.settle.probes = Array.from({ length: count }, (_, tracker) =>
        expectedProgress(tracker * height - finalOffset, height)
    );
    return { trace, count, height, hostTop: 0, rootSize: height, frames, measuredDeliveries };
}

const analyze = (options) => analyzeScrollSyncTrace(buildInput(options));

function keepSamples(trace, keep) {
    const columns = trace.samples;
    const indexes = columns.seq.map((_, index) => index).filter(keep);
    for (const key of Object.keys(columns)) {
        columns[key] = indexes.map((index) => columns[key][index]);
    }
}

test('mirrors the default core progress range', () => {
    assert.equal(expectedProgress(800, 1000), 0);
    assert.equal(expectedProgress(590, 1000), 0.5);
    assert.equal(expectedProgress(380, 1000), 1);
    assert.equal(expectedProgress(-500, 1000), 1);
});

test('reports no issue for a healthy trace without making a release decision', () => {
    const analysis = analyze();
    assert.equal(analysis.version, 3);
    assert.equal(analysis.outcome, 'no-issue-observed', analysis.reasons.join('; '));
    assert.deepEqual(analysis.validity.problems, []);
    assert.equal(analysis.findings.settledState.status, 'converged');
    assert.equal('blocksV1' in analysis, false);
    assert.equal('verdict' in analysis, false);
    assert.equal(analysis.counts.measuredSamples, count * frames);
    assert.equal(analysis.counts.tracedMeasuredDeliveries, analysis.counts.measuredDeliveries);
    assert.ok(analysis.counts.runnerExpectedChanges > 0);
    assert.deepEqual(analysis.validatedCallbackFields, ['progress']);
});

test('accepts observer-only deliveries and deduplicated samples', () => {
    const analysis = analyze({
        observerResample: ({ tracker, frame }) => tracker === 0 && frame === 3
    });
    assert.equal(analysis.outcome, 'no-issue-observed', analysis.reasons.join('; '));
    assert.equal(analysis.findings.missingDelivery.count, 0);
    assert.equal(analysis.findings.mismatchedDelivery.count, 0);
});

test('flags callbacks whose progress differs from the sampled geometry', () => {
    const zero = analyze({ deliveredProgress: () => 0 });
    assert.equal(zero.outcome, 'issue-observed');
    assert.ok(zero.findings.mismatchedDelivery.count > 0);
    // Final convergence does not erase the dynamic finding.
    assert.equal(zero.findings.settledState.status, 'converged');

    const one = analyze({
        deliveredProgress: (progress, { tracker, frame }) =>
            tracker === 3 && frame === 4 ? progress + 0.25 : progress
    });
    assert.equal(one.outcome, 'issue-observed');
    assert.equal(one.findings.mismatchedDelivery.count, 1);
    const [example] = one.findings.mismatchedDelivery.examples;
    assert.equal(example.tracker, 3);
    assert.equal(example.frame, 4);
    assert.ok(Math.abs(example.delivered - example.expected - 0.25) < 1e-12);

    const nonFinite = analyze({
        deliveredProgress: (progress, { tracker, frame }) =>
            tracker === 3 && frame === 4 ? Number.NaN : progress
    });
    assert.equal(nonFinite.outcome, 'issue-observed');
    assert.equal(nonFinite.findings.mismatchedDelivery.count, 1);
});

test('applies the explicit geometric tolerance to delivered progress', () => {
    const within = analyze({
        deliveredProgress: (progress, { tracker, frame }) =>
            tracker === 3 && frame === 4 ? progress + 0.5 / travel : progress
    });
    assert.equal(within.outcome, 'no-issue-observed');
    const beyond = analyze({
        deliveredProgress: (progress, { tracker, frame }) =>
            tracker === 3 && frame === 4 ? progress + 1.5 / travel : progress
    });
    assert.equal(beyond.outcome, 'issue-observed');
});

test('flags a measured progress change without a callback', () => {
    const analysis = analyze({ deliver: ({ tracker, frame }) => !(tracker === 3 && frame === 4) });
    assert.equal(analysis.outcome, 'issue-observed');
    assert.equal(analysis.findings.missingDelivery.count, 1);
    assert.deepEqual(
        analysis.findings.missingDelivery.examples.map(({ tracker, frame }) => [tracker, frame]),
        [[3, 4]]
    );
});

test('surfaces frozen geometry even when the final state converges', () => {
    // rect.top keeps its first measured value while scrollY follows the runner.
    const analysis = analyze({
        sample: (read) =>
            read.frame < frames ? { ...read, top: read.tracker * height - offsets[0] } : read
    });
    assert.equal(analysis.outcome, 'issue-observed');
    assert.equal(analysis.findings.settledState.status, 'converged');
    const frozen = analysis.findings.frozenGeometry;
    assert.ok(frozen.pairs > 0);
    assert.equal(frozen.longestRunFrames, frames - 1);
    assert.equal(frozen.maxDiscrepancyPx, offsets.at(-1) - offsets[0]);
    assert.ok(analysis.findings.geometryInconsistency.count > 0);
    assert.equal(analysis.findings.offsetMismatch.count, 0);
});

test('separates a moved scroll position from inconsistent geometry', () => {
    const stale = new Set([3, 4]);
    const analysis = analyze({
        sample: (read) =>
            stale.has(read.frame)
                ? { ...read, top: read.tracker * height - offsets[2], scrollY: offsets[2] }
                : read
    });
    assert.equal(analysis.outcome, 'issue-observed');
    assert.ok(analysis.findings.offsetMismatch.count > 0);
    assert.equal(analysis.findings.geometryInconsistency.count, 0);
    assert.ok(analysis.findings.frozenGeometry.pairs > 0);
});

test('reports a wrong settled state', () => {
    const analysis = analyze({
        settleProgress: (expected, tracker) => (tracker === 3 ? 0.5 : expected)
    });
    assert.equal(analysis.outcome, 'issue-observed');
    assert.equal(analysis.findings.settledState.status, 'diverged');
    assert.equal(analysis.findings.settledState.stateMismatches, 1);
});

test('keeps dynamic findings when the settled reference cannot be assessed', () => {
    const input = buildInput({ deliveredProgress: () => 0 });
    input.trace.settle.probes[0] = 0.5;
    const analysis = analyzeScrollSyncTrace(input);
    assert.equal(analysis.findings.settledState.status, 'not-assessed');
    assert.equal(analysis.outcome, 'issue-observed');

    // A missing final snapshot leaves part of the run unassessed.
    const healthy = buildInput();
    healthy.trace.settle.states = [];
    const unassessed = analyzeScrollSyncTrace(healthy);
    assert.equal(unassessed.outcome, 'inconclusive');
    assert.deepEqual(unassessed.validity.problems, []);
    assert.ok(unassessed.validity.limitations.includes('settled-state-not-assessed'));
});

test('treats long sampling gaps as unassessed motion without dropping findings', () => {
    // Samples only at the first and last runner frames leave almost all motion unobserved.
    const sparse = analyze({ skipSample: ({ frame }) => frame > 0 && frame < frames - 1 });
    assert.equal(sparse.outcome, 'inconclusive');
    assert.deepEqual(sparse.validity.problems, []);
    assert.ok(sparse.validity.limitations.includes('sampling-gap'));
    assert.equal(sparse.counts.sampleCoverage.maxGapFrames, frames - 1);
    assert.equal(sparse.counts.sampleCoverage.trackersWithGap, count);

    const leading = analyze({ skipSample: ({ frame }) => frame < 3 });
    assert.ok(leading.validity.limitations.includes('sampling-gap'));

    const withFinding = analyze({
        skipSample: ({ frame }) => frame > 0 && frame < frames - 1,
        deliveredProgress: () => 0
    });
    assert.equal(withFinding.outcome, 'issue-observed');
    assert.ok(withFinding.validity.limitations.includes('sampling-gap'));
});

test('accepts short sampling gaps such as the runner start or one skipped frame', () => {
    // A real run first samples at runner frame 2 and samples every frame afterwards.
    const start = analyze({ skipSample: ({ frame }) => frame < 2 });
    assert.equal(start.outcome, 'no-issue-observed', start.reasons.join('; '));
    assert.equal(start.counts.sampleCoverage.maxGapFrames, 2);

    const skipped = analyze({ skipSample: ({ tracker, frame }) => tracker === 3 && frame === 4 });
    assert.equal(skipped.outcome, 'no-issue-observed', skipped.reasons.join('; '));
});

test('never reports a clean outcome for unusable traces', async (t) => {
    const cases = {
        'no samples': (input) => keepSamples(input.trace, () => false),
        'tracker without samples': (input) =>
            keepSamples(input.trace, (index) => input.trace.samples.tracker[index] !== 4),
        truncated: (input) => {
            input.trace.truncated = true;
        },
        'column lengths': (input) => {
            input.trace.samples.top.pop();
        },
        'tracker reference': (input) => {
            input.trace.deliveries.tracker[0] = count;
        },
        'frame reference': (input) => {
            input.trace.samples.frame[0] = frames + 1;
        },
        'sequence order': (input) => {
            const { seq } = input.trace.samples;
            [seq[0], seq[1]] = [seq[1], seq[0]];
        },
        'non-finite geometry': (input) => {
            input.trace.samples.top[5] = Number.NaN;
        },
        'counter mismatch': (input) => {
            input.measuredDeliveries++;
        },
        'missing runner offsets': (input) => {
            input.trace.runner.actual.pop();
        },
        'invalid dimensions': (input) => {
            input.rootSize = 0;
        },
        'missing trace': (input) => {
            input.trace = null;
        }
    };
    for (const [name, mutate] of Object.entries(cases)) {
        await t.test(name, () => {
            const input = buildInput();
            mutate(input);
            const analysis = analyzeScrollSyncTrace(input);
            assert.equal(analysis.outcome, 'inconclusive');
            assert.ok(analysis.validity.problems.length > 0);
        });
    }
});

function diagnosticReport(input, overrides = {}) {
    return {
        kind: 'scroll-sync-diagnostic',
        status: 'complete',
        metadataError: null,
        warnings: [],
        artifact: { package: 'test@1', sha256: 'a'.repeat(64) },
        traceVersion: 1,
        frames: input.frames,
        results: [
            {
                id: 'scroll-sync-viewport-300-transform',
                count: input.count,
                fixtureSize: { height: input.height },
                hostTop: input.hostTop,
                rootSize: input.rootSize,
                deliveries: input.measuredDeliveries,
                trace: input.trace
            }
        ],
        ...overrides
    };
}

test('replays saved reports and keeps capture problems separate from the analysis', () => {
    const input = buildInput();
    const clean = replayScrollSyncReport(diagnosticReport(structuredClone(input)));
    assert.equal(clean.evidence.usable, true);
    assert.deepEqual(clean.evidence.problems, []);
    assert.equal(clean.results[0].analysis.outcome, 'no-issue-observed');
    assert.equal('examples' in clean.results[0].analysis.findings.missingDelivery, false);

    const flagged = replayScrollSyncReport(
        diagnosticReport(structuredClone(input), {
            warnings: ['Viewport resized during measurement; repeat this run'],
            metadataError: 'Package metadata HTTP 404'
        })
    );
    assert.deepEqual(flagged.capture.warnings, [
        'Viewport resized during measurement; repeat this run'
    ]);
    assert.equal(flagged.capture.metadataError, 'Package metadata HTTP 404');
    assert.equal(flagged.evidence.usable, false);
    assert.equal(flagged.evidence.problems.length, 2);
    // The analyzed values are still reported, but the capture is not usable as evidence.
    assert.equal(flagged.results[0].analysis.outcome, 'no-issue-observed');

    const incomplete = replayScrollSyncReport(
        diagnosticReport(structuredClone(input), { status: 'failed', artifact: null })
    );
    assert.equal(incomplete.evidence.usable, false);
    assert.ok(incomplete.evidence.problems.includes('capture-status: failed'));
    assert.ok(incomplete.evidence.problems.includes('missing-artifact-identity'));

    const untraced = replayScrollSyncReport(diagnosticReport(input, { results: [] }));
    assert.equal(untraced.evidence.usable, false);
    assert.ok(untraced.evidence.problems.includes('no-traced-results'));

    const examples = replayScrollSyncReport(diagnosticReport(structuredClone(input)), {
        examples: true
    });
    assert.ok(Array.isArray(examples.results[0].analysis.findings.missingDelivery.examples));
});

function tarEntry(name, contents) {
    const header = Buffer.alloc(512);
    header.write(name, 0);
    header.write(`${contents.length.toString(8).padStart(11, '0')}\0`, 124);
    header.write('0', 156);
    header.write('ustar\0', 257);
    return Buffer.concat([header, contents, Buffer.alloc((512 - (contents.length % 512)) % 512)]);
}

test('verifies installed package files byte-for-byte against the tarball', (t) => {
    const directory = mkdtempSync(path.join(os.tmpdir(), 'scroll-sync-trace-'));
    t.after(() => rmSync(directory, { recursive: true, force: true }));
    const archive = Buffer.concat([
        tarEntry('package/package.json', Buffer.from('{}')),
        tarEntry('package/dist/index.js', Buffer.from('export {};\n')),
        Buffer.alloc(1024)
    ]);
    assert.deepEqual(
        [...readTarEntries(archive).keys()],
        ['package/package.json', 'package/dist/index.js']
    );
    const tarball = path.join(directory, 'package.tgz');
    writeFileSync(tarball, gzipSync(archive));
    const installed = path.join(directory, 'installed');
    mkdirSync(path.join(installed, 'dist'), { recursive: true });
    writeFileSync(path.join(installed, 'package.json'), '{}');
    writeFileSync(path.join(installed, 'dist/index.js'), 'export {};\n');
    assert.deepEqual(verifyInstalledPackage(tarball, installed), { files: 2, problems: [] });

    writeFileSync(path.join(installed, 'dist/index.js'), 'export const changed = 1;\n');
    writeFileSync(path.join(installed, 'extra.js'), '');
    assert.deepEqual(verifyInstalledPackage(tarball, installed).problems, [
        'changed dist/index.js',
        'unexpected extra.js'
    ]);
});
