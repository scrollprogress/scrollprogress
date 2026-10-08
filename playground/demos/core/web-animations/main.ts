import './style.css';

import {
    trackScrollProgress,
    type ScrollProgressState,
    type ScrollProgressTracker,
    type TrackScrollProgressOptions
} from '@scrollprogress/scrollprogress';

type DemoCleanup = () => void;
interface DemoOutput {
    progress: HTMLOutputElement;
    tracking: HTMLElement;
    direction: HTMLElement;
}
type DemoTrackerOptions = Omit<TrackScrollProgressOptions, 'onUpdate' | 'onEnter' | 'onLeave'>;
function getRequiredElement<TElement extends Element>(
    selector: string,
    parent: ParentNode = document
): TElement {
    const element = parent.querySelector<TElement>(selector);
    if (!element) throw new Error(`Missing demo element: ${selector}`);
    return element;
}
function getDemoOutput(name: string): DemoOutput {
    return {
        progress: getRequiredElement<HTMLOutputElement>(`[data-demo-progress="${name}"]`),
        tracking: getRequiredElement<HTMLElement>(`[data-demo-tracking="${name}"]`),
        direction: getRequiredElement<HTMLElement>(`[data-demo-direction="${name}"]`)
    };
}
function renderState(output: DemoOutput, state: ScrollProgressState): void {
    output.progress.value = state.progress.toFixed(3);
    output.tracking.textContent = state.isTracking ? 'tracking' : 'idle';
    output.direction.textContent = state.progressDirection;
}
function createDemoTracker(
    name: string,
    target: HTMLElement,
    options: DemoTrackerOptions = {},
    onState?: (state: ScrollProgressState) => void
): ScrollProgressTracker {
    const output = getDemoOutput(name);
    return trackScrollProgress(target, {
        ...options,
        onUpdate(state) {
            renderState(output, state);
            onState?.(state);
        },
        onEnter() {
            target.dataset.scrollActive = 'true';
        },
        onLeave() {
            delete target.dataset.scrollActive;
        }
    });
}

const animationDuration = 1000;

void createDemoTracker;
void getDemoOutput;

const cleanup: DemoCleanup = (() => {
    const target = getRequiredElement<HTMLElement>('[data-core-target="animation"]');
    const content = getRequiredElement<HTMLElement>('[data-animation-content]', target);
    const animation = content.animate(
        [
            { opacity: 0, transform: 'translateY(24px) scale(0.96)' },
            { opacity: 1, transform: 'translateY(0) scale(1)' }
        ],
        { duration: animationDuration, fill: 'both' }
    );

    animation.pause();

    const tracker = createDemoTracker('animation', target, {}, ({ progress }) => {
        animation.currentTime = progress * animationDuration;
    });

    return () => {
        tracker.destroy();
        animation.cancel();
    };
})();

if (import.meta.hot) import.meta.hot.dispose(cleanup);
