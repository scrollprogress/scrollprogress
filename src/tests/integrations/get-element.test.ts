// @vitest-environment happy-dom

import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import { trackScrollProgress } from '../../lib/track-scroll-progress';

import {
    createElementWithRect,
    resetScrollProgressTestMocks,
    setupScrollProgressTestMocks
} from '../helpers/scroll-progress-test-utils';

import type { ScrollProgressTracker } from '../../lib/types';

let tracker: ScrollProgressTracker | undefined;

beforeEach(() => {
    setupScrollProgressTestMocks();
});

afterEach(() => {
    tracker?.destroy();
    tracker = undefined;

    resetScrollProgressTestMocks();
});

describe('trackScrollProgress getElement', () => {
    it('returns the tracked element', () => {
        const element = createElementWithRect({
            top: 100,
            height: 300
        });

        tracker = trackScrollProgress(element);

        expect(tracker.getElement()).toBe(element);
    });

    it('keeps returning the same tracked element after runtime updates', () => {
        const element = createElementWithRect({
            top: 100,
            height: 300
        });

        tracker = trackScrollProgress(element, {
            start: 0.8,
            end: 0.4
        });

        tracker.update({
            start: 0.7,
            end: 0.3,
            axis: 'y'
        });

        expect(tracker.getElement()).toBe(element);
    });
});
