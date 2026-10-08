export interface ScrollProgressRange {
    start: number;
    end: number;
}

export interface ReadScrollProgressOptions extends ScrollProgressRange {
    axis?: ScrollProgressAxis;
    root?: ScrollProgressRoot;
}

export type ScrollProgressRoot = Element | Document | null;

export type ScrollProgressAxis = 'y' | 'x';

export interface ScrollProgressInput extends ScrollProgressRange {
    elementStart: number;
    elementSize: number;
    rootSize: number;
}

export type ScrollProgressDirection = 'forward' | 'backward' | 'none';

export type ScrollDirection = ScrollProgressDirection;

export interface ScrollProgressState {
    readonly progress: number;
    readonly progressDirection: ScrollProgressDirection;
    readonly scrollDirection: ScrollDirection;

    /**
     * True when the target intersects the effective observation area.
     *
     * The observation area is defined by the configured root and rootMargin.
     * This value is independent from the progress range defined by start and end.
     *
     * This reflects IntersectionObserverEntry.isIntersecting.
     */
    readonly isInObservationArea: boolean;

    /**
     * True when the root visibility gate is satisfied.
     *
     * When requireRootVisible is false, root visibility is not observed
     * and this value is always true.
     *
     * When requireRootVisible is true and root is a custom Element,
     * this reflects whether the root intersects the document viewport.
     *
     * Always true for viewport/document-based tracking.
     */
    readonly isRootVisible: boolean;

    /**
     * Resolved tracking state used by onEnter/onLeave.
     *
     * If requireRootVisible is false:
     * isTracking === isInObservationArea
     *
     * If requireRootVisible is true:
     * isTracking === isInObservationArea && isRootVisible
     */
    readonly isTracking: boolean;

    readonly intersectionRatio: number;
}

export interface TrackScrollProgressOptions extends Partial<ScrollProgressRange> {
    axis?: ScrollProgressAxis;
    root?: ScrollProgressRoot;
    rootMargin?: ScrollProgressRootMargin;
    observerThreshold?: ScrollProgressObserverThreshold;
    inverted?: boolean;

    /**
     * When true, active tracking requires the custom root to be visible
     * in the document viewport.
     *
     * This affects isTracking, onEnter/onLeave, and once completion.
     *
     * Defaults to false to preserve native target/root tracking semantics.
     */
    requireRootVisible?: boolean;

    /**
     * Automatically stops tracking after the first completed progress cycle.
     *
     * The tracker must enter active tracking at least once before completion
     * can happen.
     *
     * Completion happens when progress reaches:
     * - 1 when inverted is false
     * - 0 when inverted is true
     *
     * The final onUpdate callback is emitted before the tracker cleans up.
     *
     * Defaults to false.
     */
    once?: boolean;

    /**
     * Writes the current progress value to a CSS custom property on the
     * tracked element.
     *
     * The variable is scoped to the target element and inherited by its
     * descendants. It is not written globally.
     *
     * Example:
     * cssVar: '--scroll-progress'
     *
     * Pass null in update() to remove the current CSS variable binding.
     */
    cssVar?: ScrollProgressCssVar | null;

    onUpdate?: (state: ScrollProgressState) => void;
    onEnter?: (state: ScrollProgressState) => void;
    onLeave?: (state: ScrollProgressState) => void;
}

export interface TrackScrollProgressConfig extends ScrollProgressRange {
    axis: ScrollProgressAxis;
    root: ScrollProgressRoot;
    rootMargin: ScrollProgressRootMargin;
    observerThreshold: ScrollProgressObserverThreshold;
    requireRootVisible: boolean;
    inverted: boolean;
    once: boolean;
    cssVar: ScrollProgressCssVar | null;
}

export interface ScrollProgressTracker {
    subscribe: (subscriber: ScrollProgressStateSubscriber) => ScrollProgressUnsubscribe;
    onDestroy: (callback: ScrollProgressDestroyCallback) => ScrollProgressUnsubscribe;
    getState: () => ScrollProgressState | null;
    getElement: () => HTMLElement;
    getConfig: () => TrackScrollProgressConfig;
    update: (options: Partial<TrackScrollProgressOptions>) => void;
    destroy: () => void;
}

export type ScrollProgressObserverThreshold = number | number[];

export type ScrollProgressRootMargin = string;

export type ScrollProgressCssVar = string;

export type ScrollProgressStateSubscriber = (state: ScrollProgressState) => void;

export type ScrollProgressUnsubscribe = () => void;

export type ScrollProgressDestroyCallback = () => void;
