// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createScrollProgressDebugger } from '../../lib/debug/session/session';
import * as paletteModule from '../../lib/debug/palette/palette';
import * as overlayModule from '../../lib/debug/overlay/overlay';
import * as consoleModule from '../../lib/debug/console/console-logger';
import {
    getScrollProgressDebugRegistryState,
    resetScrollProgressDebugRegistry,
    subscribeScrollProgressDebugRegistry
} from '../../lib/debug/registry';
import { createDebugTrackerMock } from '../helpers/debug-tracker-test-utils';
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

describe('debugger terminal ownership', () => {
    it('preserves ordinary duplicate rejection while repeatedly releasing live handles', () => {
        const debug = createScrollProgressDebugger();
        sessions.push(debug);
        for (let index = 0; index < 200; index++) {
            const mock = createDebugTrackerMock();
            const registration = debug.addTracker(mock.tracker);
            mock.tracker.destroy();
            expect(mock.tracker.onDestroy).toHaveBeenCalledOnce();
            expect(mock.stateUnsubscribe).toHaveBeenCalledOnce();
            expect(mock.destroyUnsubscribe).toHaveBeenCalledOnce();
            expect(() => debug.addTracker(mock.tracker)).toThrow('already attached');
            registration.detach();
            const next = debug.addTracker(mock.tracker);
            registration.detach();
            expect(() => debug.addTracker(mock.tracker)).toThrow('already attached');
            next.detach();
        }
        expect(getScrollProgressDebugRegistryState().items).toEqual([]);
    });

    it.each([false, true])(
        'keeps once ownership without live handles (inverted=%s)',
        (inverted) => {
            const mock = createDebugTrackerMock();
            const debug = createScrollProgressDebugger();
            sessions.push(debug);
            const registration = debug.addTracker(mock.tracker);
            mock.completeOnce(inverted);
            expect(mock.tracker.onDestroy).toHaveBeenCalledOnce();
            expect(() => debug.addTracker(mock.tracker)).toThrow('already attached');
            expect(getScrollProgressDebugRegistryState().items[0]).toMatchObject({
                completed: true,
                state: { progress: inverted ? 0 : 1 }
            });
            registration.detach();
            const next = debug.addTracker(mock.tracker);
            const id = getScrollProgressDebugRegistryState().items[0].id;
            registration.detach();
            expect(getScrollProgressDebugRegistryState().items[0].id).toBe(id);
            next.detach();
            debug.addTracker(mock.tracker);
            debug.destroy();
            expect(getScrollProgressDebugRegistryState().items).toEqual([]);
        }
    );

    it.each([false, true])('owns initial already-terminal registrations (once=%s)', (once) => {
        const mock = createDebugTrackerMock();
        if (once) mock.completeOnce();
        else mock.tracker.destroy();
        const debug = createScrollProgressDebugger(mock.tracker);
        sessions.push(debug);
        expect(() => debug.addTracker(mock.tracker)).toThrow('already attached');
        expect(getScrollProgressDebugRegistryState().items).toHaveLength(once ? 1 : 0);
        debug.destroy();
        expect(getScrollProgressDebugRegistryState().items).toEqual([]);
        expect(() =>
            createScrollProgressDebugger({
                trackers: [{ tracker: mock.tracker }, { tracker: mock.tracker }]
            })
        ).toThrow('already attached');
        expect(getScrollProgressDebugRegistryState().items).toEqual([]);
    });

    it('reserves duplicate ownership before synchronous registry notifications', () => {
        const mock = createDebugTrackerMock();
        const debug = createScrollProgressDebugger();
        sessions.push(debug);
        let duplicateError: unknown;
        let attempted = false;
        const unsubscribe = subscribeScrollProgressDebugRegistry((state) => {
            if (!state.items.length || attempted) return;
            attempted = true;
            try {
                debug.addTracker(mock.tracker);
            } catch (error) {
                duplicateError = error;
            }
        });
        try {
            debug.addTracker(mock.tracker);
            expect(duplicateError).toEqual(
                expect.objectContaining({ message: expect.stringContaining('already attached') })
            );
            expect(getScrollProgressDebugRegistryState().items).toHaveLength(1);
        } finally {
            unsubscribe();
        }
    });

    it('returns an inert handle when a runtime addition synchronously destroys its session', () => {
        const mock = createDebugTrackerMock();
        const debug = createScrollProgressDebugger();
        sessions.push(debug);
        const unsubscribe = subscribeScrollProgressDebugRegistry((state) => {
            if (state.items.length) debug.destroy();
        });
        try {
            const registration = debug.addTracker(mock.tracker);
            expect(getScrollProgressDebugRegistryState().items).toEqual([]);
            expect(mock.stateUnsubscribe).toHaveBeenCalledOnce();
            expect(mock.destroyUnsubscribe).toHaveBeenCalledOnce();
            expect(mock.tracker.destroy).not.toHaveBeenCalled();
            expect(() => registration.detach()).not.toThrow();
            expect(() => debug.addTracker(mock.tracker)).toThrow('destroyed');
        } finally {
            unsubscribe();
        }
    });

    it('rolls back a failed dynamic addition without affecting existing registrations', () => {
        const debug = createScrollProgressDebugger();
        sessions.push(debug);
        debug.addTracker(createDebugTrackerMock().tracker, { label: 'Existing' });
        const mock = createDebugTrackerMock();
        const error = new Error('dynamic subscribe failed');
        mock.tracker.subscribe.mockImplementationOnce(() => {
            throw error;
        });
        expect(() => debug.addTracker(mock.tracker)).toThrow(error);
        expect(getScrollProgressDebugRegistryState().items.map((item) => item.label)).toEqual([
            'Existing'
        ]);
        expect(() => debug.addTracker(mock.tracker)).not.toThrow();
    });

    it.each([undefined, null, 0, new Error('first cleanup')])(
        'attempts all cleanup and preserves the first thrown value (%s)',
        (first) => {
            const calls: string[] = [];
            const paletteDestroy = vi.fn(() => {
                calls.push('palette');
            });
            const overlayDestroy = vi.fn(() => {
                calls.push('overlay');
                throw new Error('later cleanup');
            });
            const consoleDestroy = vi.fn(() => {
                calls.push('console');
                throw first;
            });
            vi.spyOn(paletteModule, 'createDebugPalette').mockReturnValue({
                destroy: paletteDestroy
            });
            vi.spyOn(overlayModule, 'createDebugOverlay').mockReturnValue({
                destroy: overlayDestroy,
                getLayerVisibilityState: vi.fn(),
                setLayerVisible: vi.fn(),
                toggleLayerVisible: vi.fn()
            });
            vi.spyOn(consoleModule, 'createDebugConsoleLogger').mockReturnValue({
                destroy: consoleDestroy
            });
            const mock = createDebugTrackerMock();
            const debug = createScrollProgressDebugger(mock.tracker, {
                palette: true,
                overlay: true,
                console: true
            });
            sessions.push(debug);
            let threw = false;
            let received: unknown;
            try {
                debug.destroy();
            } catch (error) {
                threw = true;
                received = error;
            }
            expect(threw).toBe(true);
            expect(received).toBe(first);
            expect(calls).toEqual(['console', 'overlay', 'palette']);
            expect(mock.stateUnsubscribe).toHaveBeenCalledOnce();
            expect(getScrollProgressDebugRegistryState().items).toEqual([]);
            expect(() => debug.destroy()).not.toThrow();
            expect(mock.tracker.destroy).not.toHaveBeenCalled();
        }
    );

    it('preserves the initiating construction error even when rollback fails', () => {
        const error = new Error('tool construction failed');
        const destroy = vi.fn(() => {
            throw new Error('rollback failed');
        });
        vi.spyOn(paletteModule, 'createDebugPalette').mockReturnValue({ destroy });
        vi.spyOn(overlayModule, 'createDebugOverlay').mockImplementationOnce(() => {
            throw error;
        });
        const mock = createDebugTrackerMock();
        expect(() =>
            createScrollProgressDebugger(mock.tracker, { palette: true, overlay: true })
        ).toThrow(error);
        expect(destroy).toHaveBeenCalledOnce();
        expect(mock.stateUnsubscribe).toHaveBeenCalledOnce();
        expect(getScrollProgressDebugRegistryState().items).toEqual([]);
    });

    it('keeps a failed once publication removable by its owning session', () => {
        const mock = createDebugTrackerMock();
        const debug = createScrollProgressDebugger(mock.tracker);
        sessions.push(debug);
        const error = new Error('final config failed');
        mock.tracker.getConfig.mockImplementationOnce(() => {
            throw error;
        });
        expect(() => mock.completeOnce()).toThrow(error);
        expect(mock.stateUnsubscribe).toHaveBeenCalledOnce();
        debug.destroy();
        expect(getScrollProgressDebugRegistryState().items).toEqual([]);
    });

    it('releases other bridges after one bridge cleanup fails', () => {
        const first = createDebugTrackerMock();
        const second = createDebugTrackerMock();
        const debug = createScrollProgressDebugger();
        sessions.push(debug);
        const old = debug.addTracker(first.tracker);
        debug.addTracker(second.tracker);
        const error = new Error('first bridge failed');
        first.stateUnsubscribe.mockImplementationOnce(() => {
            throw error;
        });
        expect(() => debug.destroy()).toThrow(error);
        expect(second.stateUnsubscribe).toHaveBeenCalledOnce();
        expect(first.destroyUnsubscribe).toHaveBeenCalledOnce();
        expect(getScrollProgressDebugRegistryState().items).toEqual([]);
        expect(() => old.detach()).not.toThrow();
        expect(() => debug.destroy()).not.toThrow();
    });

    it('preserves independent tools and application trackers across session destruction', () => {
        const tracker = createTracker();
        const onDestroy = vi.fn();
        tracker.onDestroy(onDestroy);
        const independent = paletteModule.createDebugPalette({ className: 'independent-palette' });
        const debug = createScrollProgressDebugger(tracker, {
            palette: { className: 'owned-palette' }
        });
        sessions.push(debug);
        try {
            debug.destroy();
            expect(document.querySelector('.owned-palette')).toBeNull();
            expect(document.querySelector('.independent-palette')).not.toBeNull();
            expect(onDestroy).not.toHaveBeenCalled();
        } finally {
            independent.destroy();
        }
    });
});
