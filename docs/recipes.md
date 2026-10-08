# Recipes

Install `@scrollprogress/scrollprogress@rc`, then use these examples in a browser
application with a bundler. Each recipe is independent and includes the cleanup
owned by that example.

The examples use syntax shared by JavaScript and TypeScript. Runtime
`instanceof HTMLElement` checks also give TypeScript the narrowing it needs.

## Progress bar

```html
<div
    id="bar"
    role="progressbar"
    aria-label="Reading progress"
    aria-valuemin="0"
    aria-valuemax="100"
    aria-valuenow="0"
></div>
<main id="story">Scrollable content</main>
```

```css
body {
    margin: 0;
}

#bar {
    position: fixed;
    inset: 0 0 auto;
    z-index: 10;
    height: 4px;
    background: currentColor;
    transform-origin: left;
    transform: scaleX(0);
}

#story {
    min-height: 200vh;
}
```

```js
import { trackScrollProgress } from '@scrollprogress/scrollprogress';

const story = document.querySelector('#story');
const bar = document.querySelector('#bar');

if (!(story instanceof HTMLElement) || !(bar instanceof HTMLElement)) {
    throw new Error('Missing progress bar elements');
}

const tracker = trackScrollProgress(story, {
    start: 0,
    end: 1,
    onUpdate({ progress }) {
        bar.style.transform = `scaleX(${progress})`;
        bar.setAttribute('aria-valuenow', String(Math.round(progress * 100)));
    }
});

function cleanup() {
    tracker.destroy();
}
```

This range measures from the story's top reaching the viewport top to its bottom
reaching the viewport bottom. It intentionally uses `start <= end`, so the tracker
prints the range warning once. The story must be taller than the viewport for this
range to have a positive travel distance.

## Reveal while scrolling

```html
<div class="spacer"></div>
<section id="reveal"><div class="content">Revealed content</div></section>
<div class="spacer"></div>
```

```css
.spacer {
    height: 100vh;
}

@media (prefers-reduced-motion: reduce) {
    #reveal .content {
        transform: none !important;
    }
}
```

```js
import { trackScrollProgress } from '@scrollprogress/scrollprogress';

const target = document.querySelector('#reveal');
const content = target?.querySelector('.content');

if (!(target instanceof HTMLElement) || !(content instanceof HTMLElement)) {
    throw new Error('Missing reveal elements');
}

const tracker = trackScrollProgress(target, {
    onUpdate({ progress }) {
        content.style.opacity = String(progress);
        content.style.transform = `translateY(${24 * (1 - progress)}px)`;
    }
});

function cleanup() {
    tracker.destroy();
}
```

The transform belongs to the child, so it does not move the element whose geometry
is being measured. Add `once: true` if the reveal should stop after its first
completed cycle. The reduced-motion rule removes the moving transform while
preserving the opacity feedback.

## CSS custom property

```html
<div class="spacer"></div>
<section id="css-story"><div class="fill">Progress</div></section>
<div class="spacer"></div>
```

```css
#css-story .fill {
    transform-origin: left;
    transform: scaleX(var(--progress, 0));
}
```

```js
import { trackScrollProgress } from '@scrollprogress/scrollprogress';

const target = document.querySelector('#css-story');

if (!(target instanceof HTMLElement)) {
    throw new Error('Missing CSS progress target');
}

const tracker = trackScrollProgress(target, {
    cssVar: '--progress'
});

function cleanup() {
    tracker.destroy();
    target.style.removeProperty('--progress');
}
```

The explicit `removeProperty` is application cleanup. Tracker destruction itself
preserves the last value.

## Custom vertical root

```html
<div id="scroller">
    <div class="space"></div>
    <section id="root-story">Measured inside this scroller</section>
    <div class="space"></div>
</div>
```

```css
#scroller {
    height: 300px;
    overflow: auto;
    border: 8px solid;
}

.space {
    height: 400px;
}
```

```js
import { trackScrollProgress } from '@scrollprogress/scrollprogress';

const root = document.querySelector('#scroller');
const target = document.querySelector('#root-story');

if (!(root instanceof HTMLElement) || !(target instanceof HTMLElement)) {
    throw new Error('Missing custom-root elements');
}

const tracker = trackScrollProgress(target, {
    root,
    requireRootVisible: true,
    onUpdate({ progress, isTracking }) {
        console.log({ progress, isTracking });
    }
});

function cleanup() {
    tracker.destroy();
}
```

`requireRootVisible` makes active tracking depend on both the target intersecting
the root and the root being visible in the page viewport.

## Horizontal root

```html
<div id="horizontal">
    <div class="horizontal-track">
        <div class="horizontal-space"></div>
        <section id="slide">Slide</section>
        <div class="horizontal-space"></div>
    </div>
</div>
```

```css
#horizontal {
    width: 300px;
    overflow: auto;
}

.horizontal-track {
    display: flex;
    width: max-content;
}

.horizontal-space {
    width: 400px;
}

#slide {
    width: 200px;
}
```

```js
import { trackScrollProgress } from '@scrollprogress/scrollprogress';

const root = document.querySelector('#horizontal');
const target = document.querySelector('#slide');

if (!(root instanceof HTMLElement) || !(target instanceof HTMLElement)) {
    throw new Error('Missing horizontal-root elements');
}

const tracker = trackScrollProgress(target, {
    root,
    axis: 'x',
    onUpdate({ progress }) {
        console.log(progress);
    }
});

function cleanup() {
    tracker.destroy();
}
```

For viewport-level horizontal tracking, use `root: null` and provide real
document-level horizontal overflow. A custom root is the more predictable
component-level pattern.

## Complete once

```js
import { trackScrollProgress } from '@scrollprogress/scrollprogress';

const target = document.querySelector('#reveal');

if (!(target instanceof HTMLElement)) {
    throw new Error('Missing once target');
}

const tracker = trackScrollProgress(target, {
    once: true,
    onUpdate({ progress }) {
        target.style.opacity = String(progress);
    }
});

function cleanup() {
    // Safe even when `once` has already completed and destroyed the tracker.
    tracker.destroy();
}
```

Completion requires the tracker to enter active tracking first. The final update is
delivered before automatic cleanup.

## Read progress once

```js
import { readScrollProgress } from '@scrollprogress/scrollprogress';

const target = document.querySelector('#reveal');

if (!(target instanceof HTMLElement)) {
    throw new Error('Missing one-shot target');
}

const progress = readScrollProgress(target, {
    start: 0.8,
    end: 0.4
});

console.log(progress);
```

This creates no observers or cleanup. Use a tracker instead when the value must
stay synchronized during scrolling.

## Web Animations

Use the reveal recipe's HTML and CSS in a browser that supports the Web Animations
API:

```js
import { trackScrollProgress } from '@scrollprogress/scrollprogress';

const target = document.querySelector('#reveal');
const content = target?.querySelector('.content');

if (!(target instanceof HTMLElement) || !(content instanceof HTMLElement)) {
    throw new Error('Missing animation elements');
}

const animation = content.animate(
    [
        { opacity: 0, transform: 'translateY(24px)' },
        { opacity: 1, transform: 'translateY(0)' }
    ],
    { duration: 1000, fill: 'both' }
);

animation.pause();

const tracker = trackScrollProgress(target, {
    onUpdate({ progress }) {
        animation.currentTime = progress * 1000;
    }
});

function cleanup() {
    tracker.destroy();
    animation.cancel();
}
```

ScrollProgress supplies progress; the browser owns the animation. The same pattern
can drive SVG attributes or another application-owned interpolator.
