# Compatibility evidence

> Internal release record. The public support contract is documented in
> [Compatibility](../compatibility.md).

## Recorded verification

| Environment                                      | Result                                                                                                        |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| Node 24.18.0 / npm 11.16.0 / macOS 26.6.2 x86_64 | Release build, automated tests and installed-package checks                                                   |
| TypeScript 5.5.4 / 5.9.3 / 6.0.3                 | Installed declarations passed with Bundler and NodeNext resolution, strict checking and `skipLibCheck: false` |
| happy-dom 20.10.6                                | Simulated DOM coverage only; not browser-layout evidence                                                      |
| Codex In-app Browser, 2026-09-17                 | Eight installed-tarball smoke scenarios passed; reported UA Chromium 152.0.0.0                                |
| Codex In-app Browser, 2026-09-21                 | Eight scoped installed-tarball smoke scenarios passed; reported UA Chromium 153.0.0.0, 1280×720, DPR 2        |
| Desktop Chrome, Firefox and Safari               | Representative smoke checks completed without blocking issues                                                 |

The September 17 run used tarball SHA-256
`bb1efa0fb030460fe3a6ce3cee0af971b53a8534cf394ec6c2c70091db0bec82`.
Its report was retained locally as
`test-results/browser-smoke-2026-09-17.json`. Local `test-results` files are
release evidence, not distributable documentation.

User-agent strings do not independently establish the exact browser build or host
operating-system version. These results cover the recorded environments, not every
browser release or device at the public compilation floor.

## Focused manual checklist

- Viewport and custom roots on both axes, including forward and reverse scrolling.
- Positive and negative `rootMargin`, single and multiple thresholds, and the
  separation between ratio, observation and progress geometry.
- `requireRootVisible`, `inverted` and `once`, including a cycle that begins past
  the terminal range without having entered tracking.
- Updates to root, axis, range, inversion, callbacks and CSS; invalid native
  observer configuration; coalesced updates; target/root resize; missing
  `ResizeObserver` fallback.
- CSS persistence after destroy; simultaneous trackers; repeated destroy and
  recreation; no stale frame reactivation.
- Bridge, console, palette and overlay together, including selection, controls,
  focus, clipping, labels, resize, drag and teardown.
- Callback failure in one tracker while another remains active; reached `once`
  completion after a callback error.

Use the [browser testing guide](browser-testing.md) when collecting new evidence.
