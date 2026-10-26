# Release status and records

> Internal record of candidate preparation and published artifact verification.

This page tracks `@scrollprogress/scrollprogress@1.0.0` preparation and retains
the first public release candidate's registry identity. Earlier private
development history is intentionally omitted.

## 1.0.0 preparation status

As of 2026-10-26, the local stable candidate is
`e5e355ceafcb6c4362b22ac15141dffdfce26d8e` on `dev`, following integration commit
`ef7ab0521974b07746a93ba97d8cd89688c96dcb`. Local verification is recorded below;
the release PR, CI on the resulting `main` commit, staging and publication remain
pending. Version `1.0.0` has not been published.

| Checkpoint                          | Status                                            |
| ----------------------------------- | ------------------------------------------------- |
| Metadata and migration guidance     | Reviewed; committed as `5e6a311`                  |
| Development-tool security updates   | Committed as `e5e355c`; installation audit clean  |
| Local automated gates               | Maintainer reports `verify` and `play:build` PASS |
| External installed-tarball consumer | Saved report confirms all 17 checks               |
| Desktop smoke                       | Chrome, Firefox and Safari: 15/15 PASS each       |
| Focused manual pass                 | Chrome: guided checks confirmed; report retained  |
| Candidate archive                   | Retained with SHA-256 and npm integrity below     |
| Release PR, final commit and tag    | Pending                                           |
| Staging identity comparison         | Pending                                           |
| Registry installation verification  | Pending                                           |

The registry was checked read-only on 2026-10-26: `rc` resolves to
`1.0.0-rc.1`, `latest` resolves to `0.0.0-stage`, and `1.0.0` is not published.
Recheck these values before staging and after publication; metadata preparation
does not change registry state. No open GitHub issues were returned by the same
day's read-only check; that does not establish the absence of private RC feedback.

## Stable candidate evidence

The retained external-consumer archive contains 86 files, 69,073 packed bytes and
279,581 unpacked bytes. Its identity is:

```text
SHA-256: 99140bac524cd2d852d40a89b7ee8983759d8b84ed1db86828e6ea6034a19ec6
npm integrity: sha512-KnbyX187dFi2jWyHhLzk9RFnKfr/uNVH6DXe9oQ5N71TSI1B1zXgtWCVgy49oxmIJYHA7AYIGv+4dwF9XW19Uw==
```

Evidence is retained locally under `test-results/reports/v1-1.0.0-e5e355c/`:
the archive, external consumer report, candidate identity, compiler-output
comparison, three smoke reports and the Chrome manual report. Companion smoke
and manual summaries preserve raw-report hashes and distinguish independent
report checks from maintainer confirmations. Raw browser reports are unchanged.

The maintainer reported `npm run verify` and `npm run play:build` passing before
committing the same development-tool updates. Independently checked: the archive
matches the consumer report and current packaged files, all three smoke reports
match its SHA-256 and contain 15/15 PASS with null `metadataError`, and the manual
report's identity and snapshots are consistent.

The guided Chrome pass covered viewport/custom roots on both axes, reverse
scrolling, resize, inversion, `once`, debug views/controls/keyboard access,
destruction, CSS persistence and recreation. Visual results were confirmed by the
maintainer in the release conversation. The raw manual checklist remains
`not-tested`; the recorded actions and confirmations are retained separately,
not converted into an automatic PASS.

Coverage limits of the saved browser fixtures: Firefox and Safari have smoke
reports only; physical mobile and a separate manual observer-option pass have no
retained reports. Manual environment observation fields remain empty. The maintainer accepts the captured
user-agent/environment values without additional manual field entry. These
limits do not establish a failure, and no untested environment is certified.

The tools used were Node 24.18.0, npm 11.16.0, Vite 8.1.6, Vitest 4.1.12 and
Happy DOM 21.0.4. The dependency installation reported zero audit vulnerabilities;
this observation is dated, not a guarantee about future advisories.

## Prior local RC-version evidence

Earlier installed-package reports identify tarball SHA-256
`c19ae25d6436ad238da24b04d8c65bb52a23af4ca8b74b1fa8a3131ef6394bd8`.
They remain evidence for that RC-version archive, not a verification record for
the stable archive. Benchmark v4 and v5 reports remain distinct series.

Library source, browser fixtures and TypeScript declarations are unchanged from
that baseline. Updated Vite/Rolldown/Oxc changes the generated JavaScript: the
reviewed differences are three equivalent boolean rewrites and dependent chunk
filenames/imports. Other normalized `dist/` files are identical. Do not describe
the stable `dist/` as byte-identical to the RC baseline.

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
