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

void createDemoTracker;
void getDemoOutput;

const cleanup: DemoCleanup = (() => {
    const target = getRequiredElement<HTMLElement>('[data-core-target="boundary-events"]');
    const indicator = getRequiredElement<HTMLElement>('[data-boundary-indicator]', target);
    const status = getRequiredElement<HTMLElement>('[data-boundary-status]', target);
    const lastEvent = getRequiredElement<HTMLElement>('[data-boundary-last-event]', target);
    const enterCount = getRequiredElement<HTMLOutputElement>('[data-boundary-enter-count]', target);
    const leaveCount = getRequiredElement<HTMLOutputElement>('[data-boundary-leave-count]', target);
    let enters = 0;
    let leaves = 0;

    function renderTransition(eventName: 'onEnter' | 'onLeave'): void {
        const isTracking = eventName === 'onEnter';

        indicator.dataset.tracking = String(isTracking);
        status.textContent = isTracking
            ? 'Inside the observation area'
            : 'Outside the observation area';
        lastEvent.textContent = eventName;

        if (isTracking) {
            enterCount.value = String(++enters);
        } else {
            leaveCount.value = String(++leaves);
        }
    }

    const tracker = trackScrollProgress(target, {
        rootMargin: '-35% 0px',
        onEnter: () => renderTransition('onEnter'),
        onLeave: () => renderTransition('onLeave')
    });

    return () => tracker.destroy();
})();

if (import.meta.hot) import.meta.hot.dispose(cleanup);
