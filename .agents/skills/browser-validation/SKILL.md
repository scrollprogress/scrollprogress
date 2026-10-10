---
name: browser-validation
description: Validate ScrollProgress geometry, scrolling, observers, resize, focus, rendering, performance, and lifecycle behavior with appropriate automated and real-browser evidence.
---

# Browser validation

Use this workflow when a change can behave differently in a real browser or depends on layout,
scrolling, native observers, animation frames, focus, rendering or teardown.

## Establish the required evidence

1. Read the relevant public contract in `docs/compatibility.md` and the procedure in
   [the browser testing guide](../../../docs/internal/browser-testing.md).
2. Add or update automated unit/integration coverage first. DOM simulation is not browser
   layout evidence.
3. Choose the smallest real-browser workflow that exercises the risk:
   - use the playground for development and reproductions against source;
   - use `npm run consumer:browser` for installed-tarball smoke and manual checks;
   - use `npm run benchmark:browser` only for performance-sensitive work;
   - use physical-device checks only when the task or compatibility claim requires them.
4. Test the affected axes, viewport/custom-root modes and lifecycle transitions. Include error
   and teardown paths when listeners, observers, frames, subscriptions or debug DOM changed.

## Record results accurately

- Open the HTTP URL printed by the server; do not open generated pages with `file://`.
- Save relevant reports under `test-results/reports/`, never inside the generated consumer.
- Record the candidate identity, browser, operating system, device and exact scenarios.
- A smoke pass proves only its scenarios in that browser. A completed benchmark is a
  measurement, not a performance pass threshold. Do not claim untested browsers or devices.
- Stop development servers after the check and report manual steps, results and omissions.
