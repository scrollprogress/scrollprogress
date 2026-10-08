import './style.css';

import {
    trackScrollProgress,
    type ScrollProgressObserverThreshold,
    type ScrollProgressState
} from '@scrollprogress/scrollprogress';

interface ViewportXDemoElements {
    target: HTMLElement;
    output: HTMLOutputElement;
    progressBar: HTMLElement;
    scrollDirectionOutput: HTMLElement;
    progressDirectionOutput: HTMLElement;
    intersectionRatioOutput: HTMLElement;
    trackingOutput: HTMLElement;
}

function createIntersectionThresholds(steps = 100): ScrollProgressObserverThreshold {
    return Array.from({ length: steps + 1 }, (_, index) => index / steps);
}

function getRequiredElement<TElement extends Element>(selector: string): TElement {
    const element = document.querySelector<TElement>(selector);

    if (!element) {
        throw new Error(`Missing viewport X playground element: ${selector}`);
    }

    return element;
}

function getViewportXDemoElements(): ViewportXDemoElements {
    const target = getRequiredElement<HTMLElement>('[data-scroll-demo="viewport-x"]');
    const output = target.querySelector<HTMLOutputElement>('output');

    if (!output) {
        throw new Error('Missing viewport X playground output');
    }

    return {
        target,
        output,
        progressBar: getRequiredElement<HTMLElement>('[data-scroll-progress-bar="viewport-x"]'),
        scrollDirectionOutput: getRequiredElement<HTMLElement>(
            '[data-scroll-direction="viewport-x"]'
        ),
        progressDirectionOutput: getRequiredElement<HTMLElement>(
            '[data-scroll-progress-direction="viewport-x"]'
        ),
        intersectionRatioOutput: getRequiredElement<HTMLElement>(
            '[data-scroll-intersection-ratio="viewport-x"]'
        ),
        trackingOutput: getRequiredElement<HTMLElement>('[data-scroll-tracking="viewport-x"]')
    };
}

function setViewportXDemoActive(elements: ViewportXDemoElements, isActive: boolean): void {
    if (isActive) {
        elements.target.dataset.scrollActive = 'true';
        return;
    }

    delete elements.target.dataset.scrollActive;
}

function updateViewportXDemoOutput(
    elements: ViewportXDemoElements,
    state: ScrollProgressState
): void {
    elements.output.value = state.progress.toFixed(3);
    elements.progressBar.style.transform = `scaleX(${state.progress})`;
    elements.progressDirectionOutput.textContent = state.progressDirection;
    elements.scrollDirectionOutput.textContent = state.scrollDirection;
    elements.intersectionRatioOutput.textContent = state.intersectionRatio.toFixed(3);
    elements.trackingOutput.textContent = state.isTracking ? 'tracking' : 'idle';
}

const elements = getViewportXDemoElements();

const tracker = trackScrollProgress(elements.target, {
    axis: 'x',
    start: 0.7,
    end: 0.4,
    observerThreshold: createIntersectionThresholds(),

    onUpdate(state) {
        updateViewportXDemoOutput(elements, state);
    },

    onEnter() {
        setViewportXDemoActive(elements, true);
    },

    onLeave() {
        setViewportXDemoActive(elements, false);
    }
});

if (import.meta.hot) {
    import.meta.hot.dispose(() => {
        tracker.destroy();
    });
}
