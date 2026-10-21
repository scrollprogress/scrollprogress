import type { ScrollProgressStateSubscriber, ScrollProgressTracker } from '../types.js';
import { hasScrollProgressTrackerCompletedOnce } from '../utils/tracker-completion-utils.js';

import { runDebugCleanup } from './cleanup.js';
import type {
    ScrollProgressDebugBridgeController,
    ScrollProgressDebugBridgeOptions
} from './debug-scroll-progress.js';
import { registerScrollProgressDebugItem } from './registry-controller.js';
import type { ScrollProgressDebugItemController } from './registry.js';

export type DebugBridgeTermination = 'ordinary' | 'once';

interface DebugBridge {
    tracker: ScrollProgressTracker | null;
    item: ScrollProgressDebugItemController | null;
    onTerminate: ((reason: DebugBridgeTermination) => void) | null;
    unsubscribeState: (() => void) | null;
    unsubscribeDestroy: (() => void) | null;
    skipInitialState: boolean;
    detached: boolean;
    destroyed: boolean;
}

export function createDebugBridge(
    tracker: ScrollProgressTracker,
    options: ScrollProgressDebugBridgeOptions,
    onTerminate: ((reason: DebugBridgeTermination) => void) | null = null
): ScrollProgressDebugBridgeController {
    const element = tracker.getElement();
    const initialState = tracker.getState();
    const initialConfig = tracker.getConfig();
    const bridge: DebugBridge = {
        tracker,
        item: null,
        onTerminate,
        unsubscribeState: null,
        unsubscribeDestroy: null,
        skipInitialState: initialState !== null,
        detached: false,
        destroyed: false
    };

    try {
        bridge.item = registerScrollProgressDebugItem({
            debugId: options.debugId,
            label: options.label,
            element,
            state: initialState ?? undefined,
            ...initialConfig
        });

        const unsubscribeState = tracker.subscribe(createStateSubscriber(bridge));
        if (bridge.detached) unsubscribeState();
        else bridge.unsubscribeState = unsubscribeState;

        const unsubscribeDestroy = tracker.onDestroy(createDestroySubscriber(bridge));
        // onDestroy can terminate the bridge before returning its handle.
        if (bridge.detached) unsubscribeDestroy();
        else bridge.unsubscribeDestroy = unsubscribeDestroy;
    } catch (error) {
        try {
            destroyBridge(bridge);
        } catch {
            // Preserve the failure that prevented bridge construction.
        }
        throw error;
    }

    return createBridgeController(bridge);
}

function createBridgeController(bridge: DebugBridge): ScrollProgressDebugBridgeController {
    return {
        destroy() {
            destroyBridge(bridge);
        }
    };
}

function createStateSubscriber(bridge: DebugBridge): ScrollProgressStateSubscriber {
    return (state) => {
        const tracker = bridge.tracker;
        if (!tracker || bridge.detached) return;

        if (bridge.skipInitialState) {
            bridge.skipInitialState = false;
            return;
        }

        bridge.item?.update({ ...tracker.getConfig(), state });
    };
}

function createDestroySubscriber(bridge: DebugBridge): () => void {
    return () => {
        const tracker = bridge.tracker;
        if (!tracker || bridge.detached) return;

        const reason = hasScrollProgressTrackerCompletedOnce(tracker) ? 'once' : 'ordinary';
        const onTerminate = bridge.onTerminate;
        bridge.onTerminate = null;
        const cleanups = detachBridgeTracker(bridge);

        runDebugCleanup([
            () => {
                if (reason === 'once' && !bridge.destroyed) {
                    const finalState = tracker.getState();
                    bridge.item?.update({
                        ...tracker.getConfig(),
                        state: finalState ?? undefined,
                        completed: true
                    });
                }
            },
            ...cleanups,
            () => {
                if (reason === 'ordinary') destroyBridge(bridge);
            },
            () => onTerminate?.(reason)
        ]);
    };
}

function detachBridgeTracker(bridge: DebugBridge): (() => void)[] {
    bridge.detached = true;
    bridge.tracker = null;
    const { unsubscribeState, unsubscribeDestroy } = bridge;
    bridge.unsubscribeState = null;
    bridge.unsubscribeDestroy = null;
    return [unsubscribeState, unsubscribeDestroy].filter((cleanup) => cleanup !== null);
}

function destroyBridge(bridge: DebugBridge): void {
    if (bridge.destroyed) return;

    bridge.destroyed = true;
    bridge.onTerminate = null;
    const item = bridge.item;
    bridge.item = null;
    runDebugCleanup([...detachBridgeTracker(bridge), () => item?.destroy()]);
}
