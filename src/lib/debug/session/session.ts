import type { ScrollProgressTracker } from '../../types.js';
import { createDebugBridge, type DebugBridgeTermination } from '../bridge.js';
import { runDebugCleanup } from '../cleanup.js';

import {
    createDebugConsoleLogger,
    type ScrollProgressDebugConsoleLoggerOptions
} from '../console/console-logger.js';
import type {
    ScrollProgressDebugBridgeController,
    ScrollProgressDebugBridgeOptions
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

interface TrackerRegistration {
    bridge: ScrollProgressDebugBridgeController | null;
    terminal: DebugBridgeTermination | null;
    detached: boolean;
}

interface DebuggerOwner {
    destroyed: boolean;
    trackerIndex: WeakMap<ScrollProgressTracker, TrackerRegistration>;
    registrations: Set<TrackerRegistration>;
    tools: DestroyableController[];
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

    const owner: DebuggerOwner = {
        destroyed: false,
        trackerIndex: new WeakMap(),
        registrations: new Set(),
        tools: []
    };

    try {
        for (const registration of initialTrackers) {
            addDebuggerTracker(owner, registration.tracker, {
                debugId: registration.debugId,
                label: registration.label
            });
        }

        const paletteOptions = resolveToolOptions(options.palette);
        if (paletteOptions) {
            owner.tools.push(createDebugPalette(paletteOptions));
        }

        const overlayOptions = resolveToolOptions(options.overlay);
        if (overlayOptions) {
            owner.tools.push(createDebugOverlay(overlayOptions));
        }

        const consoleOptions = resolveToolOptions(options.console);
        if (consoleOptions) {
            owner.tools.push(createDebugConsoleLogger(consoleOptions));
        }
    } catch (error) {
        try {
            destroyDebugger(owner);
        } catch {
            // Preserve the failure that prevented session construction.
        }
        throw error;
    }

    return createDebuggerController(owner);
}

function createDebuggerController(owner: DebuggerOwner): ScrollProgressDebuggerController {
    return {
        addTracker(tracker, options = {}) {
            return addDebuggerTracker(owner, tracker, options);
        },
        destroy() {
            destroyDebugger(owner);
        }
    };
}

function addDebuggerTracker(
    owner: DebuggerOwner,
    tracker: ScrollProgressTracker,
    options: ScrollProgressDebugBridgeOptions
): ScrollProgressDebuggerTrackerController {
    if (owner.destroyed) {
        throw new Error('Cannot add a tracker to a destroyed scrollprogress debugger');
    }
    const existing = owner.trackerIndex.get(tracker);
    if (existing && !existing.detached) {
        throw new Error('Tracker is already attached to this scrollprogress debugger');
    }

    const registration: TrackerRegistration = { bridge: null, terminal: null, detached: false };
    owner.trackerIndex.set(tracker, registration);
    owner.registrations.add(registration);

    try {
        const bridge = createDebugBridge(
            tracker,
            options,
            createTerminationHook(owner, registration)
        );
        if (registration.detached || registration.terminal === 'ordinary' || owner.destroyed) {
            bridge.destroy();
        } else {
            registration.bridge = bridge;
        }
    } catch (error) {
        try {
            detachRegistration(owner, registration);
        } catch {
            // A failed addition must preserve its construction error.
        }
        throw error;
    }

    return createRegistrationController(owner, registration);
}

function createRegistrationController(
    owner: DebuggerOwner,
    registration: TrackerRegistration
): ScrollProgressDebuggerTrackerController {
    return {
        detach() {
            detachRegistration(owner, registration);
        }
    };
}

function createTerminationHook(
    owner: DebuggerOwner,
    registration: TrackerRegistration
): (reason: DebugBridgeTermination) => void {
    return (reason) => {
        registration.terminal = reason;
        if (reason === 'ordinary') {
            owner.registrations.delete(registration);
            const bridge = registration.bridge;
            registration.bridge = null;
            bridge?.destroy();
        }
    };
}

function detachRegistration(owner: DebuggerOwner, registration: TrackerRegistration): void {
    if (registration.detached) return;

    registration.detached = true;
    owner.registrations.delete(registration);
    const bridge = registration.bridge;
    registration.bridge = null;
    bridge?.destroy();
}

function destroyDebugger(owner: DebuggerOwner): void {
    if (owner.destroyed) return;

    owner.destroyed = true;
    owner.trackerIndex = new WeakMap();
    const tools = owner.tools.splice(0).reverse();
    const registrations = [...owner.registrations];
    owner.registrations.clear();

    runDebugCleanup([
        ...tools.map((tool) => () => tool.destroy()),
        ...registrations.map((registration) => () => detachRegistration(owner, registration))
    ]);
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
