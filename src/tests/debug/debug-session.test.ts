// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createScrollProgressDebugger } from '../../lib/debug/session/session';
import {
    getScrollProgressDebugRegistryState,
    resetScrollProgressDebugRegistry
} from '../../lib/debug/registry';
import { trackScrollProgress } from '../../lib/track-scroll-progress';
import type { ScrollProgressTracker } from '../../lib/types';

import {
    createElementWithRect,
    getLatestIntersectionObserver,
    resetScrollProgressTestMocks,
    runAnimationFrame,
    setWindowValue,
    setupScrollProgressTestMocks
} from '../helpers/scroll-progress-test-utils';

const trackers: ScrollProgressTracker[] = [];
const sessions: Array<{ destroy: () => void }> = [];

function createTracker(): ScrollProgressTracker {
    const tracker = trackScrollProgress(createElementWithRect());
    trackers.push(tracker);
    return tracker;
}

function getPaletteText(): string {
    return (
        document.querySelector('[data-scroll-progress-debug-palette-content="true"]')
            ?.textContent ?? ''
    );
}

beforeEach(() => {
    setupScrollProgressTestMocks();
});

afterEach(() => {
    for (const session of sessions.splice(0).reverse()) {
        session.destroy();
    }

    for (const tracker of trackers.splice(0).reverse()) {
        tracker.destroy();
    }

    resetScrollProgressDebugRegistry();
    resetScrollProgressTestMocks();
    document.body.innerHTML = '';
});

describe('createScrollProgressDebugger', () => {
    it('supports the single-tracker overload and only creates enabled tools', () => {
        const tracker = createTracker();
        const debug = createScrollProgressDebugger(tracker, {
            debugId: 'story',
            label: 'Story',
            palette: true,
            overlay: false,
            console: false
        });
        sessions.push(debug);

        expect(getScrollProgressDebugRegistryState().items).toEqual([
            expect.objectContaining({
                debugId: 'story',
                label: 'Story'
            })
        ]);
        expect(
            document.querySelector('[data-scroll-progress-debug-palette="true"]')
        ).not.toBeNull();
        expect(document.querySelector('.scroll-progress-debug-overlay')).toBeNull();
    });

    it('registers initial trackers and forwards native tool options', () => {
        const table = vi.spyOn(console, 'table').mockImplementation(() => undefined);
        const storyTracker = createTracker();
        const chapterTracker = createTracker();
        const debug = createScrollProgressDebugger({
            trackers: [
                { tracker: storyTracker, label: 'Story' },
                { tracker: chapterTracker, label: 'Chapter' }
            ],
            palette: {
                theme: 'paper',
                className: 'session-palette'
            },
            overlay: {
                theme: 'paper',
                className: 'session-overlay',
                visibleLayers: ['root']
            },
            console: {
                throttleMs: 100
            }
        });
        sessions.push(debug);

        expect(getScrollProgressDebugRegistryState().items.map((item) => item.label)).toEqual([
            'Story',
            'Chapter'
        ]);

        const palette = document.querySelector<HTMLElement>('.session-palette');
        const overlay = document.querySelector<HTMLElement>('.session-overlay');

        expect(palette?.dataset.scrollProgressDebugTheme).toBe('paper');
        expect(overlay?.dataset.scrollProgressDebugTheme).toBe('paper');
        expect(overlay?.querySelector('.spdo-layer-root')).not.toBeNull();
        expect(table).toHaveBeenCalledTimes(1);
    });

    it('supports empty sessions and selectively destroys dynamic registrations', () => {
        const debug = createScrollProgressDebugger({
            trackers: [],
            palette: false
        });
        sessions.push(debug);

        const storyDebug = debug.addTracker(createTracker(), { label: 'Story' });
        debug.addTracker(createTracker(), { label: 'Chapter' });

        expect(getScrollProgressDebugRegistryState().items.map((item) => item.label)).toEqual([
            'Story',
            'Chapter'
        ]);

        storyDebug.detach();
        storyDebug.detach();

        expect(getScrollProgressDebugRegistryState().items.map((item) => item.label)).toEqual([
            'Chapter'
        ]);
    });

    it('detaches a registration from the palette without destroying its tracker', () => {
        const tracker = createTracker();
        const onTrackerDestroy = vi.fn();
        tracker.onDestroy(onTrackerDestroy);

        const debug = createScrollProgressDebugger({
            palette: true
        });
        sessions.push(debug);

        const registration = debug.addTracker(tracker, { label: 'Detachable story' });

        runAnimationFrame();
        expect(getPaletteText()).toContain('Detachable story');

        registration.detach();
        runAnimationFrame();

        expect(getPaletteText()).not.toContain('Detachable story');
        expect(getScrollProgressDebugRegistryState().items).toEqual([]);
        expect(onTrackerDestroy).not.toHaveBeenCalled();
    });

    it('rejects a duplicate dynamic tracker registration', () => {
        const tracker = createTracker();
        const debug = createScrollProgressDebugger();
        sessions.push(debug);

        const firstRegistration = debug.addTracker(tracker, { label: 'First view' });

        expect(() => debug.addTracker(tracker, { label: 'Second view' })).toThrow(
            'Tracker is already attached to this scrollprogress debugger'
        );
        expect(getScrollProgressDebugRegistryState().items.map((item) => item.label)).toEqual([
            'First view'
        ]);

        firstRegistration.detach();

        expect(() => debug.addTracker(tracker, { label: 'Attached again' })).not.toThrow();
    });

    it('rejects duplicate initial trackers and rolls back the session', () => {
        const tracker = createTracker();

        expect(() =>
            createScrollProgressDebugger({
                trackers: [
                    { tracker, label: 'First view' },
                    { tracker, label: 'Second view' }
                ],
                palette: true
            })
        ).toThrow('Tracker is already attached to this scrollprogress debugger');

        expect(getScrollProgressDebugRegistryState().items).toEqual([]);
        expect(document.querySelector('[data-scroll-progress-debug-palette="true"]')).toBeNull();
    });

    it('destroys owned tools and bridges without destroying application trackers', () => {
        const tracker = createTracker();
        const onTrackerDestroy = vi.fn();
        tracker.onDestroy(onTrackerDestroy);

        const debug = createScrollProgressDebugger(tracker, {
            palette: true,
            overlay: true,
            console: true
        });

        debug.destroy();
        debug.destroy();

        expect(getScrollProgressDebugRegistryState().items).toEqual([]);
        expect(document.querySelector('[data-scroll-progress-debug-palette="true"]')).toBeNull();
        expect(document.querySelector('.scroll-progress-debug-overlay')).toBeNull();
        expect(onTrackerDestroy).not.toHaveBeenCalled();
        expect(() => debug.addTracker(createTracker())).toThrow(
            'Cannot add a tracker to a destroyed scrollprogress debugger'
        );
    });

    it('automatically removes a destroyed tracker from the palette', () => {
        const tracker = createTracker();
        const debug = createScrollProgressDebugger(tracker, {
            label: 'Destroyed story',
            palette: true
        });
        sessions.push(debug);

        runAnimationFrame();
        expect(getPaletteText()).toContain('Destroyed story');

        tracker.destroy();
        runAnimationFrame();

        expect(getScrollProgressDebugRegistryState().items).toEqual([]);
        expect(getPaletteText()).not.toContain('Destroyed story');
        expect(() => debug.destroy()).not.toThrow();
    });

    it('preserves completed once snapshots until the registration is destroyed', () => {
        setWindowValue('innerHeight', 1000);

        const tracker = trackScrollProgress(
            createElementWithRect({
                top: 100,
                height: 300
            }),
            {
                once: true
            }
        );
        trackers.push(tracker);

        const debug = createScrollProgressDebugger(tracker, { label: 'Once story' });
        sessions.push(debug);

        getLatestIntersectionObserver().trigger(true);
        runAnimationFrame();

        expect(getScrollProgressDebugRegistryState().items[0]).toMatchObject({
            label: 'Once story',
            completed: true,
            state: {
                progress: 1
            }
        });

        debug.destroy();

        expect(getScrollProgressDebugRegistryState().items).toEqual([]);
    });

    it('rolls back trackers and previously created tools when construction fails', () => {
        const tracker = createTracker();

        expect(() =>
            createScrollProgressDebugger(tracker, {
                palette: true,
                overlay: true,
                console: {
                    throttleMs: -1
                }
            })
        ).toThrow(RangeError);

        expect(getScrollProgressDebugRegistryState().items).toEqual([]);
        expect(document.querySelector('[data-scroll-progress-debug-palette="true"]')).toBeNull();
        expect(document.querySelector('.scroll-progress-debug-overlay')).toBeNull();
    });
});
