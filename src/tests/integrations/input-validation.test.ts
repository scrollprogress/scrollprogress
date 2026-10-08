// @vitest-environment happy-dom

import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { trackScrollProgress } from '../../lib/track-scroll-progress';
import type { TrackScrollProgressOptions } from '../../lib/types';
import {
    createElementWithRect,
    getIntersectionObserverInstances,
    getLatestIntersectionObserver,
    resetScrollProgressTestMocks,
    runAnimationFrame,
    setupScrollProgressTestMocks
} from '../helpers/scroll-progress-test-utils';

beforeEach(() => setupScrollProgressTestMocks());
afterEach(resetScrollProgressTestMocks);

it.each<TrackScrollProgressOptions>([
    { start: NaN },
    { end: Infinity },
    { start: -Infinity },
    { cssVar: 'opacity' },
    { cssVar: '--' },
    { axis: 'z' as 'x' }
])('rejects invalid config before installing or modifying resources: %j', (options) => {
    const element = createElementWithRect();
    expect(() => trackScrollProgress(element, options)).toThrow();
    expect(getIntersectionObserverInstances()).toHaveLength(0);
    const tracker = trackScrollProgress(element);
    try {
        const before = tracker.getConfig();
        expect(() => tracker.update(options)).toThrow();
        expect(tracker.getConfig()).toEqual(before);
        getLatestIntersectionObserver().trigger(true);
        runAnimationFrame();
        expect(tracker.getState()?.isTracking).toBe(true);
    } finally {
        tracker.destroy();
    }
});

it('accepts finite range values outside zero to one', () => {
    const tracker = trackScrollProgress(createElementWithRect(), { start: 1.5, end: -0.5 });
    expect(tracker.getState()?.progress).toBeGreaterThanOrEqual(0);
    expect(tracker.getState()?.progress).toBeLessThanOrEqual(1);
    tracker.destroy();
});

it('rejects foreign documents and adopted targets instead of silently using global geometry', () => {
    const foreign = document.implementation.createHTMLDocument();
    expect(() => trackScrollProgress(foreign.createElement('div'))).toThrow(TypeError);
    expect(() => trackScrollProgress(createElementWithRect(), { root: foreign })).toThrow(
        TypeError
    );
    expect(() => trackScrollProgress(createElementWithRect(), { root: foreign.body })).toThrow(
        TypeError
    );
    expect(getIntersectionObserverInstances()).toHaveLength(0);
});

it('fails without IntersectionObserver or requestAnimationFrame and does not install resources', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    expect(() => trackScrollProgress(createElementWithRect())).toThrow();
    vi.spyOn(window, 'requestAnimationFrame').mockRestore();
    vi.stubGlobal('requestAnimationFrame', undefined);
    expect(() => trackScrollProgress(createElementWithRect())).toThrow(
        /requires requestAnimationFrame/
    );
    expect(getIntersectionObserverInstances()).toHaveLength(0);
});
