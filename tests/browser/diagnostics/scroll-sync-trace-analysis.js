// Browser diagnostic fixture only: not part of the library package or the benchmark hash.
// Pure functions so the classification can be tested and replayed without a browser.

// Recording format of the trace columns below.
export const SCROLL_SYNC_TRACE_VERSION = 1;
// Semantics of analyzeScrollSyncTrace(): version 1 emitted a release verdict; version 3
// adds the sampling-gap coverage limitation to version 2.
export const SCROLL_SYNC_ANALYSIS_VERSION = 3;
export const GEOMETRY_TOLERANCE_PX = 1;
// Longest run of runner frames a tracker may leave unobserved before its motion counts as
// unassessed. A healthy run first samples at runner frame 2, then in every frame.
export const MAX_SAMPLE_GAP_FRAMES = 2;
export const TARGET_SIZE_PX = 20;
export const DEFAULT_RANGE = Object.freeze({ start: 0.8, end: 0.4 });

const EXAMPLE_LIMIT = 20;
const RUNNER_COLUMNS = ['seq', 'frame', 'planned', 'actual'];
const SAMPLE_COLUMNS = ['seq', 'frame', 'tracker', 'top', 'scrollY'];
const DELIVERY_COLUMNS = [
    'seq',
    'frame',
    'tracker',
    'progress',
    'progressDirection',
    'scrollDirection',
    'isInObservationArea',
    'intersectionRatio',
    'isTracking'
];

// Mirrors calculateScrollProgress() in src/lib/core.ts for the default range so that
// identical inputs produce identical floating-point results.
export function expectedProgress(elementStart, rootSize, range = DEFAULT_RANGE) {
    const startPx = rootSize * range.start;
    const endPx = rootSize * range.end;
    const trackLength = startPx - endPx;
    const traveled = startPx - elementStart;
    const travelLength = TARGET_SIZE_PX + trackLength;
    if (travelLength <= 0) return traveled > 0 ? 1 : 0;
    return Math.min(1, Math.max(0, traveled / travelLength));
}

// Document position of a target as written by the scroll-sync fixture.
export function expectedDocumentTop(index, count, height, hostTop) {
    return hostTop + (index / count) * 10 * height;
}

function travelLength(rootSize) {
    return TARGET_SIZE_PX + rootSize * (DEFAULT_RANGE.start - DEFAULT_RANGE.end);
}

export function createScrollSyncTrace(capacity) {
    return {
        capacity,
        truncated: false,
        sequence: 0,
        runner: { seq: [], frame: [], planned: [], actual: [] },
        samples: { seq: [], frame: [], tracker: [], top: [], scrollY: [] },
        deliveries: {
            seq: [],
            frame: [],
            tracker: [],
            progress: [],
            progressDirection: [],
            scrollDirection: [],
            isInObservationArea: [],
            intersectionRatio: [],
            isTracking: []
        },
        settle: null
    };
}

function hasCapacity(trace, column) {
    if (column.length < trace.capacity) return true;
    trace.truncated = true;
    return false;
}

export function recordRunnerFrame(trace, frame, planned, actual) {
    const { runner } = trace;
    runner.seq.push(++trace.sequence);
    runner.frame.push(frame);
    runner.planned.push(planned);
    runner.actual.push(actual);
}

export function recordSample(trace, frame, tracker, top, scrollY) {
    const { samples } = trace;
    if (!hasCapacity(trace, samples.seq)) return;
    samples.seq.push(++trace.sequence);
    samples.frame.push(frame);
    samples.tracker.push(tracker);
    samples.top.push(top);
    samples.scrollY.push(scrollY);
}

export function recordDelivery(trace, frame, tracker, state) {
    const { deliveries } = trace;
    if (!hasCapacity(trace, deliveries.seq)) return;
    deliveries.seq.push(++trace.sequence);
    deliveries.frame.push(frame);
    deliveries.tracker.push(tracker);
    for (const field of DELIVERY_COLUMNS.slice(3)) deliveries[field].push(state[field]);
}

export function markSettleStart(trace, offset) {
    trace.settle = { startSeq: ++trace.sequence, offset, states: [], probes: [] };
}

function createFinding() {
    return { count: 0, examples: [] };
}

function addExample(finding, example) {
    if (finding.examples.length < EXAMPLE_LIMIT) finding.examples.push(example);
}

const isIncreasing = (values) =>
    values.every((value, index) => index === 0 || value > values[index - 1]);
const isIndex = (value, length) => Number.isInteger(value) && value >= 0 && value < length;

function checkColumns(group, name, columns, problems) {
    if (!group || typeof group !== 'object' || !columns.every((c) => Array.isArray(group[c]))) {
        problems.push(`missing-columns:${name}`);
        return false;
    }
    if (new Set(columns.map((column) => group[column].length)).size !== 1) {
        problems.push(`column-lengths:${name}`);
        return false;
    }
    if (!isIncreasing(group.seq) || !group.seq.every(Number.isFinite)) {
        problems.push(`sequence-order:${name}`);
        return false;
    }
    return true;
}

/**
 * Checks the inputs the classification consumes. `problems` make the trace unusable;
 * `structural` reports whether findings can still be computed safely.
 */
function validateInput(input) {
    const problems = [];
    const { trace, count, height, hostTop, rootSize, frames, measuredDeliveries } = input ?? {};
    if (!Number.isInteger(count) || count <= 0 || !Number.isInteger(frames) || frames <= 0) {
        problems.push('invalid-dimensions:count-or-frames');
    }
    if (![height, hostTop, rootSize].every(Number.isFinite) || !(height > 0) || !(rootSize > 0)) {
        problems.push('invalid-dimensions:geometry');
    }
    if (!trace || typeof trace !== 'object') {
        problems.push('missing-trace');
        return { problems, structural: false, settleStartSeq: Infinity };
    }
    if (trace.truncated) problems.push('trace-truncated');

    const columnsOk = [
        checkColumns(trace.runner, 'runner', RUNNER_COLUMNS, problems),
        checkColumns(trace.samples, 'samples', SAMPLE_COLUMNS, problems),
        checkColumns(trace.deliveries, 'deliveries', DELIVERY_COLUMNS, problems)
    ].every(Boolean);
    if (!columnsOk || problems.some((problem) => problem.startsWith('invalid-dimensions'))) {
        return { problems, structural: false, settleStartSeq: Infinity };
    }

    const { runner, samples, deliveries } = trace;
    if (runner.actual.length !== frames || !runner.actual.every(Number.isFinite)) {
        problems.push('runner-offsets');
    }
    const settle = trace.settle;
    const settleStartSeq = settle ? settle.startSeq : Infinity;
    if (
        settle &&
        (!Number.isFinite(settle.startSeq) || settle.startSeq <= (runner.seq.at(-1) ?? 0))
    ) {
        problems.push('settle-boundary');
    }
    // Measured records belong to runner frames; settle records follow the settle marker.
    const validFrame = (frame, seq) =>
        Number.isInteger(frame) && frame >= 0 && (frame < frames || seq > settleStartSeq);
    if (!samples.tracker.every((tracker) => tracker === -1 || isIndex(tracker, count))) {
        problems.push('tracker-reference:samples');
    }
    if (!deliveries.tracker.every((tracker) => isIndex(tracker, count))) {
        problems.push('tracker-reference:deliveries');
    }
    if (!samples.frame.every((frame, index) => validFrame(frame, samples.seq[index]))) {
        problems.push('frame-reference:samples');
    }
    if (!deliveries.frame.every((frame, index) => validFrame(frame, deliveries.seq[index]))) {
        problems.push('frame-reference:deliveries');
    }
    if (!samples.top.every(Number.isFinite) || !samples.scrollY.every(Number.isFinite)) {
        problems.push('non-finite-geometry');
    }
    const traced = deliveries.seq.filter((seq) => seq < settleStartSeq).length;
    if (!Number.isInteger(measuredDeliveries) || traced !== measuredDeliveries) {
        problems.push('delivery-counter-mismatch');
    }
    const structural = !problems.some((problem) =>
        /^(runner-offsets|settle-boundary|tracker-reference|frame-reference|non-finite)/.test(
            problem
        )
    );
    return { problems, structural, settleStartSeq };
}

function groupByTracker(column, count) {
    const groups = Array.from({ length: count }, () => []);
    column.tracker.forEach((tracker, index) => {
        if (tracker >= 0) groups[tracker].push(index);
    });
    return groups;
}

function classifyFlag(top, rootSize) {
    if (top >= 0 && top + TARGET_SIZE_PX <= rootSize) return true;
    if (top + TARGET_SIZE_PX < 0 || top > rootSize) return false;
    return null; // Edge-adjacent targets depend on native observer timing.
}

function assessSettledState(input) {
    const { trace, count, height, hostTop, rootSize } = input;
    const settle = trace.settle;
    const scrollY = settle?.scrollY ?? settle?.offset;
    const notAssessed = (reason) => ({ status: 'not-assessed', reason, examples: [] });
    if (!settle) return notAssessed('missing-settle-snapshot');
    if (!Array.isArray(settle.states) || settle.states.length !== count) {
        return notAssessed('missing-settle-states');
    }
    if (!Number.isFinite(scrollY)) return notAssessed('missing-settle-offset');

    const beyondTolerance = (a, b) =>
        !Number.isFinite(a) || Math.abs(a - b) * travelLength(rootSize) > GEOMETRY_TOLERANCE_PX;
    let stateMismatches = 0,
        probeMismatches = 0,
        flagMismatches = 0;
    const examples = [];
    for (let index = 0; index < count; index++) {
        const top = expectedDocumentTop(index, count, height, hostTop) - scrollY;
        const expected = expectedProgress(top, rootSize);
        const state = settle.states[index];
        const probe = Array.isArray(settle.probes) ? settle.probes[index] : undefined;
        const expectedFlag = classifyFlag(top, rootSize);
        const stateWrong = !state || beyondTolerance(state.progress, expected);
        const probeWrong = beyondTolerance(probe, expected);
        const flagWrong =
            expectedFlag !== null && (!state || state.isInObservationArea !== expectedFlag);
        stateMismatches += stateWrong ? 1 : 0;
        probeMismatches += probeWrong ? 1 : 0;
        flagMismatches += flagWrong ? 1 : 0;
        if ((stateWrong || probeWrong || flagWrong) && examples.length < EXAMPLE_LIMIT) {
            examples.push({ tracker: index, expected, expectedFlag, state, probe });
        }
    }
    // The public probe validates the arithmetic reference before judging tracker state.
    if (probeMismatches > 0) {
        return { ...notAssessed('reference-disagrees-with-probe'), probeMismatches, examples };
    }
    return {
        status: stateMismatches > 0 || flagMismatches > 0 ? 'diverged' : 'converged',
        stateMismatches,
        flagMismatches,
        probeMismatches,
        examples
    };
}

/**
 * Describes what a scroll-sync trace shows, without deciding whether a release may proceed.
 *
 * Outcome precedence: unusable input is `inconclusive`; usable input with any finding is
 * `issue-observed`; usable input with an unassessed check is `inconclusive`; otherwise
 * `no-issue-observed`, which only covers the recorded run and conditions.
 *
 * Findings (all observational):
 * - `missingDelivery`: sampled progress changed, but no callback followed that sample;
 * - `mismatchedDelivery`: a callback's progress differs from its sample beyond tolerance;
 * - `offsetMismatch`: scrollY at a sample differs from the offset the runner wrote;
 * - `geometryInconsistency`: rect.top + scrollY is not the target's document position;
 * - `frozenGeometry`: rect.top stayed put across measured samples while the runner moved;
 * - `settledState`: final getState() against the arithmetic position after settling.
 *
 * Coverage: a tracker whose measured samples leave more than MAX_SAMPLE_GAP_FRAMES runner
 * frames unobserved (from frame 0, between samples or up to the last frame) records the
 * `sampling-gap` limitation. Findings from the observed samples are kept.
 */
export function analyzeScrollSyncTrace(input) {
    const { problems, structural, settleStartSeq } = validateInput(input);
    const limitations = [];
    const findings = {
        missingDelivery: createFinding(),
        mismatchedDelivery: { ...createFinding(), maxDifferencePx: 0 },
        offsetMismatch: createFinding(),
        geometryInconsistency: { ...createFinding(), maxDiscrepancyPx: 0 },
        frozenGeometry: { pairs: 0, longestRunFrames: 0, maxDiscrepancyPx: 0, examples: [] },
        settledState: { status: 'not-assessed', reason: 'invalid-trace', examples: [] }
    };
    const counts = {};
    const result = () => {
        const issues = [
            ['missing-delivery', findings.missingDelivery.count],
            ['mismatched-delivery', findings.mismatchedDelivery.count],
            ['offset-mismatch', findings.offsetMismatch.count],
            ['geometry-inconsistency', findings.geometryInconsistency.count],
            ['frozen-geometry', findings.frozenGeometry.pairs],
            ['settled-state-diverged', findings.settledState.status === 'diverged' ? 1 : 0]
        ]
            .filter(([, amount]) => amount > 0)
            .map(([label, amount]) => `${label}: ${amount}`);
        const outcome = problems.length
            ? 'inconclusive'
            : issues.length
              ? 'issue-observed'
              : limitations.length
                ? 'inconclusive'
                : 'no-issue-observed';
        return {
            version: SCROLL_SYNC_ANALYSIS_VERSION,
            outcome,
            reasons: [
                ...problems.map((problem) => `invalid input: ${problem}`),
                ...issues,
                ...limitations.map((limitation) => `not assessed: ${limitation}`)
            ],
            validity: { problems, limitations },
            findings,
            counts,
            validatedCallbackFields: ['progress'],
            assumptions: {
                targetSizePx: TARGET_SIZE_PX,
                range: { ...DEFAULT_RANGE },
                geometryTolerancePx: GEOMETRY_TOLERANCE_PX,
                rootSize: input?.rootSize,
                hostTop: input?.hostTop,
                note: 'Fixed scroll-sync workload; changing target size, viewport or layout during capture invalidates these references.'
            }
        };
    };
    if (!structural) return result();

    const { trace, count, height, hostTop, rootSize, frames, measuredDeliveries } = input;
    const { samples, deliveries, runner } = trace;
    const travel = travelLength(rootSize);
    const offsetForFrame = (frame) => (frame < frames ? runner.actual[frame] : trace.settle.offset);
    const sampleGroups = groupByTracker(samples, count);
    const deliveryGroups = groupByTracker(deliveries, count);
    const perFrameSamples = Array.from({ length: frames }, () => 0);
    const perTrackerSamples = [];
    let unassociated = 0,
        multiple = 0,
        runnerExpectedChanges = 0,
        sampledChanges = 0,
        sparseTrackers = 0,
        trackersWithGap = 0,
        maxGapFrames = 0;

    for (let tracker = 0; tracker < count; tracker++) {
        const documentTop = expectedDocumentTop(tracker, count, height, hostTop);
        const trackerDeliveries = deliveryGroups[tracker];
        const group = sampleGroups[tracker];
        let cursor = 0;
        let previous = null;
        let frozenRunStart = null;
        let measured = 0;
        // Frame 0 holds the warmup offset, so a first sample at frame k leaves k frames unseen.
        let lastMeasuredFrame = 0;
        let trackerGap = 0;

        // Every callback is preceded by the geometry read of the same update.
        while (
            cursor < trackerDeliveries.length &&
            (group.length === 0 ||
                deliveries.seq[trackerDeliveries[cursor]] < samples.seq[group[0]])
        ) {
            unassociated++;
            cursor++;
        }

        group.forEach((sampleIndex, position) => {
            const seq = samples.seq[sampleIndex];
            const frame = samples.frame[sampleIndex];
            const top = samples.top[sampleIndex];
            const scrollY = samples.scrollY[sampleIndex];
            const settling = seq > settleStartSeq;
            const window = settling ? 'settle' : 'measured';
            const nextSeq =
                position + 1 < group.length ? samples.seq[group[position + 1]] : Infinity;
            const associated = [];
            while (
                cursor < trackerDeliveries.length &&
                deliveries.seq[trackerDeliveries[cursor]] < nextSeq
            ) {
                associated.push(trackerDeliveries[cursor++]);
            }
            if (associated.length > 1) multiple++;

            const offset = offsetForFrame(frame);
            const expectedTop = documentTop - offset;
            const sampled = expectedProgress(top, rootSize);
            const runnerExpected = expectedProgress(expectedTop, rootSize);
            const discrepancy = Math.abs(top + scrollY - documentTop);
            const context = { tracker, frame, seq, window };

            if (!settling) {
                measured++;
                if (frame < frames) perFrameSamples[frame]++;
                trackerGap = Math.max(trackerGap, frame - lastMeasuredFrame);
                lastMeasuredFrame = frame;
            }
            if (Math.abs(scrollY - offset) > GEOMETRY_TOLERANCE_PX) {
                findings.offsetMismatch.count++;
                addExample(findings.offsetMismatch, { ...context, runnerOffset: offset, scrollY });
            }
            if (discrepancy > GEOMETRY_TOLERANCE_PX) {
                const finding = findings.geometryInconsistency;
                finding.count++;
                finding.maxDiscrepancyPx = Math.max(finding.maxDiscrepancyPx, discrepancy);
                addExample(finding, { ...context, top, scrollY, documentTop, discrepancy });
            }
            for (const deliveryIndex of associated) {
                const delivered = deliveries.progress[deliveryIndex];
                const differencePx = Math.abs(delivered - sampled) * travel;
                if (!Number.isFinite(delivered) || differencePx > GEOMETRY_TOLERANCE_PX) {
                    const finding = findings.mismatchedDelivery;
                    finding.count++;
                    if (Number.isFinite(differencePx)) {
                        finding.maxDifferencePx = Math.max(finding.maxDifferencePx, differencePx);
                    }
                    addExample(finding, {
                        ...context,
                        deliverySeq: deliveries.seq[deliveryIndex],
                        expected: sampled,
                        delivered
                    });
                }
            }

            // The first recorded sample has no prior state, so it cannot show a change.
            if (previous) {
                // Core deduplication compares progress exactly; mirror that here.
                if (sampled !== previous.sampled) {
                    sampledChanges++;
                    if (associated.length === 0) {
                        findings.missingDelivery.count++;
                        addExample(findings.missingDelivery, {
                            ...context,
                            previous: previous.sampled,
                            sampled
                        });
                    }
                }
                if (
                    !settling &&
                    Math.abs(runnerExpected - previous.runnerExpected) * travel >
                        GEOMETRY_TOLERANCE_PX
                ) {
                    runnerExpectedChanges++;
                }
                const frozen =
                    !settling &&
                    !previous.settling &&
                    Math.abs(top - previous.top) <= GEOMETRY_TOLERANCE_PX &&
                    Math.abs(offset - previous.offset) > GEOMETRY_TOLERANCE_PX &&
                    Math.abs(top - expectedTop) > GEOMETRY_TOLERANCE_PX;
                const finding = findings.frozenGeometry;
                if (frozen) {
                    frozenRunStart ??= previous.frame;
                    finding.pairs++;
                    finding.longestRunFrames = Math.max(
                        finding.longestRunFrames,
                        frame - frozenRunStart
                    );
                    const pixels = Math.abs(top - expectedTop);
                    finding.maxDiscrepancyPx = Math.max(finding.maxDiscrepancyPx, pixels);
                    if (finding.examples.length < EXAMPLE_LIMIT) {
                        finding.examples.push({
                            ...context,
                            previousFrame: previous.frame,
                            top,
                            expectedTop,
                            discrepancyPx: pixels
                        });
                    }
                } else {
                    frozenRunStart = null;
                }
            }
            previous = { sampled, runnerExpected, top, offset, frame, settling };
        });
        unassociated += trackerDeliveries.length - cursor;
        if (measured < 2) sparseTrackers++;
        if (measured > 0) {
            trackerGap = Math.max(trackerGap, frames - 1 - lastMeasuredFrame);
            if (trackerGap > MAX_SAMPLE_GAP_FRAMES) trackersWithGap++;
            maxGapFrames = Math.max(maxGapFrames, trackerGap);
        }
        perTrackerSamples.push(measured);
    }

    const withoutSamples = perTrackerSamples.filter((measured) => measured === 0).length;
    if (perTrackerSamples.every((measured) => measured === 0)) problems.push('no-measured-samples');
    else if (withoutSamples > 0) problems.push(`trackers-without-samples:${withoutSamples}`);
    if (unassociated > 0) problems.push(`unassociated-deliveries:${unassociated}`);
    if (multiple > 0) problems.push(`multiple-deliveries-per-sample:${multiple}`);
    if (sparseTrackers > withoutSamples) limitations.push('fewer-than-two-samples-per-tracker');
    if (trackersWithGap > 0) limitations.push('sampling-gap');

    findings.settledState = assessSettledState(input);
    if (findings.settledState.status === 'not-assessed') {
        limitations.push('settled-state-not-assessed');
    }

    Object.assign(counts, {
        measuredSamples: perTrackerSamples.reduce((total, value) => total + value, 0),
        settleSamples: samples.seq.filter((seq) => seq > settleStartSeq).length,
        untrackedReads: samples.tracker.filter((tracker) => tracker < 0).length,
        runnerExpectedChanges,
        sampledChanges,
        deliveries: deliveries.seq.length,
        measuredDeliveries,
        tracedMeasuredDeliveries: deliveries.seq.filter((seq) => seq < settleStartSeq).length,
        samplesPerTracker: {
            min: Math.min(...perTrackerSamples),
            max: Math.max(...perTrackerSamples)
        },
        sampleCoverage: {
            maxGapFrames,
            trackersWithGap,
            maxAllowedGapFrames: MAX_SAMPLE_GAP_FRAMES
        },
        perFrameSamples
    });
    return result();
}
