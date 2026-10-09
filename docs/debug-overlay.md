# Debug overlay

The overlay renders a diagnostic view of the item currently selected in the shared
debug registry. It can show target and root bounds, progress start and end markers,
the effective root margin and the current intersection.

It does not create trackers or calculate progress independently. A debug session
provides the shortest setup. The bridge and registry APIs remain available for
manual composition and third-party data sources.

Examples use syntax shared by JavaScript and TypeScript.

## Quick setup with a session

```js
import { trackScrollProgress } from '@scrollprogress/scrollprogress';
import { createScrollProgressDebugger } from '@scrollprogress/scrollprogress/debug/session';

const target = document.querySelector('[data-scroll-target]');

if (!(target instanceof HTMLElement)) {
    throw new Error('Missing scroll target');
}

const tracker = trackScrollProgress(target);
const debug = createScrollProgressDebugger(tracker, {
    label: 'Hero',
    overlay: true
});

function cleanup() {
    debug.destroy();
    tracker.destroy();
}
```

Set `overlay` to an options object to configure its initial appearance. A session
does not expose the overlay controller; use the direct factory when runtime layer
controls are required.

## Direct controller setup

```js
import { trackScrollProgress } from '@scrollprogress/scrollprogress';
import { debugScrollProgress } from '@scrollprogress/scrollprogress/debug';
import { createDebugOverlay } from '@scrollprogress/scrollprogress/debug/overlay';

const element = document.querySelector('[data-scroll-target]');

if (!(element instanceof HTMLElement)) {
    throw new Error('Missing scroll target');
}

const tracker = trackScrollProgress(element, {
    start: 0.8,
    end: 0.4
});

const bridge = debugScrollProgress(tracker, {
    debugId: 'hero',
    label: 'Hero'
});

const overlay = createDebugOverlay();

function cleanup() {
    overlay.destroy();
    bridge.destroy();
    tracker.destroy();
}
```

The palette is optional. The overlay reads the selected item directly from the
shared debug registry. It can be the only registry view, or it can run alongside
the palette, console logger or a custom registry consumer. It may also be created
before any items are registered.

## Options

| Option             | Default                  | Meaning                                          |
| ------------------ | ------------------------ | ------------------------------------------------ |
| `target`           | `document.body`          | `HTMLElement` that receives the overlay          |
| `className`        | —                        | Space-separated classes added to its root        |
| `theme`            | —                        | Imported theme selected on the overlay           |
| `visibleLayers`    | `['target', 'progress']` | Layers visible when the overlay is created       |
| `clipTargetToRoot` | `false`                  | Clip the target layer to a custom root rectangle |
| `colors`           | —                        | Partial color overrides                          |
| `labelPlacements`  | —                        | Partial placement overrides for overlay labels   |

The `target` option controls DOM ownership, not the overlay's coordinate space.
The overlay remains fixed to viewport coordinates even when it is appended to a
custom target. A custom mount can keep development tooling inside an
application-owned portal, micro-frontend boundary, preview host, or dedicated
debug container instead of adding it directly to `document.body`.

`document.body` is the recommended mount. With a custom `target`, a transformed
ancestor can establish a different containing block for the overlay's
`position: fixed` geometry. Container overflow, clipping, and stacking contexts
can also constrain the overlay or prevent its z-index from escaping that context.

For example, this mount changes the fixed-position reference and clips anything
outside its 300-pixel box:

```html
<div id="debug-mount"></div>
```

```css
#debug-mount {
    height: 300px;
    overflow: hidden;
    transform: translateZ(0);
}
```

```js
const mount = document.querySelector('#debug-mount');

if (!(mount instanceof HTMLElement)) {
    throw new Error('Missing debug mount');
}

const overlay = createDebugOverlay({
    target: mount
});

function cleanup() {
    overlay.destroy();
}
```

The transform can make the overlay's fixed geometry relative to `debug-mount`
instead of the viewport. `overflow: hidden` can then clip it, while the resulting
stacking context can keep its z-index below content outside the mount. Use a custom
target only when those layout effects are intentional or otherwise controlled.

## Layers

The overlay can render five layers:

| Layer          | Meaning                                                                         |
| -------------- | ------------------------------------------------------------------------------- |
| `target`       | The current bounding box of the tracked element.                                |
| `progress`     | The geometric range between the configured `start` and `end` trigger positions. |
| `root`         | The viewport or custom root used by the tracker.                                |
| `margin`       | The effective root after applying `rootMargin`.                                 |
| `intersection` | The current intersection between the target and the effective root.             |

By default, the overlay starts with the `target` and `progress` layers visible.

## Visible layers

```js
const overlay = createDebugOverlay({
    visibleLayers: [
        'target',
        'progress',
        'root',
        'margin',
        'intersection'
    ]
});
```

The controller also exposes runtime visibility controls:

```js
console.log(overlay.getLayerVisibilityState());

overlay.setLayerVisible('root', true);
overlay.toggleLayerVisible('intersection');
```

When the palette is present, the same layer state can be changed from the `Overlays` control group.

## Colors

Each visual color can be overridden independently.

Supported color IDs:

- `target`
- `progress-start`
- `progress-end`
- `root`
- `margin`
- `intersection`

```js
const overlay = createDebugOverlay({
    colors: {
        target: {
            color: '#ff00a8',
            labelTextColor: '#ffffff'
        },
        'progress-start': {
            color: '#b6ff00',
            labelTextColor: '#111111'
        },
        'progress-end': {
            color: '#00e5ff',
            labelTextColor: '#111111'
        }
    }
});
```

Partial overrides are supported. Unspecified values keep their defaults.

## Themes

Import an optional theme and select it when creating the overlay:

```js
import '@scrollprogress/scrollprogress/debug/themes/paper.css';

const overlay = createDebugOverlay({
    theme: 'paper'
});
```

Values supplied through `colors` are written inline and take precedence over the
selected theme. See [debug theming](theming.md) for the optional themes, custom
theme contract, copyable templates and complete precedence rules.

## Label placement

Labels can be configured independently for:

- `target`
- `progress-start`
- `progress-end`
- `root`
- `margin`
- `intersection`

A placement contains:

```text
{
    mode: 'internal' | 'external',
    vertical: 'top' | 'bottom',
    horizontal: 'left' | 'center' | 'right'
}
```

Example:

```js
const overlay = createDebugOverlay({
    labelPlacements: {
        target: {
            mode: 'external',
            vertical: 'bottom',
            horizontal: 'center'
        },
        'progress-start': {
            mode: 'internal',
            vertical: 'bottom',
            horizontal: 'right'
        },
        'progress-end': {
            mode: 'internal',
            vertical: 'top',
            horizontal: 'left'
        }
    }
});
```

There is no vertical `center` position. Horizontal centering is supported.

Partial placements are merged with the default placement for that label. Invalid
runtime values fall back independently for `mode`, `vertical`, and `horizontal`,
not for the entire placement object.

## JavaScript runtime validation

TypeScript normally rejects unknown layer names, color IDs, and placement values.
JavaScript or dynamically loaded configuration can still supply them. The
following example is intentionally outside the typed contract:

```js
const overlay = createDebugOverlay({
    visibleLayers: ['target', 'unknown-layer'],
    colors: {
        unknown: {
            color: 'red'
        }
    },
    labelPlacements: {
        target: {
            mode: 'external',
            vertical: 'middle',
            horizontal: 'center'
        }
    }
});

function cleanup() {
    overlay.destroy();
}
```

| Input                  | Runtime result                                     |
| ---------------------- | -------------------------------------------------- |
| `'unknown-layer'`      | Does not make an additional layer visible          |
| Color ID `unknown`     | Ignored                                            |
| `mode: 'external'`     | Preserved because it is valid                      |
| `vertical: 'middle'`   | Falls back to the target label's default (`'top'`) |
| `horizontal: 'center'` | Preserved because it is valid                      |

Placement fallback is applied per field, not to the complete placement object.
Color values for known IDs are assigned as CSS values and left to the browser for
validation.

## Centered margin-label collision handling

The `margin` layer has one main label and can also show one offset label for each
side of `rootMargin`.

When the main `margin` label is configured as an internal, horizontally centered
top or bottom label and it would collide with a centered offset label, the overlay
moves the main label laterally while keeping the offset label centered.

This fallback is visual only. It does not change the configured placement object.

## `rootMargin` visualization

The `margin` layer represents the real effective-root geometry.

The overlay also displays offset labels for the top, right, bottom, and left sides.

- Positive margins expand the effective root.
- Negative margins contract the effective root.
- Zero-value sides do not show an offset guide.
- Mixed positive, negative, and zero values are handled independently.

For a viewport root, positive margins may place the real margin boundary outside
the visible page. In that case, the overlay anchors the offset label to the visible
viewport edge and marks the boundary as offscreen.

Negative viewport margins remain visible inside the viewport.

Percentage values are resolved against the root width, including top and bottom
percentages, matching `IntersectionObserver` root-margin behavior.

The overlay updates percentage-based guides after viewport or root resize.

## Custom roots

The overlay supports both viewport tracking and custom scroll roots.

```js
const root = document.querySelector('[data-scroll-root]');
const target = document.querySelector('[data-scroll-target]');

if (!(root instanceof HTMLElement) || !(target instanceof HTMLElement)) {
    throw new Error('Missing scroll elements');
}

const tracker = trackScrollProgress(target, {
    root,
    axis: 'y',
    requireRootVisible: true
});
```

For custom roots, the `root`, `margin`, `intersection`, and optional target-clipping
layers use the custom root geometry.

## Target clipping

```js
const overlay = createDebugOverlay({
    clipTargetToRoot: true
});
```

When enabled and the selected tracker uses a custom root, the target layer is clipped to the custom root rectangle.

The clipping is rectangular. It does not reproduce CSS `border-radius`, `clip-path`,
masks, transforms or arbitrary overflow shapes.

The target label is considered part of the target layer. An external target label
can therefore be partially or fully clipped when `clipTargetToRoot` is enabled.

The palette exposes a footer control for toggling this behavior when a custom root is applicable.

## Selection and synchronization

The overlay follows the item selected in the shared debug registry.

With an empty registry or a `null` selection, the overlay remains mounted but
clears and hides its geometry. Registering the next first item selects it
automatically and makes geometry visible again.

### Detached targets

Removing the selected target from the DOM only detaches that `HTMLElement`; it
does not destroy the JavaScript object. The same element can be moved between
containers or inserted again, including during transitions, framework updates,
and temporary detach-and-reattach operations. ScrollProgress therefore does not
treat `element.isConnected === false` as a terminal lifecycle event. Automatically
destroying the tracker at the first disconnection would make a valid reinsertion
irreversible.

Choose cleanup according to what the application does next:

- when the same element will be reinserted, keep its tracker;
- when removal is permanent, destroy the tracker so its observers and references
  are released and its ordinary bridge item leaves the registry;
- when the application creates a clone or replacement element, destroy the old
  tracker and create a new tracker for the new element.

For a component that permanently removes its tracked target:

```js
function cleanup() {
    tracker.destroy();
    target.remove();
}
```

The tracker retains the original element identity and never transfers tracking to
a clone or replacement automatically. Completed `once` snapshots remain subject
to their documented [bridge lifecycle](debug.md#connect-a-tracker-manually).

It synchronizes after:

- registry selection changes;
- scroll events, including nested scroll containers;
- viewport resize;
- target resize;
- custom-root resize;
- target replacement;
- root replacement;
- item unregistration.

Updates are coalesced through `requestAnimationFrame`.

## Multiple overlays

Multiple overlays can share the registry as an advanced visual-comparison setup.
They all follow the same selected item; they do not provide independent tracker
selection. When mounted in the same target, they draw against the same geometry
and their layers and labels can overlap. Different colors, visible layers, label
placements, themes, clipping settings or mount targets can distinguish them.

This can be useful while comparing:

- themes or color configurations;
- label placements;
- target clipping enabled and disabled;
- layer combinations;
- behavior under different mount layouts.

Each overlay registers its own `Overlays` group in the palette, and that group
changes only the layer and clipping state of the overlay that created it. Prefer a
single overlay for ordinary debugging.

## Cleanup

Always destroy the overlay when its development surface is removed:

```js
overlay.destroy();
```

`destroy()` removes the overlay DOM, listeners, observers, scheduled updates, and registered palette controls.

In a Vite application, destroy the overlay before the module is replaced:

```js
if (import.meta.hot) {
    import.meta.hot.dispose(() => {
        overlay.destroy();
    });
}
```

## Current limitations

- The selected target, custom root, overlay mount and browser globals must belong to
  the same document.
- Same-origin iframe and general `ownerDocument` / `defaultView` support are not
  available in RC1.
- Viewport-level horizontal tracking can behave differently across mobile browsers. A custom horizontal root is the recommended component-level use case.
- The overlay is a development tool and should not be treated as part of the production interface.

## Public types

The overlay entry point exports:

- `ScrollProgressDebugOverlay`
- `ScrollProgressDebugOverlayOptions`
- `ScrollProgressDebugOverlayColor`
- `ScrollProgressDebugOverlayColorId`
- `ScrollProgressDebugOverlayColors`
- `ScrollProgressDebugOverlayLabelId`
- `ScrollProgressDebugOverlayLabelPlacement`
- `ScrollProgressDebugOverlayLabelPlacements`
- `ScrollProgressDebugOverlayLayer`
- `ScrollProgressDebugOverlayLayerVisibilityState`
