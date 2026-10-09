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
the target is larger than the root, such as a
[page-length progress bar](recipes.md#reading-progress-bar), but each tracker warns
once because the same configuration can produce a zero or negative travel distance
for shorter targets.

Use `inverted: true` when the desired geometry is correct but the exposed value
should run in the opposite direction. Inversion returns `1 - progress`; it does not
swap `start` and `end` or repair a degenerate range.

`root` has three supported forms. Only `null` is the default:

| Value      | Geometry and events                                                                                                                             | Typical use                                                                |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `null`     | Implicit viewport geometry and document-level scroll events.                                                                                    | Ordinary page-level tracking.                                              |
| `document` | The current `Document` is passed explicitly to `IntersectionObserver`; geometry remains viewport-based and scroll events remain document-level. | Reusable configuration that needs to express the document root explicitly. |
| `Element`  | The element's inner client box, excluding its border and scrollbars, and the element's scroll position.                                         | Nested scrolling components.                                               |

The target and any explicit root must belong to the current document.
`requireRootVisible` gates tracking only when `root` is an `Element`; for `null`
and `document`, `isRootVisible` remains `true`. Prefer `null` for ordinary viewport
tracking. `document` makes the choice explicit but does not change the progress
geometry or provide a performance advantage. See
[Choose a scroll root](scroll-progress-core.md#choose-a-scroll-root) for the three
complete usage examples and the `requireRootVisible` model.

`rootMargin` and `observerThreshold` use native `IntersectionObserver` validation.
Margins affect observation, not progress geometry. Thresholds control observer
notifications; `isTracking` uses `isIntersecting`, not a ratio comparison.

`cssVar` must begin with `--` and contain at least one more character. The remaining
CSS grammar is delegated to the browser. The property is written on the target and
persists after tracker destruction.

The initial synchronous geometry read cannot satisfy `once` by itself because the
tracker must first enter tracking. This prevents `once` from destroying the tracker
during construction merely because the initial geometry is already terminal,
before `IntersectionObserver` confirms that the target has entered the observation
area. If the first intersection notification enters tracking while progress is
already terminal, enter, update/subscriber delivery and automatic destruction
occur in the same synchronization.

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

### State object ownership

The `readonly` declarations express the consumer contract; state objects are not
frozen with `Object.freeze()` at runtime. JavaScript can therefore assign to their
fields, but doing so is unsupported. Option callbacks and subscribers must always
treat the received state as read-only.

The following examples are independent and assume an existing `tracker`. Their
cleanup ends only the consumer subscription; the tracker remains owned by the code
that created it.

#### Derive application state

Create a separate object when application code needs additional or transformed
values. This example publishes a view-specific percentage without changing the
ScrollProgress state:

```js
const unsubscribe = tracker.subscribe((state) => {
    const viewState = {
        ...state,
        percentage: Math.round(state.progress * 100)
    };

    window.dispatchEvent(
        new CustomEvent('section-progress', {
            detail: viewState
        })
    );
});

function cleanup() {
    unsubscribe();
}
```

#### Keep the latest state in a shared store

A shared store can decouple several consumers from the tracker or provide the
latest value to a component mounted later:

```js
const sectionStates = new Map();

const unsubscribe = tracker.subscribe((state) => {
    sectionStates.set('hero', {
        ...state,
        percentage: Math.round(state.progress * 100)
    });
});

function cleanup() {
    unsubscribe();
    sectionStates.delete('hero');
}
```

Use this indirection when multiple or later-mounted consumers need shared access
to the latest state. When one component owns the output, prefer the
[direct subscription](#subscribe) pattern.

State objects are delivered as follows:

- `getState()` returns a new shallow copy on every call;
- the immediate call made when `subscribe()` registers a subscriber receives its
  own shallow copy of the current state;
- an ordinary state update creates one shallow snapshot and passes that same
  object to every subscriber in registration order.

The shared snapshot means that if one subscriber mutates its argument in
JavaScript, a later subscriber in the same notification can observe the changed
value. Option callbacks such as `onUpdate` run before subscribers and receive the
committed state, so mutating their argument can also affect the value retained or
delivered during that synchronization. Do not use mutation to communicate between
callbacks.

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
destruction, a newly registered callback runs immediately and synchronously. If
that callback throws, `onDestroy()` propagates the same thrown value.

**JavaScript and TypeScript**

```js
const removeDestroyCallback = tracker.onDestroy(() => {
    console.log('tracker destroyed');
});

// If this callback is no longer needed before destruction:
removeDestroyCallback();
```

During destruction, every callback that was registered when destruction began is
attempted even if an earlier callback throws or removes a later registration. The
first thrown value is propagated after all of those callbacks have been attempted.

### `getState()`

```ts
getState(): ScrollProgressState | null;
```

Returns a fresh shallow copy of the latest state. Successful construction creates
an initial state synchronously, so the normal first call is non-null. The final
state remains readable after destruction.

The nullable return covers reconfiguration: changing `root` or
`requireRootVisible` clears the previous state until synchronization in the next
animation frame. During that interval `getState()` returns `null`, and a new
subscriber is registered without receiving its immediate call. It receives the
next ordinary notification once the replacement state exists.

Do not rely on reading the replacement state immediately after `update()`. Use an
existing [`subscribe()`](#subscribe) subscription to receive the next synchronized
state; use `getState()` for an immediate read only when the caller handles `null`.
No application-level `requestAnimationFrame()` coordination is required.

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

The returned `root` preserves how the root was configured:

| Tracker configuration | `tracker.getConfig().root`        |
| --------------------- | --------------------------------- |
| `root` omitted        | `null`                            |
| `root: null`          | `null`                            |
| `root: document`      | The current `Document` reference  |
| `root: element`       | That specific `Element` reference |

`null` represents the viewport implicitly; it is not a reference to `document`.
Passing `root: document` preserves that explicit DOM reference for later
inspection through `getConfig()`. The two forms still use the same viewport
geometry and document-level scroll events. See
[Choose a scroll root](scroll-progress-core.md#choose-a-scroll-root) for usage
guidance and examples.

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

For target leading-edge coordinate `E`, target size `S` and root size `R`:

```text
D = S + R × (start − end)
progress = clamp((R × start − E) / D, 0, 1)
```

When `D <= 0`, progress is `1` if `R × start − E > 0`, otherwise `0`.

`E` is the target's leading edge relative to the root's inner leading edge along
the selected axis. For viewport and document roots, that reference is the top or
left viewport edge. For an element root, its border and scrollbar are excluded.
Viewport geometry uses `window.innerWidth` or `window.innerHeight`; element-root
geometry uses `clientWidth` or `clientHeight`. Scaled or rotated roots are outside
the supported geometry model.

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
