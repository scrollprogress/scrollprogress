# API reference

ScrollProgress exposes two runtime functions and the types used by their public
contracts from the package root:

```ts
import {
    readScrollProgress,
    trackScrollProgress,
    type ScrollProgressState,
    type ScrollProgressTracker
} from '@scrollprogress/scrollprogress';
```

Internal declaration files are implementation details. Import public functions and
types from the package root rather than from paths inside `dist`.

Complete examples are shown in both languages when TypeScript needs different
syntax. Examples that contain no type syntax are shared by JavaScript and
TypeScript and are shown once.

## `trackScrollProgress()`

```ts
function trackScrollProgress(
    element: HTMLElement,
    options?: TrackScrollProgressOptions
): ScrollProgressTracker;
```

Creates a continuous browser tracker. It reads the initial geometry synchronously,
then owns the observers, listeners and animation-frame scheduling needed to keep
state updated.

**TypeScript**

```ts
import { trackScrollProgress } from '@scrollprogress/scrollprogress';

const target = document.querySelector<HTMLElement>('[data-scroll-target]');

if (!target) {
    throw new Error('Missing scroll target');
}

const tracker = trackScrollProgress(target, {
    onUpdate({ progress }) {
        console.log(progress);
    }
});

function cleanup(): void {
    tracker.destroy();
}
```

**JavaScript**

```js
import { trackScrollProgress } from '@scrollprogress/scrollprogress';

const target = document.querySelector('[data-scroll-target]');

if (!(target instanceof HTMLElement)) {
    throw new Error('Missing scroll target');
}

const tracker = trackScrollProgress(target, {
    onUpdate({ progress }) {
        console.log(progress);
    }
});

function cleanup() {
    tracker.destroy();
}
```

The target must be an `HTMLElement` in the current document. An invalid target,
root, axis, range, CSS custom-property name or native observer configuration throws
during construction.

### Options

| Option               | Type                          | Default | Meaning                                                       |
| -------------------- | ----------------------------- | ------- | ------------------------------------------------------------- |
| `start`              | `number`                      | `0.8`   | Root-relative progress start; must be finite                  |
| `end`                | `number`                      | `0.4`   | Root-relative progress end; must be finite                    |
| `axis`               | `'y' \| 'x'`                  | `'y'`   | Axis used for geometry and scroll direction                   |
| `root`               | `Element \| Document \| null` | `null`  | Viewport or custom scroll root in the current document        |
| `rootMargin`         | `string`                      | `'0px'` | Native `IntersectionObserver` root margin                     |
| `observerThreshold`  | `number \| number[]`          | `0`     | Native intersection threshold or threshold array              |
| `requireRootVisible` | `boolean`                     | `false` | Gates custom-root tracking on root visibility in the viewport |
| `inverted`           | `boolean`                     | `false` | Exposes `1 - geometricProgress`                               |
| `once`               | `boolean`                     | `false` | Destroys after one entered and completed cycle                |
| `cssVar`             | `string \| null`              | `null`  | Writes progress to a target-scoped CSS custom property        |
| `onUpdate`           | `(state) => void`             | —       | Receives each meaningful state update                         |
| `onEnter`            | `(state) => void`             | —       | Runs when `isTracking` changes to `true`                      |
| `onLeave`            | `(state) => void`             | —       | Runs when `isTracking` changes to `false`                     |

`start` and `end` are fractions, not percentages or pixels. Finite values outside
`0`–`1` are valid. Most element-entry effects use `start > end`, such as the
default `0.8 → 0.4` range. `start <= end` is accepted and can be intentional when
the target is larger than the root, such as a page-length progress bar, but each
tracker warns once because the same configuration can produce a zero or negative
travel distance for shorter targets.

Use `inverted: true` when the desired geometry is correct but the exposed value
should run in the opposite direction. Inversion returns `1 - progress`; it does not
swap `start` and `end` or repair a degenerate range.

`rootMargin` and `observerThreshold` use native `IntersectionObserver` validation.
Margins affect observation, not progress geometry. Thresholds control observer
notifications; `isTracking` uses `isIntersecting`, not a ratio comparison.

`cssVar` must begin with `--` and contain at least one more character. The remaining
CSS grammar is delegated to the browser. The property is written on the target and
persists after tracker destruction.

## `ScrollProgressState`

```ts
interface ScrollProgressState {
    readonly progress: number;
    readonly progressDirection: ScrollProgressDirection;
    readonly scrollDirection: ScrollDirection;
    readonly isInObservationArea: boolean;
    readonly isRootVisible: boolean;
    readonly isTracking: boolean;
    readonly intersectionRatio: number;
}
```

### `progress`

Clamped value from `0` to `1`. When `inverted` is enabled, this is the inverted
value.

### `progressDirection`

`'forward'`, `'backward'` or `'none'`, based on consecutive exposed progress
values. Inversion therefore affects this field.

### `scrollDirection`

`'forward'`, `'backward'` or `'none'`, based on physical scroll positions along
the configured axis. It is independent of inversion.

### `isInObservationArea`

The last target `IntersectionObserverEntry.isIntersecting` value. It describes the
effective observation area, not whether progress is strictly between `0` and `1`.

### `isRootVisible`

Always `true` unless `requireRootVisible` is enabled for an element root. In that
case it describes whether the root intersects the document viewport.

### `isTracking`

The state used by `onEnter`, `onLeave`, scroll-driven synchronization and `once`.
It equals `isInObservationArea` unless a custom-root visibility gate is enabled.

### `intersectionRatio`

The last ratio delivered by the target intersection observer. It is not geometric
progress and is not recalculated on every frame.

## `ScrollProgressTracker`

### `subscribe()`

```ts
subscribe(subscriber: ScrollProgressStateSubscriber): ScrollProgressUnsubscribe;
```

Registers a state subscriber and immediately passes it a copy of the latest state,
when available. Later notifications use registration order. The returned cleanup
is idempotent.

**JavaScript and TypeScript**

```js
const unsubscribe = tracker.subscribe((state) => {
    console.log(state.progress, state.isTracking);
});

function cleanup() {
    unsubscribe();
    tracker.destroy();
}
```

If the immediate call throws, registration is removed before the same value is
re-thrown. Calling `subscribe()` after destruction returns a no-op cleanup. When a
subscriber has the same lifetime as its tracker, `destroy()` alone is sufficient;
the explicit unsubscribe is useful when the subscriber may end first.

### `onDestroy()`

```ts
onDestroy(callback: ScrollProgressDestroyCallback): ScrollProgressUnsubscribe;
```

Registers terminal cleanup and returns an idempotent removal function. After
destruction, a newly registered callback runs immediately.

**JavaScript and TypeScript**

```js
const removeDestroyCallback = tracker.onDestroy(() => {
    console.log('tracker destroyed');
});

// If this callback is no longer needed before destruction:
removeDestroyCallback();
```

### `getState()`

```ts
getState(): ScrollProgressState | null;
```

Returns a fresh copy of the latest state, or `null` before a state is available.
The final state remains readable after destruction.

**JavaScript and TypeScript**

```js
const state = tracker.getState();

if (state) {
    console.log(state.progress);
}
```

### `getElement()`

```ts
getElement(): HTMLElement;
```

Returns the original target element.

**JavaScript and TypeScript**

```js
const target = tracker.getElement();
```

### `getConfig()`

```ts
getConfig(): TrackScrollProgressConfig;
```

Returns the resolved callback-free configuration. Threshold arrays are copied;
DOM references retain their identity.

**JavaScript and TypeScript**

```js
const config = tracker.getConfig();
console.log(config.start, config.end);
```

### `update()`

```ts
update(options: Partial<TrackScrollProgressOptions>): void;
```

Merges options immediately and schedules synchronization for the next animation
frame. Missing or `undefined` configuration values keep their previous values.

**JavaScript and TypeScript**

```js
tracker.update({
    start: 0.9,
    end: 0.2,
    cssVar: '--story-progress'
});
```

- `root: null` restores viewport tracking.
- `cssVar: null` removes the current CSS binding.
- Explicit `onUpdate`, `onEnter` or `onLeave` keys set to `undefined` remove those
  callbacks.
- `update({})` requests subscriber notification even when state is unchanged;
  unchanged state does not call option callbacks.

Native observer validation happens before a new configuration replaces active
resources. A failed update leaves the previous configuration usable.

Changing root or axis resets direction history. Changing root also resets delivered
intersection data. Changing root, axis or inversion resets the entry history used
by `once`.

### `destroy()`

```ts
destroy(): void;
```

Terminal, idempotent cleanup. It cancels pending work, disconnects observers,
removes listeners, runs destruction callbacks and clears lifecycle registrations.
It does not call `onLeave` or remove the configured CSS property.

**JavaScript and TypeScript**

```js
tracker.destroy();
```

## `readScrollProgress()`

```ts
function readScrollProgress(
    element: HTMLElement,
    options: ReadScrollProgressOptions
): number;
```

Reads current DOM geometry and returns one progress number. It installs no
observers, callbacks, listeners or cleanup resources.

Use it when an existing event handler needs a snapshot, or when the application
already owns the render loop that decides when geometry should be read. For
continuous tracking managed by ScrollProgress, use `trackScrollProgress()` instead.

### Read inside a custom scroll root

In this example, `scroller` is an ordinary DOM element used as the geometry root.
It is not a tracker or controller.

**TypeScript**

```ts
import { readScrollProgress } from '@scrollprogress/scrollprogress';

const target = document.querySelector<HTMLElement>('[data-scroll-target]');
const scroller = document.querySelector<HTMLElement>('[data-scroll-root]');

if (!target || !scroller) {
    throw new Error('Missing scroll elements');
}

const progress = readScrollProgress(target, {
    start: 0.8,
    end: 0.2,
    axis: 'y',
    root: scroller
});

console.log(progress);
```

**JavaScript**

```js
import { readScrollProgress } from '@scrollprogress/scrollprogress';

const target = document.querySelector('[data-scroll-target]');
const scroller = document.querySelector('[data-scroll-root]');

if (!(target instanceof HTMLElement) || !(scroller instanceof HTMLElement)) {
    throw new Error('Missing scroll elements');
}

const progress = readScrollProgress(target, {
    start: 0.8,
    end: 0.2,
    axis: 'y',
    root: scroller
});

console.log(progress);
```

`start` and `end` are required and must be finite. `axis` defaults to `'y'`; `root`
defaults to the viewport. Target and optional root must belong to the current
document.

This function does not support inversion, CSS output, observer configuration or
lifecycle callbacks. Applications that need continuous tracking should use
`trackScrollProgress()`.

### Read progress on demand

One-shot reading is useful when the value is needed only after a user action. This
example measures an article against the viewport and displays its current progress.

```html
<article data-scroll-target>...</article>
<button type="button" data-check-progress>Check progress</button>
<output data-progress-output></output>
```

**JavaScript and TypeScript**

```js
import { readScrollProgress } from '@scrollprogress/scrollprogress';

const target = document.querySelector('[data-scroll-target]');
const button = document.querySelector('[data-check-progress]');
const output = document.querySelector('[data-progress-output]');

if (
    !(target instanceof HTMLElement) ||
    !(button instanceof HTMLButtonElement) ||
    !(output instanceof HTMLOutputElement)
) {
    throw new Error('Missing progress example elements');
}

function showCurrentProgress() {
    const progress = readScrollProgress(target, {
        start: 0.8,
        end: 0.2
    });

    output.value = `${Math.round(progress * 100)}%`;
}

button.addEventListener('click', showCurrentProgress);

function cleanup() {
    button.removeEventListener('click', showCurrentProgress);
}
```

## Geometry

For target start coordinate `E`, target size `S` and root size `R`:

```text
D = S + R × (start − end)
progress = clamp((R × start − E) / D, 0, 1)
```

When `D <= 0`, progress is `1` if `R × start − E > 0`, otherwise `0`.

Viewport geometry uses `window.innerWidth` or `window.innerHeight`. Element-root
geometry uses the root's inner client box. Scaled or rotated roots are outside the
supported geometry model.

## Notification and error behavior

State and CSS are committed before ordinary notifications. The order is enter or
leave, update callback, subscribers, then optional `once` cleanup.

Notifications are synchronous and fail fast. A callback error does not roll back
committed state or CSS output. When `once` has already reached completion,
cleanup still occurs before the first thrown value is propagated.

Destruction callbacks are the exception to fail-fast delivery: `destroy()` attempts
every callback that was registered when destruction began, then propagates the
first thrown value.

Removing a later subscriber during delivery prevents that subscriber from running.
A subscriber added during delivery can run later in the same update. Avoid
unbounded subscription changes inside subscribers.

Promises returned by callbacks are not awaited. Applications own asynchronous
error handling.

## Public core types

`ScrollProgressState`, `TrackScrollProgressOptions` and `ScrollProgressTracker` are
documented in the sections above. The remaining exported declarations are:

```ts
interface ScrollProgressRange {
    start: number;
    end: number;
}

interface ReadScrollProgressOptions extends ScrollProgressRange {
    axis?: ScrollProgressAxis;
    root?: ScrollProgressRoot;
}

type ScrollProgressRoot = Element | Document | null;
type ScrollProgressAxis = 'y' | 'x';
type ScrollProgressDirection = 'forward' | 'backward' | 'none';
type ScrollDirection = ScrollProgressDirection;

type ScrollProgressObserverThreshold = number | number[];
type ScrollProgressRootMargin = string;
type ScrollProgressCssVar = string;

interface TrackScrollProgressConfig extends ScrollProgressRange {
    axis: ScrollProgressAxis;
    root: ScrollProgressRoot;
    rootMargin: ScrollProgressRootMargin;
    observerThreshold: ScrollProgressObserverThreshold;
    requireRootVisible: boolean;
    inverted: boolean;
    once: boolean;
    cssVar: ScrollProgressCssVar | null;
}

type ScrollProgressStateSubscriber = (state: ScrollProgressState) => void;
type ScrollProgressDestroyCallback = () => void;
type ScrollProgressUnsubscribe = () => void;
```

Debug exports and types are documented separately in the [debug guide](debug.md).
