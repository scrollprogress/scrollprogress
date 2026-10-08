import type { ScrollProgressTracker } from '../types.js';
import { hasScrollProgressTrackerCompletedOnce } from '../utils/tracker-completion-utils.js';

import { registerScrollProgressDebugItem } from './registry-controller.js';

export interface ScrollProgressDebugBridgeOptions {
    debugId?: string;
    label?: string;
}

export interface ScrollProgressDebugBridgeController {
    destroy: () => void;
}

export function debugScrollProgress(
    tracker: ScrollProgressTracker,
    options: ScrollProgressDebugBridgeOptions = {}
): ScrollProgressDebugBridgeController {
    const element = tracker.getElement();
    const initialState = tracker.getState();
    const initialConfig = tracker.getConfig();

    const debugItem = registerScrollProgressDebugItem({
        debugId: options.debugId,
        label: options.label,
        element,
        state: initialState ?? undefined,
        ...initialConfig
    });

    let isDestroyed = false;
    let isTrackerDetached = false;
    let shouldSkipInitialSubscriptionState = initialState !== null;
    let unsubscribeState = () => {};
    let unsubscribeTrackerDestroy = () => {};

    unsubscribeState = tracker.subscribe((state) => {
        if (isDestroyed) {
            return;
        }

        if (shouldSkipInitialSubscriptionState) {
            shouldSkipInitialSubscriptionState = false;
            return;
        }

        debugItem.update({
            ...tracker.getConfig(),
            state
        });
    });

    unsubscribeTrackerDestroy = tracker.onDestroy(() => {
        if (hasScrollProgressTrackerCompletedOnce(tracker)) {
            const finalState = tracker.getState();

            debugItem.update({
                ...tracker.getConfig(),
                state: finalState ?? undefined,
                completed: true
            });
            detachTracker();
            return;
        }

        destroy();
    });

    function detachTracker(): void {
        if (isTrackerDetached) {
            return;
        }

        isTrackerDetached = true;
        unsubscribeState();
        unsubscribeTrackerDestroy();
    }

    function destroy(): void {
        if (isDestroyed) {
            return;
        }

        isDestroyed = true;

        detachTracker();
        debugItem.destroy();
    }

    return {
        destroy
    };
}
