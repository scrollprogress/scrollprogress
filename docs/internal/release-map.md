# Release status and records

> Internal record of candidate preparation and published artifact verification.

This page tracks `@scrollprogress/scrollprogress@1.0.0` preparation and retains
the first public release candidate's registry identity. Earlier private
development history is intentionally omitted.

## 1.0.0 preparation status

As of 2026-10-26, stable metadata and documentation are being prepared on `dev`,
starting from integration commit `ef7ab0521974b07746a93ba97d8cd89688c96dcb`.
The stable candidate has not yet passed its final gates or been published.

| Checkpoint                          | Status                                  |
| ----------------------------------- | --------------------------------------- |
| Metadata and migration guidance     | Prepared for review                     |
| Final automated and browser gates   | Pending for the stable archive          |
| Candidate SHA-256 and npm integrity | Pending; no stable archive retained yet |
| Release PR, commit and tag          | Pending                                 |
| Staging identity comparison         | Pending                                 |
| Registry installation verification  | Pending                                 |

The registry was checked read-only on 2026-10-26: `rc` resolves to
`1.0.0-rc.1`, `latest` resolves to `0.0.0-stage`, and `1.0.0` is not published.
Recheck these values before staging and after publication; metadata preparation
does not change registry state. No open GitHub issues were returned by the same
day's read-only check; that does not establish the absence of private RC feedback.

Earlier installed-package reports identify tarball SHA-256
`c19ae25d6436ad238da24b04d8c65bb52a23af4ca8b74b1fa8a3131ef6394bd8`.
They remain evidence for that RC-version archive, not a verification record for
the future stable archive. Benchmark v4 and v5 reports remain distinct series.

## Candidate surface

The package is ESM-only, dependency-free at runtime and browser-oriented. It
exposes these JavaScript entry points:

| Entry                                           | Purpose                                           |
| ----------------------------------------------- | ------------------------------------------------- |
| `@scrollprogress/scrollprogress`                | One-shot reads and continuous tracking            |
| `@scrollprogress/scrollprogress/debug/session`  | Composable tracker and debug-tool lifecycle       |
| `@scrollprogress/scrollprogress/debug`          | Tracker-to-debug bridge                           |
| `@scrollprogress/scrollprogress/debug/registry` | Shared debug registry and external integrations   |
| `@scrollprogress/scrollprogress/debug/console`  | Quick selected-item inspection in the console     |
| `@scrollprogress/scrollprogress/debug/palette`  | Interactive diagnostics and control groups        |
| `@scrollprogress/scrollprogress/debug/overlay`  | Target bounds, progress markers and intersections |

Optional Neon Grid and Paper CSS themes are separate exports. Core imports do
not install debug UI, styles or global state.

## Automated release gate

`npm run verify` checks types, lint, formatting, unit and integration tests,
tooling tests, production entries, exact runtime exports, tarball contents and an
external installed-package consumer. The consumer covers supported TypeScript
versions and both Bundler and NodeNext resolution, and confirms that a core-only
bundle excludes debug code.

`npm run play:build` separately verifies every playground page. Both commands
must pass for the exact candidate commit and package contents.

## Browser verification scope

The installed-tarball smoke page and focused manual passes cover:

- viewport and custom roots on both axes;
- resize and orientation changes;
- lifecycle teardown and `once` completion;
- palette, overlay, console logger and third-party controls together;
- at least one physical mobile browser when available.

Save relevant reports outside the generated consumer directory. Browser checks
are evidence for the tested environments, not a universal browser certification.

## Accepted v1 boundaries

- Targets and custom roots belong to the current document.
- Custom roots are untransformed scrolling ancestors.
- `IntersectionObserver` and animation frames are required; `ResizeObserver` is
  optional.
- The package has no CommonJS build or bundled polyfills.
- Debug UI is optional development tooling. Palette rendering currently replaces
  its list as a unit; incremental rendering remains an internal optimization.
- Arbitrary palette DOM/render plugins, framework adapters and multi-element
  aggregation are outside the 1.0.0 surface.

## Historical 1.0.0-rc.1 registry record

RC1 was published on 2026-10-08 and remains available through `rc` at the registry
checkpoint above. Its published npm integrity is:

```text
sha512-C6KxlMR0WFssaOYbvENjTRn5Ellh6RduxmasBY75XIJ7wuxk4HNsKe2JC/m2I/WoMGYgAY6Z/2SyHqDi4x+IUA==
```

This is the registry RC1 identity; it differs from the later locally tested
RC-version archive identified above. It is not a post-publication test result.

## Complete the stable release record

Follow the [release procedure](release.md). Replace the pending statuses with
actual evidence as each checkpoint completes, retaining:

- candidate and final `main` commit IDs, the `v1.0.0` tag and release PR;
- candidate archive SHA-256, npm integrity, file count and sizes;
- gate results, browser/OS/device details and any accepted coverage gaps;
- staging workflow URL, stage ID and matching downloaded-archive identity;
- published version, dist-tags, integrity, provenance information and fresh
  registry-installation results;
- the final GitHub release URL.

Keep raw reports and archives outside generated consumer directories and out of
Git. Record results for the distributed artifact, not only a local build.
