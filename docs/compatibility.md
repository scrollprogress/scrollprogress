# Compatibility

ScrollProgress is an ESM-only browser library. It has no CommonJS build, runtime
dependencies or bundled polyfills.

## Browser target

The production build targets:

- Chrome and Edge 111 or later;
- Firefox 114 or later;
- Safari and iOS Safari 16.4 or later.

These versions are the compilation floor, not a claim that every release and
device combination has been tested.

The library uses native ESM, optional chaining, Set and Map, CSS custom properties
and the browser APIs described below.

## Required browser APIs

| API                     | Requirement                                      |
| ----------------------- | ------------------------------------------------ |
| `IntersectionObserver`  | Required to construct a tracker                  |
| `requestAnimationFrame` | Required to schedule tracker updates             |
| `cancelAnimationFrame`  | Required to cancel scheduled work                |
| `ResizeObserver`        | Optional; see fallback behavior below            |
| `queueMicrotask`        | Used by debug registry error reporting           |
| `console.table`         | Required only while the console logger is active |

Without `ResizeObserver`, viewport resize, active scrolling, intersection changes
and explicit `tracker.update({})` still synchronize state. Size changes caused by
images, fonts, dynamic content, or resizing a custom root are not detected
automatically unless they also cause scroll, viewport resize, intersection, or an
explicit `tracker.update({})`. Call `update({})` after an otherwise silent change.

Optional debug views use additional browser features:

| Feature              | Used by                             |
| -------------------- | ----------------------------------- |
| Pointer Events       | Desktop palette dragging            |
| `DOMRect.fromRect()` | Overlay viewport and layer geometry |
| `color-mix()`        | Overlay intersection visualization  |

These APIs are not required by the core tracker or `readScrollProgress()`.

## DOM and document boundaries

Targets, element roots, and an explicit `Document` root must belong to or be the
current `document`. External documents and iframe documents remain outside the
supported contract; cross-document and same-origin iframe coordination are not
supported in RC1.

The supported custom root is an untransformed scrolling ancestor of the target.
Scaled or rotated roots, arbitrary clipping shapes and visual-viewport compensation
are outside the geometry model.

Viewport horizontal tracking follows the browser's document scrolling behavior,
which can vary on mobile. Prefer a custom horizontal root for component-level use.

## Server-side imports

Importing the JavaScript entry points without `window` or `document` is supported.
The modules do not create DOM at import time.

Constructing trackers, reading geometry, or creating debug views requires browser
globals. ScrollProgress does not provide an operational server-side tracker.

SSR applications may import ScrollProgress modules during server rendering, but
trackers, geometry reads, palettes, and overlays must be created in a client-only
lifecycle after the document is available. Importing `createDebugPalette()` or
`createDebugOverlay()` is server-safe; calling either factory during server
rendering is not.

Theme CSS is separate from this JavaScript import guarantee. CSS imports require
support from the application's bundler or stylesheet pipeline and may need to be
loaded only by client-side code.

## TypeScript

Published declarations support TypeScript 5.5 and later. They are checked with
strict settings and `skipLibCheck: false` using both Bundler and NodeNext module
resolution.

The release checks cover:

| Compiler         | Bundler   | NodeNext  |
| ---------------- | --------- | --------- |
| TypeScript 5.5.4 | Supported | Supported |
| TypeScript 5.9.3 | Supported | Supported |
| TypeScript 6.0.3 | Supported | Supported |

These exact versions make the checks reproducible. The consumer contract is
TypeScript 5.5+, not only the three listed patch releases. TypeScript 6.0.3 is the
repository's development compiler and is not required by applications.

## Intersection behavior

Intersection thresholds control notification crossings. A browser can report
`isIntersecting: true` with an intersection ratio of zero, such as at edge contact.
ScrollProgress uses `isIntersecting` for tracking rather than comparing the ratio
with the configured threshold.

`rootMargin` affects the observation area but does not alter progress geometry.
Percentage root margins follow native `IntersectionObserver` behavior and are
resolved against the root width, including top and bottom margins.

## Content security policy and debug limitations

Palette and overlay insert an embedded `<style>` element when constructed, so the
policy for style elements must allow it. They also apply runtime styles to
elements for geometry, palette dragging, color overrides, and indicators; the CSP
must permit those style attributes as well. Importing an external theme does not
replace or suppress the embedded style element. The current constructors provide
no nonce option.

Other debug limitations:

- Overlay geometry is a rectangular diagnostic approximation. Native
  `IntersectionObserver` remains authoritative for tracking flags.
- Drag positioning in the palette has no keyboard equivalent in RC1.
- Debug views are development tools and are not intended as production UI.

## Not included in RC1

- CommonJS output;
- legacy browser polyfills;
- framework-specific adapters;
- multi-element aggregation;
- cross-document tracking;
- transformed-root compensation;
- visual-viewport compensation.

Reproducible compatibility problems should include the package version, browser
and operating-system versions, a minimal example and the expected and observed
behavior. Maintainer testing procedures and retained evidence live in the
repository's internal documentation.
