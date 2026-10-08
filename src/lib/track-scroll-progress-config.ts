import { areObserverThresholdsEqual } from './core.js';

import type {
    ScrollProgressState,
    ScrollProgressObserverThreshold,
    TrackScrollProgressConfig,
    TrackScrollProgressOptions
} from './types.js';

export interface TrackScrollProgressCallbacks {
    onUpdate?: (state: ScrollProgressState) => void;
    onEnter?: (state: ScrollProgressState) => void;
    onLeave?: (state: ScrollProgressState) => void;
}

const defaultScrollProgressConfig = {
    start: 0.8,
    end: 0.4,
    axis: 'y',
    root: null,
    rootMargin: '0px',
    observerThreshold: 0,
    requireRootVisible: false,
    inverted: false,
    once: false,
    cssVar: null
} satisfies TrackScrollProgressConfig;

function resolveObserverThreshold(
    observerThreshold: ScrollProgressObserverThreshold,
    currentObserverThreshold?: ScrollProgressObserverThreshold
): ScrollProgressObserverThreshold {
    if (
        currentObserverThreshold !== undefined &&
        areObserverThresholdsEqual(observerThreshold, currentObserverThreshold)
    ) {
        return currentObserverThreshold;
    }

    return Array.isArray(observerThreshold) ? [...observerThreshold] : observerThreshold;
}

export function resolveTrackScrollProgressConfig(
    options: TrackScrollProgressOptions = {}
): TrackScrollProgressConfig {
    return {
        start: options.start ?? defaultScrollProgressConfig.start,
        end: options.end ?? defaultScrollProgressConfig.end,
        axis: options.axis ?? defaultScrollProgressConfig.axis,

        root: options.root === undefined ? defaultScrollProgressConfig.root : options.root,

        rootMargin: options.rootMargin ?? defaultScrollProgressConfig.rootMargin,

        observerThreshold: resolveObserverThreshold(
            options.observerThreshold ?? defaultScrollProgressConfig.observerThreshold
        ),

        requireRootVisible:
            options.requireRootVisible ?? defaultScrollProgressConfig.requireRootVisible,

        inverted: options.inverted ?? defaultScrollProgressConfig.inverted,
        once: options.once ?? defaultScrollProgressConfig.once,

        cssVar: options.cssVar === undefined ? defaultScrollProgressConfig.cssVar : options.cssVar
    };
}

export function mergeTrackScrollProgressConfig(
    currentConfig: TrackScrollProgressConfig,
    nextOptions: TrackScrollProgressOptions
): TrackScrollProgressConfig {
    return {
        start: nextOptions.start ?? currentConfig.start,
        end: nextOptions.end ?? currentConfig.end,
        axis: nextOptions.axis ?? currentConfig.axis,

        root: nextOptions.root === undefined ? currentConfig.root : nextOptions.root,

        rootMargin: nextOptions.rootMargin ?? currentConfig.rootMargin,

        observerThreshold:
            nextOptions.observerThreshold === undefined
                ? currentConfig.observerThreshold
                : resolveObserverThreshold(
                      nextOptions.observerThreshold,
                      currentConfig.observerThreshold
                  ),

        requireRootVisible: nextOptions.requireRootVisible ?? currentConfig.requireRootVisible,

        inverted: nextOptions.inverted ?? currentConfig.inverted,
        once: nextOptions.once ?? currentConfig.once,

        cssVar: nextOptions.cssVar === undefined ? currentConfig.cssVar : nextOptions.cssVar
    };
}

export function resolveTrackScrollProgressCallbacks(
    options: Partial<TrackScrollProgressCallbacks>
): TrackScrollProgressCallbacks {
    return {
        onUpdate: options.onUpdate,
        onEnter: options.onEnter,
        onLeave: options.onLeave
    };
}

export function copyTrackScrollProgressConfig(
    config: TrackScrollProgressConfig
): TrackScrollProgressConfig {
    return {
        ...config,
        observerThreshold: Array.isArray(config.observerThreshold)
            ? [...config.observerThreshold]
            : config.observerThreshold
    };
}
