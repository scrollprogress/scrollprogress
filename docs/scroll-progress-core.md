# Core guide

This guide starts with a single tracker, then introduces state, subscriptions,
cleanup and the options used in ordinary applications. For a compact list of every
method and type, see the [API reference](api.md).

ScrollProgress runs in a browser and expects the target element to exist before a
tracker is created.

## Create a tracker

The examples in this guide use syntax shared by JavaScript and TypeScript. The API
reference shows the TypeScript signatures separately.

```js
import { trackScrollProgress } from '@scrollprogress/scrollprogress';

const target = document.querySelector('[data-scroll-target]');

if (!(target instanceof HTMLElement)) {
    throw new Error('Missing scroll target');
}

const tracker = trackScrollProgress(target);
```

The default tracker follows vertical movement against the viewport. It reads the
initial geometry immediately and then keeps the result synchronized while the
target is being observed.

## Understand `progress`

`progress` is a number from `0` to `1`:

- `0` means the target has not reached the start of the configured range;
- values between `0` and `1` describe movement through the range;
- `1` means the target has completed the range.

The default range is:

```text
{
    start: 0.8,
    end: 0.4
}
```

For vertical tracking, `start: 0.8` places the start trigger at 80% of the root
height. `end: 0.4` places the end trigger at 40%. For `axis: 'x'`, the same values
are resolved against the root width.

Finite values outside `0`–`1` are allowed. Most element-entry effects use
`start > end`. `start <= end` can be intentional for a target larger than its root,
such as a [page-length progress bar](recipes.md#reading-progress-bar), but the
tracker warns once because the same range can become degenerate for shorter
targets. Use `inverted` to reverse the exposed value without changing this
geometry.

## Receive updates

Pass `onUpdate` when one owner needs to react to the current state:

```js
const tracker = trackScrollProgress(target, {
    onUpdate({ progress }) {
        target.style.opacity = String(progress);
    }
});
```

The first `onUpdate` call happens synchronously inside `trackScrollProgress()`.
Later calls occur when synchronized state changes. A call can be caused by geometry,
intersection state, intersection ratio or custom-root visibility; `progress` does
not have to change on every call.

## Understand the state

Every update receives a `ScrollProgressState`:

| Field                 | Meaning                                                         |
| --------------------- | --------------------------------------------------------------- |
| `progress`            | Current value from `0` to `1`, after optional inversion         |
| `progressDirection`   | Direction of the exposed value: `forward`, `backward` or `none` |
| `scrollDirection`     | Physical movement along the selected axis                       |
| `isInObservationArea` | Whether the target intersects the effective observer root       |
| `isRootVisible`       | Whether an enabled custom-root visibility gate is satisfied     |
| `isTracking`          | Resolved active state used by enter/leave and `once`            |
| `intersectionRatio`   | Last ratio delivered by `IntersectionObserver`                  |

Progress geometry and observation answer different questions. A target can be in
the observation area while its progress is still `0`, or have positive progress
before the observer reports it as intersecting.

Successful construction reads geometry and produces the first state synchronously.
The first `IntersectionObserver` notification arrives later, so that initial state
uses:

```text
{
    isInObservationArea: false,
    intersectionRatio: 0,
    isTracking: false
}
```

`getState()` therefore returns a state immediately after construction. It can
temporarily return `null` after `update()` changes `root` or
`requireRootVisible`, while the replacement state is waiting for the next
animation frame. A subscriber added during that interval starts listening but is
not called immediately. See [`getState()` in the API reference](api.md#getstate)
for the precise contract.

## Subscribe to state

Use `subscribe()` when more than one part of the application needs the state, or
when a consumer should be detached independently of the tracker:

```js
const unsubscribe = tracker.subscribe(({ progress, isTracking }) => {
    console.log({ progress, isTracking });
});

// Stop this subscriber while leaving the tracker active.
unsubscribe();
```

A new subscriber immediately receives the latest available state. The returned
unsubscribe function is safe to call more than once.

State types are `readonly`, but their objects are not frozen at runtime. Treat
every state as read-only, including inside option callbacks and subscribers. The
API reference defines the exact [state object ownership](api.md#state-object-ownership)
and snapshot behavior.

## Destroy the tracker

The tracker owns its observers, scroll and resize listeners, and pending animation
frame. Destroy it when its owning component is removed:

```js
tracker.destroy();
```

`destroy()` is idempotent. It cancels active work, clears subscribers and runs
callbacks registered with `onDestroy()`. It does not emit a synthetic `onLeave`.
After destruction, updates and new subscriptions do nothing; getters continue to
return the final element, configuration and state.

For a subscriber whose lifetime matches the tracker, calling `destroy()` is enough.
Use both cleanup functions when the subscriber can end first:

```js
const unsubscribe = tracker.subscribe((state) => {
    console.log(state.progress);
});

function cleanup() {
    unsubscribe();
    tracker.destroy();
}
```

In a Vite application, hot-module replacement can dispose of the tracker too:

```js
if (import.meta.hot) {
    import.meta.hot.dispose(() => tracker.destroy());
}
```

## Choose a scroll root

The root is the rectangle against which ScrollProgress measures the target. Choose
it according to which scrollable area owns the effect:

| `root` value | Typical use                                                                                                      |
| ------------ | ---------------------------------------------------------------------------------------------------------------- |
| `null`       | Ordinary page scrolling, such as reveals, reading progress and sticky page effects. This is the default.         |
| `document`   | The same page-level behavior, when reusable configuration code should name the current document root explicitly. |
| `Element`    | Scrolling inside a component, such as a carousel, modal, sidebar or `overflow: auto` panel.                      |

The examples below continue to use the validated `target` from
[Create a tracker](#create-a-tracker). Each example is independent.

### Use the implicit viewport

Omitting `root` is equivalent to passing `root: null`:

```js
const tracker = trackScrollProgress(target, {
    root: null
});

function cleanup() {
    tracker.destroy();
}
```

This is normally the clearest choice for effects driven by the main page scroll.

### Express the document root explicitly

`document` still uses viewport geometry and document-level scroll events:

```js
const tracker = trackScrollProgress(target, {
    root: document
});

function cleanup() {
    tracker.destroy();
}
```

`null` and `document` therefore produce the same progress model, but they express
different intent. `null` asks the browser observer to use its implicit viewport
root. `document` passes the current `Document` explicitly. The explicit form is
useful in a wrapper, factory or shared configuration object where the selected
root should be visible as data. It does not provide a geometry or performance
advantage for ordinary page tracking.

Only `null` is the default. If `root` is omitted, ScrollProgress does not replace
it with `document`; it resolves the option to `null`.

### Track inside an element

Pass a scrolling ancestor as `root` to calculate progress inside that element:

```js
const root = document.querySelector('[data-scroll-root]');

if (!(root instanceof HTMLElement)) {
    throw new Error('Missing scroll root');
}

const tracker = trackScrollProgress(target, {
    root,
    requireRootVisible: true
});

function cleanup() {
    tracker.destroy();
}
```

Custom-root progress uses the root's inner client box, excluding its border and
scrollbars. The target and root must belong to the current document, and the root
should be an untransformed scrolling ancestor of the target.

An element root introduces two relevant rectangles: the target can be visible
inside its scroll container while that entire container is outside the browser
viewport. `requireRootVisible: true` makes `isTracking` require both conditions.
Without it, `isTracking` follows only the target's intersection with the element
root.

This extra visibility gate applies only to an `Element` root. With `null` or
`document`, the root already represents the page viewport, so `isRootVisible`
remains `true` and `requireRootVisible` adds no behavior. The
[API options](api.md#options) define the exact observer and geometry contract.

## Change the axis

Use `axis: 'x'` for horizontal geometry. This example continues with the validated
`root` from [Track inside an element](#track-inside-an-element):

```js
const tracker = trackScrollProgress(target, {
    root,
    axis: 'x'
});
```

`axis: 'x'` changes the measured axis; it does not create horizontal overflow or
choose a different scroll container. With `root: null` or `root: document`,
ScrollProgress reads document-level horizontal scrolling. Use that form for an
intentionally horizontal document, typically a dedicated full-page experience.

For a carousel, gallery or horizontally scrolling panel inside an otherwise
vertical page, pass that scrolling element as `root`. Its `scrollLeft` belongs to
the component rather than the document. See the
[horizontal root recipe](recipes.md#horizontal-root) for a complete example.
Document-level horizontal input and scrolling can vary across browsers,
especially on mobile.

## Write progress to CSS

The `cssVar` option writes progress to a custom property on the target:

```js
const tracker = trackScrollProgress(target, {
    cssVar: '--scroll-progress'
});
```

Descendants inherit the property, so CSS can render the effect without a callback:

```css
[data-scroll-target] .fill {
    transform-origin: left;
    transform: scaleX(var(--scroll-progress, 0));
}
```

Destroying the tracker preserves the last value. Remove it when the application
should also clear the visual state:

```js
function cleanup() {
    tracker.destroy();
    target.style.removeProperty('--scroll-progress');
}
```

Calling `tracker.update({ cssVar: null })` removes the active binding. Changing to
a different custom property removes the old name immediately and writes the new
one during the next synchronization.

## Complete one cycle

Use `once: true` when the tracker should destroy itself after its first completed
cycle:

```js
const tracker = trackScrollProgress(target, {
    once: true,
    onUpdate({ progress }) {
        console.log(progress);
    }
});
```

The tracker must enter active tracking before it can complete. The final update is
delivered before cleanup. The synchronous geometry read alone cannot complete the
tracker because it has not entered tracking yet. If the first intersection event
activates tracking when progress is already at its terminal value, `onEnter`, the
update callback and subscribers, and automatic cleanup all run in that same
synchronization. Ordinary progress completes at `1`; inverted progress completes
at `0`. Calling `destroy()` later remains safe.

## Enter and leave tracking

`onEnter` and `onLeave` report changes to `isTracking`, not the beginning and end
of the progress range:

```js
const tracker = trackScrollProgress(target, {
    onEnter(state) {
        console.log('tracking active', state.progress);
    },
    onLeave(state) {
        console.log('tracking inactive', state.progress);
    }
});
```

The observation area is configured by `root` and `rootMargin`. `start` and `end`
configure progress geometry. Keeping these concepts separate prevents enter/leave
events from being mistaken for progress milestones.

## Configure observation

`rootMargin` expands or contracts the effective observation area:

```js
const tracker = trackScrollProgress(target, {
    rootMargin: '200px 0px'
});
```

Positive margins can start preparatory work before progress begins. Margins do not
move the `start` or `end` triggers.

`observerThreshold` controls which intersection-ratio crossings notify the
observer:

```js
const tracker = trackScrollProgress(target, {
    observerThreshold: [0, 0.5, 1]
});
```

Thresholds do not define whether tracking is active and do not change progress
geometry.

## Update an existing tracker

`update()` merges new options and schedules geometry synchronization for the next
animation frame:

```js
tracker.update({
    start: 0.9,
    end: 0.2
});
```

Omitted or `undefined` configuration values keep their previous values. Two
explicit values have special meaning:

- `root: null` restores viewport tracking;
- `cssVar: null` removes the current CSS binding.

Passing an explicit callback key with `undefined` removes that callback:

```js
tracker.update({ onUpdate: undefined });
```

Invalid target, root, axis, range or native observer configuration throws without
replacing the previous usable configuration.

## Invert progress

`inverted: true` exposes `1 - progress` without changing physical trigger
positions:

```js
tracker.update({ inverted: true });
```

`progressDirection` follows the exposed value, while `scrollDirection` continues
to describe physical movement.

## Read progress once

`readScrollProgress()` is the advanced one-shot API. It reads current geometry and
returns one number without observers, callbacks or cleanup:

```js
import { readScrollProgress } from '@scrollprogress/scrollprogress';

const target = document.querySelector('[data-scroll-target]');

if (!(target instanceof HTMLElement)) {
    throw new Error('Missing scroll target');
}

const progress = readScrollProgress(target, {
    start: 0.8,
    end: 0.2,
    axis: 'y'
});
```

Use it when the application already owns its animation loop or needs an occasional
measurement. Avoid rebuilding the tracker with an unthrottled scroll listener;
`trackScrollProgress()` is the normal choice for continuous tracking.

## Optional debug tools

Debug tools live in separate entry points and are never installed by a core import.
Start with the session setup in the [debug guide](debug.md) when you need registry
inspection, console output, a palette or a geometry overlay. The individual debug
entry points remain available for custom composition.

## Advanced lifecycle semantics

State and CSS are committed before callbacks run. For a meaningful update, the
notification order is:

1. `onEnter` or `onLeave`, when tracking changes;
2. `onUpdate`;
3. subscribers in registration order;
4. automatic `once` cleanup, when completion was reached.

Callbacks are synchronous and fail fast. A thrown value does not roll back state or
CSS. If `once` has reached completion, required cleanup still runs before the first
thrown value is propagated. Promises returned by callbacks are not awaited.

`onDestroy()` registers terminal cleanup:

```js
const removeDestroyCallback = tracker.onDestroy(() => {
    console.log('tracker destroyed');
});

// Remove the callback if it is no longer needed before destruction.
removeDestroyCallback();
```

Destruction attempts every callback that was registered when destruction began and
then propagates the first thrown value, if any. Registering after destruction runs
the callback immediately and synchronously; if it throws, `onDestroy()` propagates
that same value. See the [API reference](api.md) for the remaining reentrancy and
update edge cases.
