# Browser testing and report interpretation

> Internal repository documentation. Consumers do not need these fixtures or
> reports to use ScrollProgress.

This guide is for people developing ScrollProgress, verifying a release or
reproducing a problem. It is not required for consumers installing the library
in an application. The pages are development tools: their scripts and reports
are not included in the npm package or the library JavaScript.

## 1. Understanding the directories

| Path from the repository root                  | Purpose                                                                                                                    |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `node_modules/`                                | Project tools: TypeScript, Vite, tests and playground dependencies. Managed by npm.                                        |
| `playground/`                                  | Development app that uses the library source. It has no package.json of its own and shares the root tools.                 |
| `dist/`                                        | Built library, ready to be included in the npm package.                                                                    |
| `playground/dist/`                             | Playground build, generated only by `npm run play:build`.                                                                  |
| `tests/browser/`                               | Sources for the browser test pages. Keep these in Git and edit them instead of generated copies.                           |
| `test-results/consumer/`                       | Small generated project used to test package installation. It is replaced by the next run.                                 |
| `test-results/consumer/node_modules/`          | Real tarball installation of the library, separate from the root installation. It is not linked to `src`.                  |
| `test-results/consumer/browser/`               | Copy of the test pages served over HTTP by Vite.                                                                           |
| `test-results/consumer/report.json`            | Results of the automatic checks for this installation, including the path of its tarball.                                  |
| `test-results/consumer-latest.json` and `.tgz` | Latest successful automatic check and the exact tested package. Each successful run replaces them.                         |
| `test-results/reports/`                        | Recommended directory for downloaded reports you want to preserve. Create it when needed and choose which files to retain. |

For playground development, builds, previews and output-directory options, see
the [development guide](development.md#playground).

The consumer **already has its own node_modules**. The playground does not need
another copy: the playground is part of the project, whereas the consumer
verifies an installation. Consumer measurement bundles are built in memory and
do not create another `dist` directory. The consumer also contains its tarball,
npm cache and small files used to test types and imports.

A directory with its own `node_modules` does not prevent Node from resolving
dependencies from parent directories. For this reason, the release process keeps
the `npm run consumer:check -- --external` gate: it runs outside the repository
and removes the temporary installation on exit. Its path is printed. This is not
needed for daily work; use the visible project-local directory instead.

`test-results/` is excluded from Git and the npm tarball. After stopping the
server, you may delete the generated consumer. Do not keep notes or reports you
need inside it because the next run recreates it. A normal restart reuses the
same name instead of creating numbered copies. `--name comparison` creates
`test-results/comparison` when explicitly requested. The names `reports`,
`history`, `lint-format-review` and `typecheck-separation` are reserved for
verification results and notes. The script rejects them before creating or
modifying directories, even if an earlier run marked one as a consumer.

## 2. Starting the pages step by step

1. Open a terminal **in the repository root**.
2. For the first setup, use the Node version from `.nvmrc`, then run `npm ci`.
   This installs the tool versions recorded in the lockfile.
3. Run `npm run consumer:browser`.
4. Wait for the checks. The command builds the library, creates the tarball,
   installs it in the consumer, checks imports/types/bundles and starts the
   server.
5. Open the **Smoke tests** HTTP link printed in the terminal. The initial port
   is 4174, but it can change when occupied; use the printed link.
6. Keep the terminal open. Closing the browser tab does not stop the server.
7. When finished, press **Ctrl+C in the terminal**. The local consumer files
   remain available for inspection. Repeat step 3 to start again.

Do not open `index.html` by double-clicking it: a `file://` URL cannot use the
JavaScript imports required here. You do not need to disable CORS or browser
security. `consumer:check` performs the automatic checks and exits; it does not
start these pages. After changing the library or fixtures, stop and restart
`consumer:browser`: the page tests the installed package, not live source changes.

For a physical phone on the same trusted network, run
`npm run consumer:browser -- --host 0.0.0.0` and open the printed LAN link on the
phone. This explicitly exposes the server to the network. Desktop browser tests,
including mobile emulation, do not certify Safari on iOS or Chrome on Android.

## 3. Saving and identifying a report

Each page has a **Save report (JSON)** button. JSON is a text format: you can open
it in an editor and attach it to an issue. Reports are not sent to external
services.

1. Run a test.
2. Open **Report details** and enter the browser/version, operating system/version,
   device and notes. Copy versions from the device or browser information because
   the user agent may hide them. If unknown, leave them blank and explain this in
   the notes.
3. Press **Save report (JSON)**. The browser downloads a file whose name contains
   the test type and date. Check the Downloads directory or the destination
   selected by your browser.
4. To retain it with local project evidence, move or save it under
   `test-results/reports/`, **outside `test-results/consumer/`**. The button does
   not write directly into the repository directory.

There is no automatic report history: download only the reports you want to
keep. Save before reloading the page or the session will be lost. Partial and
failed results can also be saved; `status` distinguishes them. If the browser
blocks downloads, copy the JSON displayed by the page into a file.

| Common field                        | Meaning                                                                                                                                             |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `schemaVersion`                     | Report format version, not library version.                                                                                                         |
| `kind`                              | `smoke`, `manual` or `benchmark`.                                                                                                                   |
| `startedAt`, `updatedAt`, `savedAt` | Start, update and download times in UTC. `savedAt` appears in the downloaded file.                                                                  |
| `status`                            | Test status, described in the following sections.                                                                                                   |
| `artifact.package`                  | Actual installed package name and version; verify that they match the intended candidate.                                                           |
| `artifact.sha256`                   | Tarball fingerprint. The same version does not guarantee identical files; compare this fingerprint.                                                 |
| `artifact.fixtureSha256`            | Fingerprint of the test-page files. It distinguishes fixture changes that do not alter the library tarball.                                         |
| `artifact.mode`                     | `project-local` or `external-isolated`.                                                                                                             |
| `artifact.preparedAt`               | Time at which the consumer was prepared.                                                                                                            |
| `metadataError`                     | Must be null. If package identity is missing, regenerate the consumer before using the report as release evidence.                                  |
| `environment`                       | Initial user agent, language, viewport dimensions, pixel density and visibility. It does not prove the device model or every real software version. |
| `observations`                      | Versions and notes entered by the tester; in a manual report this includes the checklist.                                                           |

A report is not a video recording or a complete console capture. Record
unexpected errors, screenshots and reproduction steps separately.

## 4. Smoke tests: quick automatic checks

Open **Smoke tests**, press **Run smoke tests**, wait for the result and save the
report. `results` lists the scenarios: `PASS` means the assertions succeeded,
while `FAIL` includes an error message. `passed: true` with `status: passed`
means every scenario succeeded; `running` is still a partial result.

The checks cover geometry, native observers, invalid updates, custom roots,
horizontal tracking, inversion, CSS, subscribers, debug and cleanup. The palette
is tested without Tailwind: removal of list markers and indentation is also
checked. Errors intentionally produced by B+ and registry tests may appear in
the terminal with the word `expected`; the smoke test verifies their delivery.
Do not ignore other errors.

A PASS applies to **these scenarios in this browser**.
It does not replace npm test, focused manual checks or the external installation check.
On failure, save the report, record the browser/version, repeat once without
changing the candidate and investigate the reported scenario.

## 5. Manual checks: actions and recorded data

Open **Manual device checks**. The command bar scrolls when it needs more space.
The target intentionally starts outside the visible area: scroll the page or the
Custom panel to reach it.

1. Select **Root** (Viewport or Custom) and **Axis** (horizontal x or vertical y),
   then press **Create/recreate** to start a new tracker.
2. Scroll before the target, through the range and beyond it, then return.
3. Press **Record snapshot** at the points you want to document. A snapshot saves
   configuration, tracker state, coordinates, scroll, CSS and viewport data.
4. To change an existing tracker, edit the fields and press **Update existing**.
   Editing a field alone does not change the tracker. `threshold` accepts JSON;
   try `0.5` and `[0,0.5,1]`. For `rootMargin`, try `20px` and `-20px`.
5. Repeat with `inverted`, `once` and `requireRootVisible`. With `once`, the
   tracker may destroy itself after completing once it has entered the area;
   recreate it before another attempt.
6. **Toggle debug views** opens or closes the palette and overlay. Test selection,
   visibility, dragging, controls, keyboard focus and teardown.
7. Press **Destroy**, verify that state stops updating and the CSS variable keeps
   its last value. Press **Create/recreate** to start again.
8. Open **Report details**. Mark each tested item as `pass` or `fail`, leaving
   untested entries as `not-tested`. Describe the steps and observations in the
   notes, then save the report. Do not mark the whole checklist PASS merely
   because the page opens.

`events` records each command press and requested snapshot, including actions
that throw. `executed` means only that the command finished, not that its visual
behavior was correct. `currentSnapshot` records the state at save time.
`status: manual-session` does not certify an overall PASS. Continuous scrolling
does not create thousands of rows; choose meaningful points with Record snapshot.
Reloading resets the session.

In diagnostics, `directProgress` is the geometric reading **before inversion**;
`expectedProgress` applies `inverted`. Compare the latter with `state.progress`
while scrolling is stopped and after the frame update. Scroll synchronizes
measurable geometry even outside the observation area. A target without a layout
box retains its tracker progress while the direct read returns `null`.
`rootMargin` changes observation, not geometric progress.
`visualViewport` and page measurements help diagnose horizontal mobile behavior.

The [public compatibility contract](../compatibility.md) remains the complete reference,
including cases that need other examples or automated tests such as multiple
trackers, callbacks, resize and missing observers. This page does not certify
every case.

## 6. Benchmark: interpreting measurements correctly

For normal benchmark development, run `npm run benchmark:browser`. It builds the
local library and serves the fixtures at `http://127.0.0.1:4175` without the full
consumer validation. Reports use `mode: "local-build"` and identify the build and
fixture by hashes. Use `npm run consumer:browser` for evidence against the package
installed from its real tarball, served at `http://127.0.0.1:4174`.

Open **Performance baseline**, keep the tab foreground and close DevTools. Select
a suite, wait for `status: complete`, then save. Completion means measurement
finished, not that performance passed a threshold. The collapsible summary shows
scenario results; the separate JSON view is the full report.

### Suites and workloads

The current procedure is `benchmarkVersion: 5`. Version 5 keeps the v4 scenario
definitions and workloads; it changes the benchmark page only by adding navigation
to the scroll-sync diagnostic, so its benchmark hash differs from v4. Relate v4 and
v5 reports with that difference recorded and do not pool them into one baseline. Do
not mix version 3 reports into later comparisons. Scenario definitions are in
`tests/browser/benchmark-scenarios.js`.

- **Core baseline**: 1, 100 and 300 trackers, plus one tracker with 1,000 subscribers.
  IDs are `core-1`, `core-100`, `core-300` and `core-1-subscribers-1000`.
- **Debug isolation**: a core reference and bridge, overlay and palette combinations,
  primarily with 100 trackers, plus a combined-debug case with 25. IDs use the
  `debug-` prefix. Palette measurements include work for all registered items,
  including cards outside its visible area.
- **Scroll synchronization**: eight IDs matching
  `scroll-sync-{viewport|element}-{100|300}-{none|transform}`. The callback counts
  deliveries and optionally writes a child transform; it never calls `update({})`.
- **Run all** combines the classic core and debug suites. Run scroll synchronization
  separately with its own button.

All suites warm up for 12 frames and measure 60 frames. Classic core/debug cases
use an element root, alternate between scroll offsets 0 and 40, and explicitly
request `update({})` on each tracker. The offset check accepts a 1 CSS pixel
variation, records actual positions, and warns about small differences. Larger
deviations and non-finite values fail the run.

For scroll synchronization, H is `document.documentElement.clientHeight` for the
viewport and `root.clientHeight` for an element root. `startOffset = 2 * H` and
`travelDistance = 4 * H`. The 60-frame path goes forward and back with one reversal
and at least 2 * H of content beyond each endpoint. Targets span 10 * H, leaving
most outside observation. `plannedOffsets` and `scrollOffsets` contain the full
path. Each actual offset, including the first, must be within 1 CSS pixel of the
planned value; a larger deviation invalidates the run.

The extracted `benchmark-fixture.js` resets scroll, clears previous content,
rebuilds targets, stabilizes and records the first offset. Its finally cleanup
destroys resources in reverse order, removes targets and restores startOffset,
including after errors. The viewport host is then removed and document scroll
returns to zero. Tooling tests cover isolation between scenarios and cleanup errors.

### Metrics and limits

| Field                         | Meaning                                                                                                                                   |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `id`, `label`, `count`        | Scenario identity, description and tracker count.                                                                                         |
| `subscribersPerTracker`       | Additional subscribers, excluding onUpdate and internal debug subscriptions.                                                              |
| `trackerOptions`, `debug`     | Tracker configuration and explicit debug composition.                                                                                     |
| `createMs`                    | Synchronous creation and mounting time; excludes later observer delivery and drawing.                                                     |
| `geometryReads`               | Instrumented getBoundingClientRect calls during measured frames, including debug calls; excludes getClientRects and native observer work. |
| `readsPerFrame`               | geometryReads divided by 60 measured frames.                                                                                              |
| `deliveries`                  | onUpdate and benchmark subscriber calls, excluding warmup and internal debug subscribers.                                                 |
| `medianFrameMs`, `p95FrameMs` | Median and 95th-percentile frame intervals, including browser scheduling and rendering.                                                   |
| `meanScheduleMs`              | Synchronous update-request time in classic suites, or scroll write/read time in scroll-sync; excludes deferred tracker execution.         |
| `paletteDomMutations`         | Child-list records and complete subtree nodes added/removed in the palette; null without a palette. Instrumentation adds some overhead.   |
| `scrollOffsets`               | Actual offsets: distinct near-0/40 positions in classic suites, the complete path in scroll-sync.                                         |
| `fixtureSize`                 | Measured root or viewport dimensions.                                                                                                     |

Frame intervals near 16.7 ms describe approximately 60 Hz cadence; they do not
mean the library used 16.7 ms of CPU. A 120 Hz display may produce intervals near
8.3 ms. Stable intervals can coexist with increased geometry work and deliveries.
The fixture does not necessarily reproduce layout costs caused by application DOM
writes. A passing comparison guardrail neither establishes unchanged CPU cost nor
guarantees that no frames were missed. Profiling is a separate diagnostic activity.

### Identity and comparison

`benchmarkFixtureSha256` hashes benchmark.html, benchmark.js, benchmark-fixture.js,
benchmark-scenarios.js, benchmark-metrics.js and reporting.js. Freeze these files
across a comparison. `diagnosticFixtureSha256` hashes the scroll-sync diagnostic
page and modules plus the shared workload modules it imports. Both package-info
generators use the shared explicit file lists in
`tests/browser/tooling/browser-fixture-hash.mjs`.

`fixtureSha256` hashes the explicit browser fixture list rather than scanning the
directory; since v5 the list includes the diagnostic files. Smoke or diagnostic
changes may change this hash without affecting the benchmark hash. The artifact SHA-256 identifies the local distribution plus fixture, or the
installed tarball, according to mode. `schemaVersion` remains 1 and metadata is
included under the report's artifact object.

For a reproducible comparison:

1. Use committed candidates with clean tracked files and the same benchmark hash.
   Record HEAD before export. Preserve raw JSON downloads without editing them.
2. Use the same exact browser, OS, viewport, DPR, zoom, throttling, visibility and
   similar power/load conditions. Record headless mode and whether a trace was used.
3. Acquire at least three runs per suite and candidate. Compare matching IDs and
   benchmark versions using the median across runs and the baseline minimum–maximum.
4. Reject errors, incomplete scenarios, unexpected scroll clamps, changed benchmark
   hashes and visibility/resize warnings. Record excluded runs and repeat them.
5. A chosen regression guardrail can flag a candidate if the median across runs of
   either medianFrameMs or p95FrameMs exceeds the baseline median by more than 10%
   AND exceeds the baseline maximum. A pass means only that this condition did not
   trigger. Treat other metrics as diagnostics and investigate repeated trends.

The automated capture tool uses headless Chrome, 1280x900, DPR 1 and DevTools
Protocol CPU throttling 4x, without a Performance trace. Headless measurements are
comparative diagnostics, not physical-device certification. Classic core runs can
serve as an additional control alongside scroll-sync comparisons.

### Scroll-sync diagnostic

**Scroll-sync diagnostics**, linked from the smoke and performance pages, repeats the
`scroll-sync-viewport-300-transform` workload in whichever browser opens it and
records every geometry read, the offset written by the runner and each `onUpdate`
progress. It is not part of **Run all**, is not captured by the automated tool and
does not score performance. Its timings include tracing overhead; compare them
neither with uninstrumented benchmark runs nor with a future per-frame CPU metric.

The analysis reports one run-local `outcome`:

- `issue-observed`: usable data shows a missing or mismatched callback, a scroll
  offset or geometry that disagrees with the runner, frozen geometry, or a settled
  state that differs from the target's position;
- `inconclusive`: the trace is unusable, a check could not be assessed, or a tracker
  left more than two consecutive runner frames of motion unobserved;
- `no-issue-observed`: nothing was found under the recorded conditions.

No outcome is a release decision or identifies a browser mechanism or library defect
by itself. Its references assume the fixed 20px targets, the recorded viewport height
and a 1 CSS pixel tolerance. Replay a saved report with the current analysis, without
modifying it, using `node scripts/analyze-scroll-sync-trace.mjs <report.json>`. Its
`evidence.usable` is false for a failed capture, a metadata error, missing package
identity or any capture warning such as a resize; such a capture is not evidence,
whatever the analyzed values show.
`node scripts/prepare-scroll-sync-trace.mjs --check` verifies an installed consumer
byte for byte against its tarball and the checkout. Details and field descriptions
are in `tests/browser/diagnostics/README.md`.

## 7. Automated report capture

`scripts/capture-browser-report.mjs` is maintenance tooling, run directly with
Node from the repository root. It requires the Node/npm versions in `.nvmrc` and
`package.json`, installed repository dependencies and a Chrome headless process
with its DevTools endpoint available. It does not start Chrome or an HTTP server.

In one terminal, start the appropriate server:

```sh
npm run benchmark:browser
```

Or, for installed-package smoke and other consumer evidence:

```sh
npm run consumer:browser
```

Wait for the server to finish preparing its build or installation. Do not rebuild
or change fixtures during acquisition. The local fixture server uses port 4175;
the installed consumer normally uses 4174. Use the actual URL printed by the server.

In a second terminal, start a dedicated Chrome headless instance. On macOS with
Chrome in its standard Applications location:

```sh
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --remote-debugging-port=9222 --user-data-dir=/tmp/scrollprogress-report-chrome --no-first-run --no-default-browser-check about:blank
```

On other platforms, replace the executable and temporary profile path. Keep this
profile separate from the normal browser profile. Port 9222 must be available;
when choosing another port, supply its endpoint to the capture command.

In a third terminal, run:

```sh
node scripts/capture-browser-report.mjs <phase> <suite> [run] [base-url] [devtools-endpoint]
```

- `phase` labels the candidate or measurement phase and is recorded with HEAD.
- `suite` is `scroll-sync`, `core`, `debug`, `all` or `smoke`.
- `run` defaults to `01`; use distinct run numbers for repeated measurements.
- `base-url` defaults to `http://127.0.0.1:4175`.
- `devtools-endpoint` defaults to `http://127.0.0.1:9222`.

Examples:

```sh
node scripts/capture-browser-report.mjs baseline scroll-sync 01
node scripts/capture-browser-report.mjs candidate core 01
node scripts/capture-browser-report.mjs review-fixes-installed smoke 01 http://127.0.0.1:4174
```

Benchmark runs require no tracked modifications. Development smoke may run with
modified tracked files, which the script records explicitly; final candidate smoke
should run from a clean tracked working tree. Phase, browser/OS, HEAD, viewport,
headless mode, CPU throttling and absence of tracing are filled before export.
Intentional smoke errors are identified and counted by the harness; unexpected
errors must remain visible and must not be treated as expected failures.

The tool configures `Browser.setDownloadBehavior`, waits for successful completion,
uses the page's Save button, validates the download and renames it without changing
its contents. Temporary downloads are under `test-results/downloads/`; retained
reports are under `test-results/reports/`:

- `benchmark-<suite>-<phase>-run-<run>.json`;
- `smoke-<phase>.json`.

Use a new phase/run combination to preserve existing evidence; the smoke filename
does not include the run number. Failed captures exit nonzero and must be diagnosed
and repeated; a partial or failed run is not accepted evidence. Missing prerequisites
or an unavailable endpoint require starting the corresponding process first.

After capture, stop the server and dedicated Chrome process with Ctrl+C in their
terminals. The script closes its own tab and connection, but leaves those processes
under the maintainer's ownership. Generated reports and the temporary browser
profile are not source files and must not be committed.

## 8. Production theme capture

The `themes` suite uses the same capture tool and Chrome endpoint as smoke. It
checks the generated production HTML, scripts and CSS against the consumer report,
then checks both theme pages in Chrome. It does not use the smoke page's report UI.

Replace `<name>`, `<phase>` and `<smoke-phase>` with your chosen consumer name
and fresh capture labels before running these templates. Choose a new phase or run
number for each acquisition so earlier reports remain available.

After finishing source changes and checks, prepare one final consumer:

```sh
npm run consumer:browser -- --name <name>
```

Wait for the report and server URL. Keep this process running for the later smoke
check. Local consumer preparation and theme capture require Git and a checkout.
The external consumer check omits candidate identity and does not invoke Git to
collect it. The local report records HEAD, the tracked diff and hashes of changed tracked and
non-ignored untracked files. Changing source after generation requires regenerating
the consumer; the capture refuses a stale candidate. Keep the sources unchanged
throughout acquisition and preserve reports outside the generated consumer.

In another terminal, serve only the generated production output with Vite Preview:

```sh
node --input-type=module -e 'import { preview } from "vite"; import path from "node:path"; await preview({ configFile: false, appType: "mpa", root: path.resolve("test-results/<name>/browser"), build: { outDir: "production-themes" }, preview: { host: "127.0.0.1", port: 4188, strictPort: true, open: false } });'
```

`configFile: false` prevents loading the playground build configuration. MPA mode
keeps missing HTML paths from falling back to another page. Preview serves the
built files without development transforms. Python and another installation are
not needed. Start the dedicated Chrome process from section 7, then run:

```sh
node scripts/capture-browser-report.mjs <phase> themes 01 http://127.0.0.1:4188 http://127.0.0.1:9222 test-results/<name>
```

The sixth argument selects the consumer whose report identifies the served assets.
Use a fresh phase/run combination: theme reports refuse to overwrite an existing
`test-results/reports/themes-<phase>-run-<run>.json`. They record the artifact,
source identity, asset hashes, browser/OS, URLs, results and page/load errors.
A failed capture writes `status: failed` and exits nonzero. Argument errors and an
existing destination are rejected before browser navigation.

Theme capture has a 30-second deadline per page, 10-second connection/request
limits and a 5-second cleanup request limit. Page exceptions or required HTML,
script or stylesheet failures stop capture promptly; unrelated favicon failures
are ignored. The tool closes only its own tabs/connections and leaves the supplied
Chrome and servers running. Stop those processes when finished.

For a capture-tool smoke regression, use the development-server URL printed by the
same consumer process, with a new phase name:

```sh
node scripts/capture-browser-report.mjs <smoke-phase> smoke 01 http://127.0.0.1:4174 http://127.0.0.1:9222
```

Use the actual printed port. No rebuild or repack is needed between the theme and
smoke captures. Smoke and benchmark report naming/export behavior is unchanged;
choose unique phases to preserve earlier evidence. Benchmark execution does not
use the themes event-handling or timeout options.
