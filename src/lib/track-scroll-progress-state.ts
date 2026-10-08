import { getScrollProgressDirection } from './core.js';
import type { ScrollProgressState } from './types.js';

export interface CreateScrollProgressStateInput {
    rawProgress: number;
    scrollPosition: number;
    previousProgress: number | null;
    previousScrollPosition: number | null;
    isInObservationArea: boolean;
    intersectionRatio: number;
    isRootVisible: boolean;
    inverted: boolean;
    requireRootVisible: boolean;
}

export function createScrollProgressState({
    rawProgress,
    scrollPosition,
    previousProgress,
    previousScrollPosition,
    isInObservationArea,
    intersectionRatio,
    isRootVisible,
    inverted,
    requireRootVisible
}: CreateScrollProgressStateInput): ScrollProgressState {
    const progress = inverted ? 1 - rawProgress : rawProgress;

    const progressDirection = getScrollProgressDirection(previousProgress, progress);
    const scrollDirection = getScrollProgressDirection(previousScrollPosition, scrollPosition);

    const isTracking = resolveIsTracking(isInObservationArea, isRootVisible, requireRootVisible);

    return {
        progress,
        progressDirection,
        scrollDirection,
        isInObservationArea,
        intersectionRatio,
        isRootVisible,
        isTracking
    };
}

export function shouldSkipStateUpdate(
    previousState: ScrollProgressState | null,
    state: ScrollProgressState
) {
    return (
        previousState !== null &&
        previousState.progress === state.progress &&
        previousState.progressDirection === state.progressDirection &&
        previousState.scrollDirection === state.scrollDirection &&
        previousState.isInObservationArea === state.isInObservationArea &&
        previousState.intersectionRatio === state.intersectionRatio &&
        previousState.isRootVisible === state.isRootVisible &&
        previousState.isTracking === state.isTracking
    );
}

export function resolveIsTracking(
    isInObservationArea: boolean,
    isRootVisible: boolean,
    requireRootVisible: boolean
): boolean {
    return requireRootVisible ? isInObservationArea && isRootVisible : isInObservationArea;
}

export function shouldCompleteOnceTracking(
    state: ScrollProgressState,
    once: boolean,
    inverted: boolean,
    hasEnteredTracking: boolean
): boolean {
    if (!once || !hasEnteredTracking) {
        return false;
    }

    return inverted ? state.progress <= 0 : state.progress >= 1;
}
