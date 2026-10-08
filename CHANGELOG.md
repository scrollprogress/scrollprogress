# Changelog

This changelog starts with the first public release candidate. Internal development
history before that point is intentionally omitted.

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
