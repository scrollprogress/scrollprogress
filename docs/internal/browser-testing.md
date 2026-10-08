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
| `tests/browser/`                               | Sources for the three test pages. Keep these in Git and edit them instead of generated copies.                             |
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
while scrolling is stopped and after the frame update. Outside the observation
area, state may intentionally retain the latest value, so a difference is not
necessarily a bug. `rootMargin` changes observation, not geometric progress.
`visualViewport` and page measurements help diagnose horizontal mobile behavior.

The [public compatibility contract](../compatibility.md) remains the complete reference,
including cases that need other examples or automated tests such as multiple
trackers, callbacks, resize and missing observers. This page does not certify
every case.

## 6. Benchmark: interpreting measurements correctly

For normal benchmark development, run `npm run benchmark:browser`. It builds the
local library and immediately serves the browser fixtures without running the
full tarball-consumer validation. Its saved report uses `mode: "local-build"` and
identifies the exact local build plus fixture with hashes. Before a release, use
`npm run consumer:browser` to repeat the benchmark against the package installed
from its real tarball.

Open **Performance baseline**, keep the tab in the foreground and close DevTools.
Choose **Run core baseline**, **Run debug isolation** or **Run all**, wait for
`status: complete`, then save. `complete` means measurement finished, not that
performance passed a threshold.

The collapsible performance summary lists every scenario in the selected suite
and fills each row as its measurement completes. It is intended for quick visual
comparison; the separately collapsible JSON report remains the complete source
for saved results. In the summary, palette DOM churn is the sum of complete
subtree nodes added and removed during measured frames.

The core suite measures 1, 100 and 300 trackers plus 1 tracker with 1,000
subscribers. The debug-isolation suite holds the workload at 100 trackers while
adding the bridge, overlay and palette independently, then together. It also keeps
the 25-tracker combined-debug case as a smaller reference. The palette cannot
display every card simultaneously: the test measures registry and rendering work
for all items, not only visible cards.

Every scenario is a named configuration consumed by the same runner. Future
stress profiles can vary tracker options or debug composition without duplicating
the measurement machinery. After 12 warmup frames, each scenario measures 60
frames while alternating the root scroll position between 0 and 40 pixels and
requesting `update({})` for every tracker. This is a controlled workload, not a
reproduction of every website.

The scroll check allows a maximum difference of **1 CSS pixel** from 0 and 40 to
handle fractional values returned by browsers. When present, `warnings` records
the difference and `scrollOffsets` retains the actual values. This is not a
library error. Larger differences, non-finite values or a root that does not move
when expected fail the test.

| Scenario field          | Interpretation                                                                                                                                                                      |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`, `label`           | Stable machine-readable ID and human description of the scenario.                                                                                                                   |
| `count`                 | Number of trackers.                                                                                                                                                                 |
| `subscribersPerTracker` | Subscribers added by the benchmark to each tracker, in addition to `onUpdate` and any debug subscribers.                                                                            |
| `trackerOptions`        | Scenario-specific tracker options. The shared root and delivery counter remain owned by the runner.                                                                                 |
| `debug`                 | Explicit booleans for bridge, palette and overlay instead of one ambiguous debug flag.                                                                                              |
| `createMs`              | Milliseconds for synchronous creation and mounting. It does not include later observer delivery and drawing.                                                                        |
| `geometryReads`         | Calls to `getBoundingClientRect` during measured frames, including debug calls. It does not represent all browser or observer work.                                                 |
| `readsPerFrame`         | `geometryReads` divided by the measured frame count, currently 60. Useful for detecting additional geometry reads.                                                                  |
| `deliveries`            | `onUpdate` calls plus benchmark subscribers. Excludes warmup and does not separately count internal debug subscribers.                                                              |
| `medianFrameMs`         | Median interval between frames: half the measurements are below it and half above. Includes browser scheduling and rendering, not only library CPU time.                            |
| `p95FrameMs`            | Approximately 95% of frame intervals are below this value. It highlights slower frames; with 60 samples it remains a short estimate.                                                |
| `meanScheduleMs`        | Average synchronous time required to request every update for a frame. Excludes scroll writes/reads and work performed later in `requestAnimationFrame`.                            |
| `paletteDomMutations`   | Child-list mutation records and complete subtree nodes added/removed inside the palette during measured frames; null when no palette is active. This instrumentation has some cost. |
| `scrollOffsets`         | Actual positions near 0 and 40, with a maximum tolerance of 1 CSS pixel, proving that the root moved.                                                                               |
| `fixtureSize`           | Inner dimensions of the root used by the test. Compare them across runs.                                                                                                            |

For example, a 16.7 ms median and 33 ms p95 indicate that many frames arrive near
the cadence of a 60 Hz display while some take longer. It does not mean that
ScrollProgress itself consumes 16.7 ms of CPU. A 120 Hz display may produce
intervals near 8.3 ms. This benchmark has no universal PASS threshold.

To compare two changes:

1. Use the same device, browser, viewport, zoom, power state and similar
   conditions. Avoid other heavy workloads; the page cannot detect all of them.
2. Run each candidate at least three times and save the results. Look for a
   repeated trend rather than a small difference in one run.
3. Compare the same scenario ID, suite and `benchmarkVersion`, checking package
   version and hash. Compare frame intervals, geometry reads and palette DOM churn.
4. If `warnings` reports a hidden tab or resize, repeat without interrupting the
   run. `failed` contains the error and completed scenarios; `running` is partial.
5. A repeated regression deserves investigation. One isolated value does not
   prove a regression, and a short benchmark does not certify every application.

The current method is identified by `benchmarkVersion: 3`. This number describes
the measurement procedure, not the ScrollProgress version. Version 3 introduces
named suites, explicit debug composition and palette DOM-mutation counters. Its
timings are not directly interchangeable with version 2 because mutation
instrumentation adds work to palette scenarios. Also compare `fixtureSha256` to
identify the exact fixture revision.

Version 3 is the first baseline retained for future comparisons. Earlier reports
used different scenarios or an older measurement method and must not be mixed
with the new baseline. Recreate measurements with the current fixture instead of
carrying those values forward.
