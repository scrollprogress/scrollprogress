// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { trackScrollProgress } from '../../lib/track-scroll-progress';
import type { ScrollProgressTracker } from '../../lib/types';

import {
    createElementWithRect,
    resetScrollProgressTestMocks,
    setupScrollProgressTestMocks
} from '../helpers/scroll-progress-test-utils';

let tracker: ScrollProgressTracker | undefined;

beforeEach(() => {
    setupScrollProgressTestMocks();
});

afterEach(() => {
    tracker?.destroy();
    tracker = undefined;

    resetScrollProgressTestMocks();
});

describe('trackScrollProgress getConfig', () => {
    it('returns the resolved default config', () => {
        const element = createElementWithRect();

        tracker = trackScrollProgress(element);

        expect(tracker.getConfig()).toEqual({
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
        });
    });

    it('returns the resolved custom config', () => {
        const element = createElementWithRect();
        const root = createElementWithRect({
            top: 0,
            height: 500,
            width: 800
        });

        tracker = trackScrollProgress(element, {
            start: 0.75,
            end: 0.35,
            axis: 'x',
            root,
            rootMargin: '10px 20px',
            observerThreshold: [0, 0.5, 1],
            requireRootVisible: true,
            inverted: true,
            once: true,
            cssVar: '--scroll-progress'
        });

        expect(tracker.getConfig()).toEqual({
            start: 0.75,
            end: 0.35,
            axis: 'x',
            root,
            rootMargin: '10px 20px',
            observerThreshold: [0, 0.5, 1],
            requireRootVisible: true,
            inverted: true,
            once: true,
            cssVar: '--scroll-progress'
        });
    });

    it('returns the updated config after runtime updates', () => {
        const element = createElementWithRect();

        tracker = trackScrollProgress(element, {
            start: 0.8,
            end: 0.4
        });

        tracker.update({
            start: 0.7,
            end: 0.3,
            axis: 'x',
            rootMargin: '20px',
            observerThreshold: 0.5,
            requireRootVisible: true,
            inverted: true,
            once: true,
            cssVar: '--updated-scroll-progress'
        });

        expect(tracker.getConfig()).toEqual({
            start: 0.7,
            end: 0.3,
            axis: 'x',
            root: null,
            rootMargin: '20px',
            observerThreshold: 0.5,
            requireRootVisible: true,
            inverted: true,
            once: true,
            cssVar: '--updated-scroll-progress'
        });
    });

    it('preserves the current config values when update receives partial options', () => {
        const element = createElementWithRect();

        tracker = trackScrollProgress(element, {
            start: 0.75,
            end: 0.35,
            axis: 'x',
            rootMargin: '10px',
            observerThreshold: [0, 1],
            inverted: true,
            once: true,
            cssVar: '--scroll-progress'
        });

        tracker.update({
            start: 0.7
        });

        expect(tracker.getConfig()).toEqual({
            start: 0.7,
            end: 0.35,
            axis: 'x',
            root: null,
            rootMargin: '10px',
            observerThreshold: [0, 1],
            requireRootVisible: false,
            inverted: true,
            once: true,
            cssVar: '--scroll-progress'
        });
    });

    it('returns a defensive copy of observerThreshold arrays', () => {
        const element = createElementWithRect();

        tracker = trackScrollProgress(element, {
            observerThreshold: [0, 0.5, 1]
        });

        const config = tracker.getConfig();

        if (!Array.isArray(config.observerThreshold)) {
            throw new Error('Expected observerThreshold to be an array');
        }

        config.observerThreshold.push(999);

        expect(tracker.getConfig().observerThreshold).toEqual([0, 0.5, 1]);
    });
});
