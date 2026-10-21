# Changelog

This changelog starts with the first public release candidate. Internal development
history before that point is intentionally omitted.

## Unreleased

### Fixed

- Release terminal tracker references and subscription handles from debug bridges
  and sessions while preserving completed `once` snapshots and duplicate rules.
- Attempt all debugger cleanup after failures, roll back failed bridge/session
  construction and dynamic additions, and preserve the first applicable error.
- Reserve debug registrations before synchronous registry notification and release
  late-acquired resources if a runtime addition destroys its owning session.
- Balance enter/leave transitions across effective root changes without repeating
  throwing lifecycle callbacks. Commit state and CSS before pending root leave,
  and reconsider an undelivered enter on the next requested update.
- Synchronize geometry outside tracking and through intermediate scrolling
  ancestors, while keeping lifecycle under native intersection observation.
- Normalize document viewport root aliases across core and overlay, preserving
  configured root identity and resources when switching equivalent aliases.
- Preserve progress and CSS variables for targets without layout boxes; these
  updates no longer complete `once`.

### Changed

- Declare CSS files as package side effects so supporting bundlers can remove
  unused JavaScript while retaining explicitly imported debug themes.

- Warn once per tracker for a measured non-positive travel distance (`D <= 0`)
  instead of warning solely on `start <= end`. Valid measured ranges stay silent;
  configuration changes are diagnosed at the next measurement, preserving the
  existing step fallback without additional geometry reads.
- Preserve configured viewport-root aliases while using the effective viewport for
  resources and geometry. `getState()` may temporarily return `null` after an
  effective root or `requireRootVisible` change, but not between equivalent aliases.
- `readScrollProgress()` returns `number | null`, with `null` for detached targets
  and targets without layout boxes. Consumers must handle the nullable result.

## 1.0.0-rc.1

Initial public release candidate of `@scrollprogress/scrollprogress`.

- Continuous DOM scroll-progress tracking with lifecycle callbacks, subscriptions,
  dynamic configuration, custom roots, horizontal tracking, `once`, inversion and
  CSS custom-property output.
- Advanced one-shot DOM geometry reads through `readScrollProgress()`.
- Optional debug bridge, registry integrations, console logger, palette, overlay
  and declarative palette control groups through separate entry points, plus an
  optional debug session that composes them behind one lifecycle.
- ESM package with TypeScript declarations, optional themes and no runtime
  dependencies.
