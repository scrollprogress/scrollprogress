import type {
    ScrollProgressDestroyCallback,
    ScrollProgressState,
    ScrollProgressStateSubscriber
} from '../types.js';

export interface ScrollProgressTrackerLifecycle {
    notifyStateSubscribers(state: ScrollProgressState): void;
    subscribe(
        subscriber: ScrollProgressStateSubscriber,
        previousState: ScrollProgressState | null
    ): () => void;
    onDestroy(callback: ScrollProgressDestroyCallback): () => void;
    destroy(): void;
}

export function createScrollProgressTrackerLifecycle(
    isDestroyed: () => boolean
): ScrollProgressTrackerLifecycle {
    const stateSubscribers = new Set<ScrollProgressStateSubscriber>();
    const destroyCallbacks = new Set<ScrollProgressDestroyCallback>();

    return {
        notifyStateSubscribers(state) {
            if (stateSubscribers.size === 0) {
                return;
            }

            const stateSnapshot = { ...state };

            for (const subscriber of stateSubscribers) {
                subscriber(stateSnapshot);
            }
        },

        subscribe(subscriber, previousState) {
            if (isDestroyed()) {
                return () => {};
            }

            stateSubscribers.add(subscriber);

            try {
                if (previousState !== null) {
                    subscriber({ ...previousState });
                }
            } catch (error) {
                stateSubscribers.delete(subscriber);
                throw error;
            }

            return () => {
                stateSubscribers.delete(subscriber);
            };
        },

        onDestroy(callback) {
            if (isDestroyed()) {
                callback();
                return () => {};
            }

            destroyCallbacks.add(callback);

            return () => {
                destroyCallbacks.delete(callback);
            };
        },

        destroy() {
            let firstError: unknown;
            let hasError = false;

            // Destruction attempts every callback registered at its start, even
            // if an earlier callback unsubscribes a later one reentrantly.
            for (const callback of [...destroyCallbacks]) {
                try {
                    callback();
                } catch (error) {
                    if (!hasError) {
                        firstError = error;
                        hasError = true;
                    }
                }
            }

            destroyCallbacks.clear();
            stateSubscribers.clear();

            if (hasError) {
                throw firstError;
            }
        }
    };
}
