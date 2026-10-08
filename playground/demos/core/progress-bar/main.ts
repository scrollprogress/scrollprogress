import './style.css';

import { trackScrollProgress, type ScrollProgressState } from '@scrollprogress/scrollprogress';

function required<TElement extends Element>(selector: string): TElement {
    const element = document.querySelector<TElement>(selector);

    if (!element) throw new Error(`Missing demo element: ${selector}`);
    return element;
}

const target = required<HTMLElement>('[data-core-target="progress-bar"]');
const fill = required<HTMLElement>('[data-progress-fill]');
const progress = required<HTMLOutputElement>('[data-demo-progress="progress-bar"]');
const tracking = required<HTMLElement>('[data-demo-tracking="progress-bar"]');
const direction = required<HTMLElement>('[data-demo-direction="progress-bar"]');

function render(state: ScrollProgressState): void {
    fill.style.transform = `scaleX(${state.progress})`;
    progress.value = state.progress.toFixed(3);
    tracking.textContent = state.isTracking ? 'tracking' : 'idle';
    direction.textContent = state.progressDirection;
}

const tracker = trackScrollProgress(target, {
    start: 0.9,
    end: 0.2,
    onUpdate: render,
    onEnter: () => (target.dataset.scrollActive = 'true'),
    onLeave: () => delete target.dataset.scrollActive
});

if (import.meta.hot) import.meta.hot.dispose(() => tracker.destroy());
