import { describe, expect, it } from 'vitest';

import {
    type CreateScrollProgressStateInput,
    createScrollProgressState,
    resolveIsTracking,
    shouldCompleteOnceTracking,
    shouldSkipStateUpdate
} from '../../lib/track-scroll-progress-state';

function createStateInput(
    overrides: Partial<CreateScrollProgressStateInput> = {}
): CreateScrollProgressStateInput {
    return {
        rawProgress: 0.5,
        scrollPosition: 100,
        previousProgress: null,
        previousScrollPosition: null,
        isInObservationArea: true,
        intersectionRatio: 0.75,
        isRootVisible: true,
        inverted: false,
        requireRootVisible: false,
        ...overrides
    };
}

describe('track scroll progress state', () => {
    it('creates a scroll progress state from raw progress data', () => {
        const state = createScrollProgressState(createStateInput());

        expect(state).toEqual({
            progress: 0.5,
            progressDirection: 'none',
            scrollDirection: 'none',
            isInObservationArea: true,
            intersectionRatio: 0.75,
            isRootVisible: true,
            isTracking: true
        });
    });

    it('detects forward progress and scroll direction', () => {
        const state = createScrollProgressState(
            createStateInput({
                rawProgress: 0.6,
                scrollPosition: 120,
                previousProgress: 0.4,
                previousScrollPosition: 100
            })
        );

        expect(state.progressDirection).toBe('forward');
        expect(state.scrollDirection).toBe('forward');
    });

    it('detects backward progress and scroll direction', () => {
        const state = createScrollProgressState(
            createStateInput({
                rawProgress: 0.3,
                scrollPosition: 80,
                previousProgress: 0.5,
                previousScrollPosition: 100
            })
        );

        expect(state.progressDirection).toBe('backward');
        expect(state.scrollDirection).toBe('backward');
    });

    it('inverts progress when inverted is true', () => {
        const state = createScrollProgressState(
            createStateInput({
                rawProgress: 0.25,
                inverted: true
            })
        );

        expect(state.progress).toBe(0.75);
    });

    it('resolves tracking without requiring root visibility', () => {
        expect(resolveIsTracking(true, false, false)).toBe(true);
        expect(resolveIsTracking(false, true, false)).toBe(false);
    });

    it('resolves tracking requiring root visibility', () => {
        expect(resolveIsTracking(true, true, true)).toBe(true);
        expect(resolveIsTracking(true, false, true)).toBe(false);
        expect(resolveIsTracking(false, true, true)).toBe(false);
    });

    it('skips state updates when the state did not change', () => {
        const previousState = createScrollProgressState(createStateInput());
        const nextState = createScrollProgressState(createStateInput());

        expect(shouldSkipStateUpdate(previousState, nextState)).toBe(true);
    });

    it('does not skip state updates when the state changed', () => {
        const previousState = createScrollProgressState(
            createStateInput({
                rawProgress: 0.4
            })
        );

        const nextState = createScrollProgressState(
            createStateInput({
                rawProgress: 0.6
            })
        );

        expect(shouldSkipStateUpdate(previousState, nextState)).toBe(false);
    });

    it('does not skip state updates when there is no previous state', () => {
        const nextState = createScrollProgressState(createStateInput());

        expect(shouldSkipStateUpdate(null, nextState)).toBe(false);
    });

    it('does not complete once tracking when once is false', () => {
        const state = createScrollProgressState(
            createStateInput({
                rawProgress: 1
            })
        );

        expect(shouldCompleteOnceTracking(state, false, false, true)).toBe(false);
    });

    it('does not complete once tracking before tracking becomes active', () => {
        const state = createScrollProgressState(
            createStateInput({
                rawProgress: 1
            })
        );

        expect(shouldCompleteOnceTracking(state, true, false, false)).toBe(false);
    });

    it('completes once tracking when progress reaches 1', () => {
        const state = createScrollProgressState(
            createStateInput({
                rawProgress: 1
            })
        );

        expect(shouldCompleteOnceTracking(state, true, false, true)).toBe(true);
    });

    it('completes inverted once tracking when progress reaches 0', () => {
        const state = createScrollProgressState(
            createStateInput({
                rawProgress: 1,
                inverted: true
            })
        );

        expect(shouldCompleteOnceTracking(state, true, true, true)).toBe(true);
    });
});
