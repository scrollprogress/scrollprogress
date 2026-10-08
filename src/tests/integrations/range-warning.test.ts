// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { trackScrollProgress } from '../../lib/track-scroll-progress';
import type { ScrollProgressTracker, TrackScrollProgressConfig } from '../../lib/types';

import {
    createElementWithRect,
    resetScrollProgressTestMocks,
    setupScrollProgressTestMocks
} from '../helpers/scroll-progress-test-utils';

const trackers: ScrollProgressTracker[] = [];

beforeEach(() => {
    setupScrollProgressTestMocks();
});

afterEach(() => {
    for (const tracker of trackers) {
        tracker.destroy();
    }

    trackers.length = 0;
    resetScrollProgressTestMocks();
});

describe('trackScrollProgress range warnings', () => {
    it('warns independently for trackers with the same range', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        const firstElement = createElementWithRect();
        const secondElement = createElementWithRect();
        const options = { start: 0, end: 1 };

        trackers.push(trackScrollProgress(firstElement, options));
        trackers.push(trackScrollProgress(secondElement, options));

        expect(warn).toHaveBeenCalledTimes(2);

        expect(warn).toHaveBeenNthCalledWith(
            1,
            expect.stringContaining('start <= end'),
            firstElement,
            expect.objectContaining(options)
        );

        expect(warn).toHaveBeenNthCalledWith(
            2,
            expect.stringContaining('start <= end'),
            secondElement,
            expect.objectContaining(options)
        );
    });

    it('warns on the first unusual update and does not repeat the warning', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        const element = createElementWithRect();
        const tracker = trackScrollProgress(element);

        trackers.push(tracker);

        expect(warn).not.toHaveBeenCalled();

        tracker.update({ start: 0.5, end: 0.5 });

        expect(warn).toHaveBeenCalledExactlyOnceWith(
            expect.stringContaining('start <= end'),
            element,
            expect.objectContaining({ start: 0.5, end: 0.5 })
        );

        tracker.update({ start: 0.5, end: 0.5 });
        tracker.update({ start: 0, end: 1 });
        tracker.update({ start: -1, end: 2 });
        tracker.update({ start: 0.8, end: 0.4 });
        tracker.update({ start: 0, end: 1 });

        expect(warn).toHaveBeenCalledTimes(1);
    });

    it('logs a configuration snapshot that cannot change the tracker config', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        const element = createElementWithRect();

        const tracker = trackScrollProgress(element, {
            start: 0,
            end: 1,
            observerThreshold: [0, 0.5, 1]
        });

        trackers.push(tracker);

        expect(warn).toHaveBeenCalledTimes(1);

        const loggedConfig = warn.mock.calls[0][2] as TrackScrollProgressConfig;

        tracker.update({ start: -1, end: 2 });

        expect(loggedConfig).toMatchObject({
            start: 0,
            end: 1,
            observerThreshold: [0, 0.5, 1]
        });

        loggedConfig.start = 99;

        if (!Array.isArray(loggedConfig.observerThreshold)) {
            throw new Error('Expected observerThreshold to be an array');
        }

        loggedConfig.observerThreshold.push(0.75);

        expect(tracker.getConfig()).toMatchObject({
            start: -1,
            end: 2,
            observerThreshold: [0, 0.5, 1]
        });
    });

    it('warns again when a tracker is recreated on the same element', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        const element = createElementWithRect();
        const options = { start: 0, end: 1 };

        const firstTracker = trackScrollProgress(element, options);

        trackers.push(firstTracker);
        firstTracker.destroy();

        trackers.push(trackScrollProgress(element, options));

        expect(warn).toHaveBeenCalledTimes(2);
    });
});
