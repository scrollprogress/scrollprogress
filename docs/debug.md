# Debug tools

ScrollProgress debug tools are optional and live in separate entry points. Importing
the core tracker does not include debug code, styles or shared debug state. The
session entry provides the shortest complete setup; every tool also remains
available independently for custom composition.

A typical debug setup has two parts:

1. a bridge publishes a tracker to the shared registry;
2. one or more views read the selected registry item.

The registry is shared per loaded package module instance. Use one resolved package
version so every bridge and view sees the same data.

A session composes these pieces but does not create an isolated registry. Multiple
sessions from the same package instance see the same items and selection, so one
session per page-level debug environment is usually the clearest setup.

Choose the smallest view that answers the current debugging question:

| Tool           | Use it for                                                        |
| -------------- | ----------------------------------------------------------------- |
| Console logger | Quickly inspect the selected item without mounting a visual UI    |
| Palette        | Browse items, inspect state and run registered diagnostic actions |
| Overlay        | See target bounds, progress markers, roots and intersections      |

Examples use syntax shared by JavaScript and TypeScript. Runtime element checks
also provide TypeScript narrowing.

## Start a debug session

For one tracker, create a session with the tracker and enable only the tools you
need:

```js
import { trackScrollProgress } from '@scrollprogress/scrollprogress';
import { createScrollProgressDebugger } from '@scrollprogress/scrollprogress/debug/session';

const target = document.querySelector('[data-scroll-target]');

if (!(target instanceof HTMLElement)) {
    throw new Error('Missing scroll target');
}

const tracker = trackScrollProgress(target);
const debug = createScrollProgressDebugger(tracker, {
    label: 'Story',
    palette: true,
    overlay: true,
    console: { throttleMs: 100 }
});

function cleanup() {
    debug.destroy();
    tracker.destroy();
}
```

The session owns the bridge and the tools it creates. It does not own or destroy
the application tracker.

The factory supports a single-tracker form and a composable options form:

```ts
function createScrollProgressDebugger(
    tracker: ScrollProgressTracker,
    options?: ScrollProgressDebuggerSingleTrackerOptions
): ScrollProgressDebuggerController;

function createScrollProgressDebugger(
    options?: ScrollProgressDebuggerOptions
): ScrollProgressDebuggerController;
```

Session options:

| Option     | Accepted in                                 | Meaning                                      |
| ---------- | ------------------------------------------- | -------------------------------------------- |
| `debugId`  | Single-tracker form or tracker registration | Diagnostic identifier forwarded to bridge    |
| `label`    | Single-tracker form or tracker registration | Human-readable name forwarded to bridge      |
| `trackers` | Composable options form                     | Initial tracker registrations                |
| `palette`  | Both forms                                  | Enable palette or pass palette options       |
| `overlay`  | Both forms                                  | Enable overlay or pass overlay options       |
| `console`  | Both forms                                  | Enable logger or pass console logger options |

For each tool, `true` enables it with defaults, an options object is passed to its
factory, and `false` or omission leaves it disabled.

### Register multiple trackers

Use `trackers` when the complete set is known at creation time:

```js
import { trackScrollProgress } from '@scrollprogress/scrollprogress';
import { createScrollProgressDebugger } from '@scrollprogress/scrollprogress/debug/session';

const storyTarget = document.querySelector('[data-story]');
const chapterTarget = document.querySelector('[data-chapter]');

if (!(storyTarget instanceof HTMLElement) || !(chapterTarget instanceof HTMLElement)) {
    throw new Error('Missing debug targets');
}

const storyTracker = trackScrollProgress(storyTarget);
const chapterTracker = trackScrollProgress(chapterTarget);

const debug = createScrollProgressDebugger({
    trackers: [
        { tracker: storyTracker, label: 'Story' },
        { tracker: chapterTracker, label: 'Chapter' }
    ],
    palette: true,
    overlay: true
});

function cleanup() {
    debug.destroy();
    chapterTracker.destroy();
    storyTracker.destroy();
}
```

### Add trackers later

An empty session can create its views first and register trackers later. The
controller returned by `addTracker()` detaches only that registration:

```js
import { trackScrollProgress } from '@scrollprogress/scrollprogress';
import { createScrollProgressDebugger } from '@scrollprogress/scrollprogress/debug/session';

const target = document.querySelector('[data-dynamic-chapter]');

if (!(target instanceof HTMLElement)) {
    throw new Error('Missing dynamic chapter');
}

const tracker = trackScrollProgress(target);
const debug = createScrollProgressDebugger({ palette: true });
const registration = debug.addTracker(tracker, {
    label: 'Dynamic chapter'
});

function removeDynamicChapter() {
    registration.detach();
    tracker.destroy();
}

function cleanup() {
    debug.destroy();
    tracker.destroy();
}
```

`detach()` is idempotent and does not destroy the tracker. The same tracker cannot
be attached to one session more than once, whether through the initial `trackers`
array or `addTracker()`. After detachment, it can be added to that session again.

The controller contract is:

```ts
interface ScrollProgressDebuggerController {
    addTracker(
        tracker: ScrollProgressTracker,
        options?: ScrollProgressDebugBridgeOptions
    ): ScrollProgressDebuggerTrackerController;
    destroy(): void;
}

interface ScrollProgressDebuggerTrackerController {
    detach(): void;
}
```

`destroy()` is idempotent. It destroys the session's tools and bridges without
destroying application trackers. Calling `addTracker()` after destruction throws.
If session construction fails, resources created earlier in that construction are
rolled back.

The session controller exposes only `addTracker()` and `destroy()`. Use the
individual factories below when an application needs direct runtime control over
a specific tool. Use the registry API for third-party diagnostic sources that do
not implement the complete `ScrollProgressTracker` contract.

Public session types:

- `ScrollProgressDebuggerToolsOptions`
- `ScrollProgressDebuggerOptions`
- `ScrollProgressDebuggerSingleTrackerOptions`
- `ScrollProgressDebuggerTrackerRegistration`
- `ScrollProgressDebuggerTrackerController` (`detach()`)
- `ScrollProgressDebuggerController`

## Connect a tracker manually

```js
import { trackScrollProgress } from '@scrollprogress/scrollprogress';
import { debugScrollProgress } from '@scrollprogress/scrollprogress/debug';

const target = document.querySelector('[data-scroll-target]');

if (!(target instanceof HTMLElement)) {
    throw new Error('Missing scroll target');
}

const tracker = trackScrollProgress(target);
const bridge = debugScrollProgress(tracker, {
    debugId: 'story',
    label: 'Story progress'
});

function cleanup() {
    bridge.destroy();
    tracker.destroy();
}
```

`debugScrollProgress()` keeps the target, configuration and state synchronized in
the debug registry. Its controller owns only the bridge: destroying it removes the
debug item but does not destroy the tracker.

Options:

| Option    | Default               | Meaning                                    |
| --------- | --------------------- | ------------------------------------------ |
| `debugId` | Generated registry ID | Diagnostic identifier shown by debug views |
| `label`   | Resolved `debugId`    | Human-readable name shown by debug views   |

`debugId` does not have to be unique. The registry assigns every item a separate,
unique controller `id` used for selection and lifecycle operations.

Explicit tracker destruction removes its debug item. When a `once` tracker
completes automatically, the bridge retains the final snapshot with
`completed: true` until the bridge is destroyed.

Public types from this entry are:

- `ScrollProgressDebugBridgeOptions`
- `ScrollProgressDebugBridgeController`

## Log the selected item

The console logger subscribes to the registry and writes the selected item through
`console.table`. A bridge or direct registry integration must publish an item first.
This complete setup is the quickest way to inspect one tracker from the console:

```js
import { trackScrollProgress } from '@scrollprogress/scrollprogress';
import { debugScrollProgress } from '@scrollprogress/scrollprogress/debug';
import { createDebugConsoleLogger } from '@scrollprogress/scrollprogress/debug/console';

const target = document.querySelector('[data-scroll-target]');

if (!(target instanceof HTMLElement)) {
    throw new Error('Missing scroll target');
}

const tracker = trackScrollProgress(target);
const bridge = debugScrollProgress(tracker, { label: 'Story progress' });
const logger = createDebugConsoleLogger({
    throttleMs: 100
});

function cleanup() {
    logger.destroy();
    bridge.destroy();
    tracker.destroy();
}
```

`throttleMs` defaults to `0` and must be finite and non-negative. With throttling,
the first snapshot logs immediately. Updates inside the interval are coalesced and
the most recent snapshot logs at the trailing edge. `destroy()` cancels a pending
trailing log and unsubscribes.

Public types:

- `ScrollProgressDebugConsoleLoggerOptions`
- `ScrollProgressDebugConsoleLoggerController`

## Show the palette

The palette can be created before or after registry items are added. With no items,
it displays its empty state:

```js
import { createDebugPalette } from '@scrollprogress/scrollprogress/debug/palette';

const palette = createDebugPalette();

function cleanup() {
    palette.destroy();
}
```

The palette shows registered items, the selected item's state and control groups.
Create it after `document.body` exists.

Options:

| Option      | Default         | Meaning                                                  |
| ----------- | --------------- | -------------------------------------------------------- |
| `target`    | `document.body` | `HTMLElement` that receives the palette                  |
| `className` | —               | Space-separated classes added to its root                |
| `theme`     | —               | Name selected through `data-scroll-progress-debug-theme` |

The returned `ScrollProgressDebugPaletteController` has an idempotent `destroy()`.
Destruction removes the palette DOM, listeners and subscriptions; it does not
unregister tracked items.

On narrow screens the palette becomes a bottom drawer. Desktop drag positioning
has no keyboard equivalent in RC1. The palette is development tooling and should
not be mounted in a production interface.

## Compose bridge, logger, palette and overlay manually

```js
import { trackScrollProgress } from '@scrollprogress/scrollprogress';
import { debugScrollProgress } from '@scrollprogress/scrollprogress/debug';
import { createDebugConsoleLogger } from '@scrollprogress/scrollprogress/debug/console';
import { createDebugPalette } from '@scrollprogress/scrollprogress/debug/palette';
import { createDebugOverlay } from '@scrollprogress/scrollprogress/debug/overlay';

const target = document.querySelector('[data-scroll-target]');

if (!(target instanceof HTMLElement)) {
    throw new Error('Missing scroll target');
}

const tracker = trackScrollProgress(target);
const bridge = debugScrollProgress(tracker, { label: 'Story' });
const logger = createDebugConsoleLogger({ throttleMs: 100 });
const palette = createDebugPalette();
const overlay = createDebugOverlay();

function cleanup() {
    overlay.destroy();
    palette.destroy();
    logger.destroy();
    bridge.destroy();
    tracker.destroy();
}
```

Views share registry selection but keep their own display state. The overlay does
not require the palette. See the [overlay guide](debug-overlay.md) for layers,
colors, clipping and label placement.

## Add palette control groups

Third-party integrations can add declarative buttons and toggles without accessing
palette DOM:

```js
import {
    registerDebugPaletteControlGroup
} from '@scrollprogress/scrollprogress/debug/palette';

const snapshotControls = registerDebugPaletteControlGroup({
    label: 'Snapshot',
    controls: [
        {
            id: 'copy',
            type: 'button',
            label: 'Copy selected state',
            onActivate({ selectedItem }) {
                if (!selectedItem) return;

                void navigator.clipboard.writeText(
                    JSON.stringify(selectedItem.state, null, 2)
                ).catch((error) => {
                    console.error('Could not copy debug state', error);
                });
            }
        }
    ]
});

snapshotControls.update({ label: 'Snapshot tools' });

function cleanup() {
    snapshotControls.destroy();
}
```

Actions receive a fresh registry snapshot and the selected item. The returned
controller exposes `id`, `update()` and an idempotent `destroy()`.

Button and toggle groups are the supported RC1 extension boundary. Arbitrary
markup, custom renderers and direct palette DOM access are not public APIs.

Public palette types:

- `ScrollProgressDebugPaletteOptions`
- `ScrollProgressDebugPaletteController`
- `ScrollProgressDebugPaletteControlType`
- `ScrollProgressDebugPaletteControlActionContext`
- `ScrollProgressDebugPaletteControlRegistration`
- `ScrollProgressDebugPaletteControlGroupFooterActionRegistration`
- `ScrollProgressDebugPaletteControlGroupRegistration`
- `ScrollProgressDebugPaletteControlGroupUpdate`
- `ScrollProgressDebugPaletteControlGroupController`

## Connect a third-party data source

The registry entry lets an integration publish tracker-compatible diagnostic data:

The following example assumes `element` is an `HTMLElement` and
`externalTracker` implements the tracker methods shown:

```js
import {
    registerScrollProgressDebugItem
} from '@scrollprogress/scrollprogress/debug/registry';

const debugItem = registerScrollProgressDebugItem({
    element,
    label: 'Third-party tracker',
    state: externalTracker.getState() ?? undefined
});

const unsubscribe = externalTracker.subscribe((state) => {
    debugItem.update({ state });
});

function cleanup() {
    unsubscribe();
    debugItem.destroy();
}
```

The required `element` is the target represented by the item. A registration can
also provide `debugId`, `label`, `state`, `completed` and the same resolved tracking
fields exposed by `tracker.getConfig()`; omitted values use the registry defaults.

The returned controller exposes its unique `id`. `debugItem.update()` changes
registry data only; it never calls the external tracker's `update()` method.
`debugItem.destroy()` removes the item and releases the retained element reference.
The third-party integration remains responsible for its own tracker lifecycle.

Other registry exports:

| Export                                     | Purpose                                        |
| ------------------------------------------ | ---------------------------------------------- |
| `getScrollProgressDebugRegistryState()`    | Return a snapshot of selection and items       |
| `selectScrollProgressDebugItem(idOrNull)`  | Select a known item or clear selection         |
| `subscribeScrollProgressDebugRegistry(fn)` | Receive an immediate snapshot and later writes |

The first registered item is selected automatically. Unknown selection IDs are
ignored. Snapshots copy item state and threshold arrays but share DOM references.

Public registry types:

- `ScrollProgressDebugItemController`
- `ScrollProgressDebugItemRegistration`
- `ScrollProgressDebugItemUpdate`
- `ScrollProgressDebugRegistryItem`
- `ScrollProgressDebugRegistryState`
- `ScrollProgressDebugRegistrySubscriber`

## Registry notification errors

Registry writes commit before synchronous subscriber notification. If an ordinary
subscriber throws, later subscribers still run and the registry remains updated.
Each thrown value is re-thrown unchanged in a separate `queueMicrotask`, which
reaches normal browser error reporting after the initiating call finishes.

The immediate call made by `subscribeScrollProgressDebugRegistry()` is different:
if it throws, that subscriber is removed and the original value is thrown directly
to the subscribe caller.

Subscribers receive one shared snapshot per notification and should treat it as
read-only. Returned promises are not awaited.

## Themes

Palette and overlay embed their default styles. Optional themes must be imported
before selecting them. Session `palette` and `overlay` option objects accept the
same `theme` values as the individual factories. See
[debug theming](theming.md) for complete session and direct-factory examples, the
included themes, custom properties and copyable templates.

## Environment and cleanup

Debug modules can be imported without creating DOM. Constructing a palette or
overlay requires browser globals, and their embedded `<style>` elements must be
allowed by the application's content security policy. RC1 does not provide a nonce
option.

Destroy debug controllers during component teardown or HMR. A debug session owns
only the bridges and tools it creates. Controllers returned by the individual
factories continue to own only their corresponding resource.
