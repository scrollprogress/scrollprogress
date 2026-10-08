import { readScrollProgress } from './read-scroll-progress.js';

import {
    copyTrackScrollProgressConfig,
    mergeTrackScrollProgressConfig,
    resolveTrackScrollProgressCallbacks,
    resolveTrackScrollProgressConfig
} from './track-scroll-progress-config.js';

import {
    createScrollProgressState,
    resolveIsTracking,
    shouldCompleteOnceTracking,
    shouldSkipStateUpdate
} from './track-scroll-progress-state.js';

import {
    addScrollEventListeners,
    areScrollEventTargetsEqual,
    readScrollPosition,
    removeScrollEventListeners,
    resolveScrollEventTargets
} from './utils/scroll-source-utils.js';

import { createScrollProgressTrackerLifecycle } from './utils/tracker-lifecycle-utils.js';

import { removeCssVar, writeCssVar } from './utils/css-var-utils.js';

import {
    createScrollProgressIntersectionObserver,
    createRootVisibilityObserver,
    resolveInitialRootVisibility
} from './utils/intersection-observer-utils.js';

import type {
    ScrollProgressState,
    ScrollProgressTracker,
    TrackScrollProgressConfig,
    TrackScrollProgressOptions
} from './types.js';
import { createScrollProgressResizeObserver } from './utils/resize-observer-utils.js';
import { createAnimationFrameScheduler } from './utils/animation-frame-utils.js';
import { markScrollProgressTrackerOnceCompleted } from './utils/tracker-completion-utils.js';

export function trackScrollProgress(
    element: HTMLElement,
    options: TrackScrollProgressOptions = {}
): ScrollProgressTracker {
    let currentConfig = resolveTrackScrollProgressConfig(options);
    let currentCallbacks = resolveTrackScrollProgressCallbacks(options);

    validateConfig(currentConfig);

    if (
        typeof window.requestAnimationFrame !== 'function' ||
        typeof window.cancelAnimationFrame !== 'function'
    ) {
        throw new TypeError(
            'scrollprogress requires requestAnimationFrame and cancelAnimationFrame'
        );
    }

    function validateConfig(config: TrackScrollProgressConfig) {
        if (
            !(element instanceof HTMLElement) ||
            element.ownerDocument !== document ||
            (config.root !== null &&
                config.root !== document &&
                (!(config.root instanceof Element) || config.root.ownerDocument !== document))
        ) {
            throw new TypeError(
                'scrollprogress requires a target and root in the current document'
            );
        }
        if (!Number.isFinite(config.start) || !Number.isFinite(config.end)) {
            throw new RangeError('scrollprogress start and end must be finite');
        }
        if (config.axis !== 'x' && config.axis !== 'y') {
            throw new TypeError('scrollprogress axis must be x or y');
        }
        if (
            config.cssVar !== null &&
            (!config.cssVar.startsWith('--') || config.cssVar.length === 2)
        ) {
            throw new TypeError('scrollprogress cssVar must name a CSS custom property');
        }
    }

    let isInObservationArea = false;
    let isRootVisible = true;
    let intersectionRatio = 0;

    let previousProgress: number | null = null;
    let previousScrollPosition: number | null = null;
    let previousState: ScrollProgressState | null = null;

    let hasEnteredTracking = false;
    let hasCompletedOnce = false;
    let isDestroyed = false;
    let hasPendingExplicitUpdate = false;
    let hasWarnedAboutRange = false;

    let observer: IntersectionObserver | null = null;
    let rootVisibilityObserver: IntersectionObserver | null = null;
    let resizeObserver: ResizeObserver | null = null;
    const lifecycle = createScrollProgressTrackerLifecycle(() => isDestroyed);

    function warnAboutScrollProgressRange(): void {
        if (
            hasWarnedAboutRange ||
            currentConfig.start > currentConfig.end ||
            typeof console === 'undefined'
        ) {
            return;
        }

        hasWarnedAboutRange = true;

        console.warn(
            '[scroll-progress] start <= end: this range is allowed, ' +
                'but check that it is intentional.',
            element,
            copyTrackScrollProgressConfig(currentConfig)
        );
    }

    warnAboutScrollProgressRange();

    function updateProgress() {
        if (isDestroyed) {
            return;
        }

        const rawProgress = readScrollProgress(element, currentConfig);

        const scrollPosition = readScrollPosition(currentConfig.root, currentConfig.axis);

        const state = createScrollProgressState({
            rawProgress,
            scrollPosition,
            previousProgress,
            previousScrollPosition,
            isInObservationArea,
            intersectionRatio,
            isRootVisible,
            inverted: currentConfig.inverted,
            requireRootVisible: currentConfig.requireRootVisible
        });

        previousProgress = state.progress;
        previousScrollPosition = scrollPosition;

        const wasTracking = previousState?.isTracking === true;
        const shouldSkipUpdate = shouldSkipStateUpdate(previousState, state);

        const shouldNotifyStateSubscribers = hasPendingExplicitUpdate;

        hasPendingExplicitUpdate = false;

        writeCssVar(element, currentConfig.cssVar, state.progress);

        const callbacks = currentCallbacks;
        const shouldCompleteOnce = shouldCompleteOnceTracking(
            state,
            currentConfig.once,
            currentConfig.inverted,
            hasEnteredTracking || state.isTracking
        );

        let firstError: unknown;
        let hasError = false;

        try {
            if (shouldSkipUpdate) {
                if (shouldNotifyStateSubscribers) {
                    lifecycle.notifyStateSubscribers(state);
                }
            } else {
                previousState = state;

                if (state.isTracking) {
                    hasEnteredTracking = true;
                }

                if (!wasTracking && state.isTracking) {
                    callbacks.onEnter?.(state);
                }

                if (wasTracking && !state.isTracking) {
                    callbacks.onLeave?.(state);
                }

                if (!isDestroyed) callbacks.onUpdate?.(state);
                lifecycle.notifyStateSubscribers(state);
            }
        } catch (error) {
            firstError = error;
            hasError = true;
        }

        if (shouldCompleteOnce) {
            hasCompletedOnce = true;

            if (tracker) {
                markScrollProgressTrackerOnceCompleted(tracker);
            }

            try {
                destroyTracker();
            } catch (error) {
                if (!hasError) {
                    firstError = error;
                    hasError = true;
                }
            }
        }

        if (hasError) {
            throw firstError;
        }
    }

    function requestProgressUpdate() {
        progressUpdateScheduler.request();
    }

    function requestTrackedProgressUpdate() {
        if (isDestroyed) {
            return;
        }

        // Scroll updates are skipped outside the active tracking state.
        // The observers will request an update when the target/root or
        // root/viewport visibility changes.
        if (!canRequestTrackedProgressUpdate()) {
            return;
        }

        requestProgressUpdate();
    }

    function canRequestTrackedProgressUpdate(): boolean {
        return resolveIsTracking(
            isInObservationArea,
            isRootVisible,
            currentConfig.requireRootVisible
        );
    }

    function handleIntersection(
        entries: IntersectionObserverEntry[],
        source: IntersectionObserver
    ) {
        if (isDestroyed || source !== observer) return;
        const entry = entries[entries.length - 1];

        if (!entry) {
            return;
        }

        isInObservationArea = entry.isIntersecting;
        intersectionRatio = entry.intersectionRatio;

        requestProgressUpdate();
    }

    function handleRootVisibilityIntersection(
        entries: IntersectionObserverEntry[],
        source: IntersectionObserver
    ) {
        if (isDestroyed || source !== rootVisibilityObserver) return;
        const entry = entries[entries.length - 1];

        if (!entry) {
            return;
        }

        isRootVisible = entry.isIntersecting;
        requestProgressUpdate();
    }

    function setupObserver() {
        observer?.disconnect();

        observer = createScrollProgressIntersectionObserver(
            element,
            currentConfig,
            handleIntersection
        );
    }

    function setupRootVisibilityObserver() {
        rootVisibilityObserver?.disconnect();
        rootVisibilityObserver = null;

        if (!currentConfig.requireRootVisible) {
            isRootVisible = true;
            return;
        }

        if (!(currentConfig.root instanceof Element)) {
            isRootVisible = true;
            return;
        }

        isRootVisible = resolveInitialRootVisibility(currentConfig.root);

        rootVisibilityObserver = createRootVisibilityObserver(
            currentConfig.root,
            handleRootVisibilityIntersection
        );
    }

    function setupResizeObserver() {
        resizeObserver?.disconnect();

        resizeObserver = createScrollProgressResizeObserver(
            element,
            currentConfig.root,
            requestProgressUpdate
        );
    }

    const progressUpdateScheduler = createAnimationFrameScheduler(
        updateProgress,
        () => isDestroyed
    );

    let scrollEventTargets = resolveScrollEventTargets(currentConfig.root);

    function destroyTracker() {
        if (isDestroyed) {
            return;
        }

        isDestroyed = true;

        progressUpdateScheduler.cancel();

        observer?.disconnect();
        observer = null;

        rootVisibilityObserver?.disconnect();
        rootVisibilityObserver = null;

        resizeObserver?.disconnect();
        resizeObserver = null;

        removeScrollEventListeners(scrollEventTargets, requestTrackedProgressUpdate);
        window.removeEventListener('resize', requestProgressUpdate);

        lifecycle.destroy();
    }

    let tracker: ScrollProgressTracker | null = null;

    try {
        setupObserver();
        setupRootVisibilityObserver();
        setupResizeObserver();
        addScrollEventListeners(scrollEventTargets, requestTrackedProgressUpdate);
        window.addEventListener('resize', requestProgressUpdate);
        updateProgress();
    } catch (error) {
        try {
            destroyTracker();
        } catch {
            // Preserve the error that prevented tracker creation.
        }

        throw error;
    }

    tracker = {
        update(nextOptions) {
            if (isDestroyed) {
                return;
            }

            const previousRoot = currentConfig.root;
            const previousObserverThreshold = currentConfig.observerThreshold;
            const previousRootMargin = currentConfig.rootMargin;
            const previousAxis = currentConfig.axis;
            const previousRequireRootVisible = currentConfig.requireRootVisible;
            const previousInverted = currentConfig.inverted;
            const previousCssVar = currentConfig.cssVar;

            const nextConfig = mergeTrackScrollProgressConfig(currentConfig, nextOptions);
            validateConfig(nextConfig);

            const rootChanged = nextConfig.root !== previousRoot;
            const axisChanged = nextConfig.axis !== previousAxis;
            const requireRootVisibleChanged =
                nextConfig.requireRootVisible !== previousRequireRootVisible;
            const invertedChanged = nextConfig.inverted !== previousInverted;
            const cssVarChanged = nextConfig.cssVar !== previousCssVar;
            const shouldRecreateObserver =
                rootChanged ||
                nextConfig.rootMargin !== previousRootMargin ||
                nextConfig.observerThreshold !== previousObserverThreshold;

            // Native observer validation happens before committing configuration or
            // disconnecting live resources. Failed updates leave the tracker usable.
            let nextObserver = observer;
            let nextRootVisibilityObserver = rootVisibilityObserver;
            let nextResizeObserver = resizeObserver;
            let nextRootVisible = isRootVisible;
            try {
                if (shouldRecreateObserver) {
                    nextObserver = createScrollProgressIntersectionObserver(
                        element,
                        nextConfig,
                        handleIntersection
                    );
                }
                if (rootChanged || requireRootVisibleChanged) {
                    const root =
                        nextConfig.requireRootVisible && nextConfig.root instanceof Element
                            ? nextConfig.root
                            : null;
                    nextRootVisible = resolveInitialRootVisibility(root);
                    nextRootVisibilityObserver =
                        root === null
                            ? null
                            : createRootVisibilityObserver(root, handleRootVisibilityIntersection);
                }
                if (rootChanged) {
                    nextResizeObserver = createScrollProgressResizeObserver(
                        element,
                        nextConfig.root,
                        requestProgressUpdate
                    );
                }
            } catch (error) {
                if (nextObserver !== observer) nextObserver?.disconnect();
                if (nextRootVisibilityObserver !== rootVisibilityObserver)
                    nextRootVisibilityObserver?.disconnect();
                if (nextResizeObserver !== resizeObserver) nextResizeObserver?.disconnect();
                throw error;
            }

            if (nextObserver !== observer) observer?.disconnect();
            if (nextRootVisibilityObserver !== rootVisibilityObserver)
                rootVisibilityObserver?.disconnect();
            if (nextResizeObserver !== resizeObserver) resizeObserver?.disconnect();
            observer = nextObserver;
            rootVisibilityObserver = nextRootVisibilityObserver;
            resizeObserver = nextResizeObserver;
            currentConfig = nextConfig;
            isRootVisible = nextRootVisible;

            if (rootChanged) {
                isInObservationArea = false;
                intersectionRatio = 0;
            }

            if (rootChanged || requireRootVisibleChanged) {
                previousState = null;
            }

            if (axisChanged || rootChanged) {
                previousProgress = null;
                previousScrollPosition = null;
            }

            if (invertedChanged) {
                previousProgress = null;
            }

            if (axisChanged || rootChanged || invertedChanged) {
                hasEnteredTracking = false;
            }

            if (cssVarChanged) {
                removeCssVar(element, previousCssVar);
            }

            const nextScrollEventTargets = resolveScrollEventTargets(currentConfig.root);

            if (!areScrollEventTargetsEqual(nextScrollEventTargets, scrollEventTargets)) {
                removeScrollEventListeners(scrollEventTargets, requestTrackedProgressUpdate);
                addScrollEventListeners(nextScrollEventTargets, requestTrackedProgressUpdate);
                scrollEventTargets = nextScrollEventTargets;
            }

            currentCallbacks = resolveTrackScrollProgressCallbacks({
                onUpdate:
                    'onUpdate' in nextOptions ? nextOptions.onUpdate : currentCallbacks.onUpdate,
                onEnter: 'onEnter' in nextOptions ? nextOptions.onEnter : currentCallbacks.onEnter,
                onLeave: 'onLeave' in nextOptions ? nextOptions.onLeave : currentCallbacks.onLeave
            });

            warnAboutScrollProgressRange();
            hasPendingExplicitUpdate = true;
            requestProgressUpdate();
        },

        getState() {
            return previousState === null ? null : { ...previousState };
        },
        getElement() {
            return element;
        },
        getConfig() {
            return copyTrackScrollProgressConfig(currentConfig);
        },
        subscribe(subscriber) {
            return lifecycle.subscribe(subscriber, previousState);
        },
        onDestroy(callback) {
            return lifecycle.onDestroy(callback);
        },
        destroy() {
            destroyTracker();
        }
    };

    if (hasCompletedOnce) {
        markScrollProgressTrackerOnceCompleted(tracker);
    }

    return tracker;
}
