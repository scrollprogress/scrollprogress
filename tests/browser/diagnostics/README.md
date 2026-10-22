# Scroll-sync diagnostic

Browser-neutral diagnostic for scroll-sync geometry, progress and callback delivery.
The entry page is `tests/browser/scroll-sync-diagnostic.html`; this directory holds
its runner and analysis modules. It repeats the viewport
`scroll-sync-viewport-300-transform` workload of the performance baseline and records
what each tracker read and delivered. It was introduced while investigating a Firefox
callback-count anomaly, but it has no browser-specific behavior or pass criteria.

It is not part of the library package, the benchmark hash or **Run all**. Its outcome
describes one run in one browser. It is not a performance measurement or a release
decision.

## Open it

Run `npm run consumer:browser` and open the printed **Diagnostics** link, or follow
**Scroll-sync diagnostics** from the smoke or performance page. `npm run
benchmark:browser` serves the same page against the local build. The page reports the
common `package-info.json`, including `diagnosticFixtureSha256`, which covers the
diagnostic files and the workload modules they import.

To confirm, byte for byte, that an installed consumer matches its tarball and the
checkout, without writing files:

```sh
node scripts/prepare-scroll-sync-trace.mjs --check --expect-sha256 <tarball-sha256>
```

Use the SHA-256 of the candidate being tested; omit `--expect-sha256` to check only
internal consistency.

## What it records

- Every `getBoundingClientRect()` call during the 60 measured frames and five settle
  frames: tracker index, runner frame, `rect.top` and `window.scrollY` read after the
  original call. The tracker reads `scrollY` right after that call, so the probe adds
  no new layout dependency.
- Every `onUpdate` state with its tracker and frame.
- The offset written and read back by the runner for each frame.
- After five frames without scrolling: each tracker's `getState()`, then
  `readScrollProgress()` as a separate public probe.

`deliveries`, `geometryReads` and the frame metrics stop at the same point as the
benchmark. Settling happens afterwards and is excluded from those values. The
diagnostic adds no observers, never calls `update({})` and keeps tracker options
unchanged. Recorded timings include tracing overhead.

## Run order

1. **Record trace** checked, preamble unchecked.
2. To separate instrumentation effects, repeat with the trace unchecked and compare
   `deliveries` with an uninstrumented benchmark run in the same browser session.
3. To test ordering effects, check **Run the preceding viewport scroll-sync scenarios
   first**. Those scenarios are never traced.

Save reports under a new directory in `test-results/reports/` and record the exact
browser build, OS, display scaling and zoom in the report details. Replay a saved
report with the current analysis, without modifying it:

```sh
node scripts/analyze-scroll-sync-trace.mjs <report.json>
```

Add `--examples` to include bounded examples for each finding. The replay keeps the
capture's `warnings` and `metadataError` and reports `evidence.usable`. A failed
status, a metadata error, missing package identity or any capture warning (for
example a resize, which invalidates the viewport reference) makes the capture
unusable as evidence, whatever `analysis.outcome` says about the recorded values.
The page also lists capture warnings in the summary table.

## Interpreting `analysis` (version 3)

| `outcome`           | Meaning                                                                  |
| ------------------- | ------------------------------------------------------------------------ |
| `issue-observed`    | Usable data shows at least one finding below.                            |
| `inconclusive`      | The trace is unusable (`validity.problems`) or a check was not assessed. |
| `no-issue-observed` | No finding under the recorded conditions; it does not prove a past fix.  |

| Finding                 | Observation                                                                           |
| ----------------------- | ------------------------------------------------------------------------------------- |
| `missingDelivery`       | Sampled progress changed, but no callback followed that sample.                       |
| `mismatchedDelivery`    | A callback's `progress` differs from its sample beyond the tolerance or is invalid.   |
| `offsetMismatch`        | `scrollY` at a sample differs from the offset the runner wrote and read back.         |
| `geometryInconsistency` | `rect.top + scrollY` is not the target's document position.                           |
| `frozenGeometry`        | `rect.top` stayed put across measured samples while the runner offset moved.          |
| `settledState`          | Final `getState()` compared with the arithmetic position; `not-assessed` if unusable. |

`frozenGeometry` reports consecutive sample pairs, the longest span in runner frames
and the largest pixel discrepancy. Runner frames are labels of the runner loop, not
exact browser paint frames. Labels describe observations only; none identifies a
browser mechanism or a library defect by itself.

Only callback `progress` is validated against geometry; lifecycle and observer
fields are recorded but not judged. Validity checks reject overflow, missing or
inconsistent columns, invalid tracker/frame references, out-of-order sequences,
non-finite geometry, trackers without measured samples, callbacks that cannot be
associated with a sample and counter mismatches. They do not require a sample in
every runner frame, so a recorded scheduling gap is reported rather than rejected:
a tracker that leaves more than two consecutive runner frames unobserved (counting
from frame 0 and up to the last frame) adds the `sampling-gap` limitation. That
motion is unassessed, so the outcome is `inconclusive` unless the observed samples
already show a finding. `counts.sampleCoverage` reports the largest gap. A healthy
run first samples at runner frame 2, then every frame. Analysis version 3 added this
rule; version 2 reports recorded before it lacked the coverage check.

The analysis mirrors the default `start: 0.8` / `end: 0.4` progress formula in
`src/lib/core.ts`, assumes the fixture's 20px targets and the recorded viewport
height, and uses a 1 CSS pixel tolerance. Changing target size, viewport or layout
during capture invalidates these references. Update `scroll-sync-trace-analysis.js`
if the core formula or the default range changes.
