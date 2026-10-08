# RC1 release record

> Internal record retained for the first public commit and release verification.

This page records the public surface and verification boundaries of
`@scrollprogress/scrollprogress@1.0.0-rc.1`. It starts at the first public release
line; earlier private development history is intentionally omitted.

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
  aggregation are outside the RC1 surface.

## Release record

RC1 is the first public release line. The release record should retain the exact
published tarball identity, registry integrity, Git tag and post-publication
installation results so later verification refers to the distributed artifact,
not only to a local build.
