import type { ScrollProgressTracker } from '../../types.js';

import {
    createDebugConsoleLogger,
    type ScrollProgressDebugConsoleLoggerOptions
} from '../console/console-logger.js';
import {
    debugScrollProgress,
    type ScrollProgressDebugBridgeOptions
} from '../debug-scroll-progress.js';
import { createDebugOverlay, type ScrollProgressDebugOverlayOptions } from '../overlay/overlay.js';
import { createDebugPalette, type ScrollProgressDebugPaletteOptions } from '../palette/palette.js';

type ScrollProgressDebuggerToolOptions<T> = boolean | T;

export interface ScrollProgressDebuggerToolsOptions {
    palette?: ScrollProgressDebuggerToolOptions<ScrollProgressDebugPaletteOptions>;
    overlay?: ScrollProgressDebuggerToolOptions<ScrollProgressDebugOverlayOptions>;
    console?: ScrollProgressDebuggerToolOptions<ScrollProgressDebugConsoleLoggerOptions>;
}

export interface ScrollProgressDebuggerTrackerRegistration extends ScrollProgressDebugBridgeOptions {
    tracker: ScrollProgressTracker;
}

export interface ScrollProgressDebuggerOptions extends ScrollProgressDebuggerToolsOptions {
    trackers?: readonly ScrollProgressDebuggerTrackerRegistration[];
}

export interface ScrollProgressDebuggerSingleTrackerOptions
    extends ScrollProgressDebuggerToolsOptions, ScrollProgressDebugBridgeOptions {}

export interface ScrollProgressDebuggerTrackerController {
    detach: () => void;
}

export interface ScrollProgressDebuggerController {
    addTracker: (
        tracker: ScrollProgressTracker,
        options?: ScrollProgressDebugBridgeOptions
    ) => ScrollProgressDebuggerTrackerController;
    destroy: () => void;
}

interface DestroyableController {
    destroy: () => void;
}

export function createScrollProgressDebugger(
    tracker: ScrollProgressTracker,
    options?: ScrollProgressDebuggerSingleTrackerOptions
): ScrollProgressDebuggerController;
export function createScrollProgressDebugger(
    options?: ScrollProgressDebuggerOptions
): ScrollProgressDebuggerController;
export function createScrollProgressDebugger(
    trackerOrOptions: ScrollProgressTracker | ScrollProgressDebuggerOptions = {},
    singleTrackerOptions: ScrollProgressDebuggerSingleTrackerOptions = {}
): ScrollProgressDebuggerController {
    const isSingleTracker = isScrollProgressTracker(trackerOrOptions);
    const options = isSingleTracker ? singleTrackerOptions : trackerOrOptions;
    const initialTrackers: readonly ScrollProgressDebuggerTrackerRegistration[] = isSingleTracker
        ? [
              {
                  tracker: trackerOrOptions,
                  debugId: singleTrackerOptions.debugId,
                  label: singleTrackerOptions.label
              }
          ]
        : (trackerOrOptions.trackers ?? []);

    let isDestroyed = false;
    const trackerControllers = new Map<
        ScrollProgressTracker,
        ScrollProgressDebuggerTrackerController
    >();
    const toolControllers: DestroyableController[] = [];

    function addTracker(
        tracker: ScrollProgressTracker,
        trackerOptions: ScrollProgressDebugBridgeOptions = {}
    ): ScrollProgressDebuggerTrackerController {
        if (isDestroyed) {
            throw new Error('Cannot add a tracker to a destroyed scrollprogress debugger');
        }
        if (trackerControllers.has(tracker)) {
            throw new Error('Tracker is already attached to this scrollprogress debugger');
        }

        const bridge = debugScrollProgress(tracker, trackerOptions);
        let isDetached = false;

        const trackerController: ScrollProgressDebuggerTrackerController = {
            detach() {
                if (isDetached) {
                    return;
                }

                isDetached = true;
                trackerControllers.delete(tracker);
                bridge.destroy();
            }
        };

        trackerControllers.set(tracker, trackerController);

        return trackerController;
    }

    function destroy(): void {
        if (isDestroyed) {
            return;
        }

        isDestroyed = true;

        for (const controller of toolControllers.splice(0).reverse()) {
            controller.destroy();
        }

        for (const controller of Array.from(trackerControllers.values())) {
            controller.detach();
        }
    }

    try {
        for (const registration of initialTrackers) {
            addTracker(registration.tracker, {
                debugId: registration.debugId,
                label: registration.label
            });
        }

        const paletteOptions = resolveToolOptions(options.palette);
        if (paletteOptions) {
            toolControllers.push(createDebugPalette(paletteOptions));
        }

        const overlayOptions = resolveToolOptions(options.overlay);
        if (overlayOptions) {
            toolControllers.push(createDebugOverlay(overlayOptions));
        }

        const consoleOptions = resolveToolOptions(options.console);
        if (consoleOptions) {
            toolControllers.push(createDebugConsoleLogger(consoleOptions));
        }
    } catch (error) {
        destroy();
        throw error;
    }

    return {
        addTracker,
        destroy
    };
}

function isScrollProgressTracker(
    value: ScrollProgressTracker | ScrollProgressDebuggerOptions
): value is ScrollProgressTracker {
    return (
        'getElement' in value &&
        typeof value.getElement === 'function' &&
        'getState' in value &&
        typeof value.getState === 'function' &&
        'getConfig' in value &&
        typeof value.getConfig === 'function' &&
        'subscribe' in value &&
        typeof value.subscribe === 'function' &&
        'onDestroy' in value &&
        typeof value.onDestroy === 'function'
    );
}

function resolveToolOptions<T>(
    options: ScrollProgressDebuggerToolOptions<T> | undefined
): T | null {
    if (options === undefined || options === false) {
        return null;
    }

    return options === true ? ({} as T) : options;
}
