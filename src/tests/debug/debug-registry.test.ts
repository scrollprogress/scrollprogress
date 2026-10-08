import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
    getScrollProgressDebugRegistryState,
    registerScrollProgressDebugItem,
    resetScrollProgressDebugRegistry,
    type ScrollProgressDebugItemUpdate,
    selectScrollProgressDebugItem,
    subscribeScrollProgressDebugRegistry,
    unregisterScrollProgressDebugItem,
    updateScrollProgressDebugItem,
    type ScrollProgressDebugItemRegistration
} from '../../lib/debug/registry';

beforeEach(() => {
    resetScrollProgressDebugRegistry();
});

function createDebugRegistration(
    patch: Partial<ScrollProgressDebugItemRegistration> = {}
): ScrollProgressDebugItemRegistration {
    return {
        debugId: 'hero',
        label: 'Hero',
        element: {} as HTMLElement,
        ...patch
    };
}

describe('scroll progress debug registry', () => {
    it('starts with an empty registry state', () => {
        expect(getScrollProgressDebugRegistryState()).toEqual({
            selectedId: null,
            items: []
        });
    });

    it('registers a debug item with an initial state', () => {
        const id = registerScrollProgressDebugItem(createDebugRegistration());

        expect(getScrollProgressDebugRegistryState()).toEqual({
            selectedId: id,
            items: [
                expect.objectContaining({
                    id,
                    debugId: 'hero',
                    label: 'Hero',
                    selected: true,
                    start: 0.8,
                    end: 0.4,
                    axis: 'y',
                    root: null,
                    rootMargin: '0px',
                    observerThreshold: 0,
                    inverted: false,
                    once: false,
                    completed: false,
                    requireRootVisible: false,
                    cssVar: null,
                    state: {
                        progress: 0,
                        progressDirection: 'none',
                        scrollDirection: 'none',
                        isInObservationArea: false,
                        isRootVisible: true,
                        isTracking: false,
                        intersectionRatio: 0
                    }
                })
            ]
        });
    });

    it('registers a debug item with custom tracking config', () => {
        const root = {} as HTMLElement;

        const trackingConfig = {
            start: 0.75,
            end: 0.35,
            axis: 'x',
            root,
            rootMargin: '20px 0px',
            observerThreshold: [0, 0.5, 1],
            inverted: true,
            once: true,
            requireRootVisible: true,
            cssVar: '--scroll-progress'
        } satisfies Partial<ScrollProgressDebugItemRegistration>;

        const id = registerScrollProgressDebugItem(createDebugRegistration(trackingConfig));

        expect(getScrollProgressDebugRegistryState().items[0]).toMatchObject({
            id,
            ...trackingConfig
        });
    });

    it('owns observer threshold arrays provided during registration', () => {
        const observerThreshold = [0, 0.5, 1];

        registerScrollProgressDebugItem(createDebugRegistration({ observerThreshold }));

        observerThreshold[1] = 0.75;

        expect(getScrollProgressDebugRegistryState().items[0].observerThreshold).toEqual([
            0, 0.5, 1
        ]);
    });

    it('registers a debug item with a custom initial state', () => {
        const id = registerScrollProgressDebugItem(
            createDebugRegistration({
                state: {
                    progress: 0.75,
                    progressDirection: 'forward',
                    scrollDirection: 'forward',
                    isInObservationArea: true,
                    isRootVisible: true,
                    isTracking: true,
                    intersectionRatio: 0.5
                }
            })
        );

        expect(getScrollProgressDebugRegistryState().items[0]).toMatchObject({
            id,
            state: {
                progress: 0.75,
                progressDirection: 'forward',
                scrollDirection: 'forward',
                isInObservationArea: true,
                isRootVisible: true,
                isTracking: true,
                intersectionRatio: 0.5
            }
        });
    });

    it('generates a debugId and label when none is provided', () => {
        const element = {} as HTMLElement;

        const id = registerScrollProgressDebugItem({
            element
        });

        const item = getScrollProgressDebugRegistryState().items[0];

        expect(item.id).toBe(id);
        expect(item.debugId).toBe(id);
        expect(item.label).toBe(id);
    });

    it('updates debug item tracking config', () => {
        const id = registerScrollProgressDebugItem(createDebugRegistration());
        const root = {} as HTMLElement;

        const newConfig = {
            start: 0.75,
            end: 0.35,
            axis: 'x',
            root,
            rootMargin: '20px 0px',
            observerThreshold: [0, 0.5, 1],
            inverted: true,
            once: true,
            requireRootVisible: true,
            cssVar: '--scroll-progress'
        } satisfies ScrollProgressDebugItemUpdate;

        updateScrollProgressDebugItem(id, newConfig);

        expect(getScrollProgressDebugRegistryState().items[0]).toMatchObject({
            id,
            ...newConfig
        });
    });

    it('stores and updates completed state independently from tracker state', () => {
        const id = registerScrollProgressDebugItem(
            createDebugRegistration({
                completed: true
            })
        );

        expect(getScrollProgressDebugRegistryState().items[0].completed).toBe(true);

        updateScrollProgressDebugItem(id, {
            completed: false
        });

        expect(getScrollProgressDebugRegistryState().items[0].completed).toBe(false);
    });

    it('owns observer threshold arrays provided during updates', () => {
        const id = registerScrollProgressDebugItem(createDebugRegistration());
        const observerThreshold = [0, 0.25, 1];

        updateScrollProgressDebugItem(id, { observerThreshold });

        observerThreshold[1] = 0.75;

        expect(getScrollProgressDebugRegistryState().items[0].observerThreshold).toEqual([
            0, 0.25, 1
        ]);
    });

    it('updates a registered debug item', () => {
        const id = registerScrollProgressDebugItem(createDebugRegistration());

        updateScrollProgressDebugItem(id, {
            label: 'Updated hero',
            state: {
                progress: 0.75,
                progressDirection: 'forward',
                scrollDirection: 'forward',
                isInObservationArea: true,
                isRootVisible: true,
                isTracking: true,
                intersectionRatio: 0.5
            }
        });

        expect(getScrollProgressDebugRegistryState()).toEqual({
            selectedId: id,
            items: [
                expect.objectContaining({
                    id,
                    debugId: 'hero',
                    label: 'Updated hero',
                    selected: true,
                    state: {
                        progress: 0.75,
                        progressDirection: 'forward',
                        scrollDirection: 'forward',
                        isInObservationArea: true,
                        isRootVisible: true,
                        isTracking: true,
                        intersectionRatio: 0.5
                    }
                })
            ]
        });
    });

    it('unregisters a debug item', () => {
        const id = registerScrollProgressDebugItem(createDebugRegistration());

        unregisterScrollProgressDebugItem(id);

        expect(getScrollProgressDebugRegistryState()).toEqual({
            selectedId: null,
            items: []
        });
    });

    it('ignores unregister requests for unknown debug items', () => {
        registerScrollProgressDebugItem(createDebugRegistration());

        unregisterScrollProgressDebugItem('unknown-id');

        expect(getScrollProgressDebugRegistryState().items).toHaveLength(1);
    });

    it('notifies subscribers immediately and after registry changes', () => {
        const subscriber = vi.fn();

        const unsubscribe = subscribeScrollProgressDebugRegistry(subscriber);

        expect(subscriber).toHaveBeenCalledTimes(1);
        expect(subscriber).toHaveBeenLastCalledWith({
            selectedId: null,
            items: []
        });

        const id = registerScrollProgressDebugItem(createDebugRegistration());

        expect(subscriber).toHaveBeenCalledTimes(2);
        expect(subscriber).toHaveBeenLastCalledWith({
            selectedId: id,
            items: [
                expect.objectContaining({
                    id,
                    debugId: 'hero',
                    label: 'Hero',
                    selected: true
                })
            ]
        });

        unsubscribe();

        registerScrollProgressDebugItem(
            createDebugRegistration({
                debugId: 'after-unsubscribe'
            })
        );

        expect(subscriber).toHaveBeenCalledTimes(2);
    });

    it('returns defensive nested values in registry snapshots', () => {
        registerScrollProgressDebugItem(
            createDebugRegistration({
                observerThreshold: [0, 0.5, 1],
                state: {
                    progress: 0.25,
                    progressDirection: 'forward',
                    scrollDirection: 'forward',
                    isInObservationArea: true,
                    isRootVisible: true,
                    isTracking: true,
                    intersectionRatio: 0.5
                }
            })
        );

        const snapshotItem = getScrollProgressDebugRegistryState().items[0];

        (snapshotItem.state as { progress: number }).progress = 0.75;

        if (!Array.isArray(snapshotItem.observerThreshold)) {
            throw new Error('Expected observerThreshold to be an array');
        }

        snapshotItem.observerThreshold[1] = 0.75;

        expect(getScrollProgressDebugRegistryState().items[0]).toMatchObject({
            observerThreshold: [0, 0.5, 1],
            state: {
                progress: 0.25
            }
        });
    });

    it('shares one registry snapshot across subscribers per notification', () => {
        const firstSubscriber = vi.fn();
        const secondSubscriber = vi.fn();

        subscribeScrollProgressDebugRegistry(firstSubscriber);
        subscribeScrollProgressDebugRegistry(secondSubscriber);

        firstSubscriber.mockClear();
        secondSubscriber.mockClear();

        registerScrollProgressDebugItem(createDebugRegistration());

        expect(firstSubscriber).toHaveBeenCalledTimes(1);
        expect(secondSubscriber).toHaveBeenCalledTimes(1);

        const firstSnapshot = firstSubscriber.mock.calls[0][0];
        const secondSnapshot = secondSubscriber.mock.calls[0][0];

        expect(firstSnapshot).toBe(secondSnapshot);
    });

    it('selects the first debug item automatically', () => {
        const id = registerScrollProgressDebugItem(createDebugRegistration());

        expect(getScrollProgressDebugRegistryState()).toMatchObject({
            selectedId: id,
            items: [
                expect.objectContaining({
                    id,
                    selected: true
                })
            ]
        });
    });

    it('selects a debug item', () => {
        const firstId = registerScrollProgressDebugItem(
            createDebugRegistration({
                debugId: 'first',
                label: 'First'
            })
        );

        const secondId = registerScrollProgressDebugItem(
            createDebugRegistration({
                debugId: 'second',
                label: 'Second'
            })
        );

        selectScrollProgressDebugItem(secondId);

        const state = getScrollProgressDebugRegistryState();

        expect(state.selectedId).toBe(secondId);

        expect(state.items.find((item) => item.id === firstId)).toMatchObject({
            selected: false
        });

        expect(state.items.find((item) => item.id === secondId)).toMatchObject({
            selected: true
        });
    });

    it('falls back to another debug item when the selected item is unregistered', () => {
        const firstId = registerScrollProgressDebugItem(
            createDebugRegistration({
                debugId: 'first',
                label: 'First'
            })
        );

        const secondId = registerScrollProgressDebugItem(
            createDebugRegistration({
                debugId: 'second',
                label: 'Second'
            })
        );

        selectScrollProgressDebugItem(firstId);
        unregisterScrollProgressDebugItem(firstId);

        expect(getScrollProgressDebugRegistryState().selectedId).toBe(secondId);
    });

    it('does not select a non-existent debug item', () => {
        const id = registerScrollProgressDebugItem(createDebugRegistration());

        selectScrollProgressDebugItem('non-existent');

        expect(getScrollProgressDebugRegistryState().selectedId).toBe(id);
    });

    it('does not notify subscribers when selecting the already selected debug item', () => {
        const id = registerScrollProgressDebugItem(createDebugRegistration());
        const subscriber = vi.fn();

        subscribeScrollProgressDebugRegistry(subscriber);

        expect(subscriber).toHaveBeenCalledTimes(1);

        selectScrollProgressDebugItem(id);

        expect(subscriber).toHaveBeenCalledTimes(1);
    });

    it('does not notify subscribers when selecting a non-existent debug item', () => {
        registerScrollProgressDebugItem(createDebugRegistration());
        const subscriber = vi.fn();

        subscribeScrollProgressDebugRegistry(subscriber);

        expect(subscriber).toHaveBeenCalledTimes(1);

        selectScrollProgressDebugItem('non-existent');

        expect(subscriber).toHaveBeenCalledTimes(1);
    });

    it('treats undefined registration options as omitted', () => {
        const element = {} as HTMLElement;

        registerScrollProgressDebugItem({ element });
        const expected = getScrollProgressDebugRegistryState();

        resetScrollProgressDebugRegistry();

        registerScrollProgressDebugItem({
            element,
            debugId: undefined,
            label: undefined,
            state: undefined,
            completed: undefined,
            start: undefined,
            end: undefined,
            axis: undefined,
            root: undefined,
            rootMargin: undefined,
            observerThreshold: undefined,
            inverted: undefined,
            once: undefined,
            requireRootVisible: undefined,
            cssVar: undefined
        });

        expect(getScrollProgressDebugRegistryState()).toEqual(expected);
    });

    it('preserves existing values when update options are undefined', () => {
        const id = registerScrollProgressDebugItem(
            createDebugRegistration({
                start: 0.9,
                end: 0.2,
                axis: 'x',
                root: {} as HTMLElement,
                rootMargin: '12px',
                observerThreshold: [0, 0.5, 1],
                inverted: true,
                once: true,
                requireRootVisible: true,
                cssVar: '--custom-progress',
                state: {
                    progress: 0.5,
                    progressDirection: 'forward',
                    scrollDirection: 'forward',
                    isInObservationArea: true,
                    isRootVisible: true,
                    isTracking: true,
                    intersectionRatio: 0.75
                }
            })
        );

        const before = getScrollProgressDebugRegistryState();

        updateScrollProgressDebugItem(id, {
            debugId: undefined,
            label: undefined,
            element: undefined,
            state: undefined,
            completed: undefined,
            start: undefined,
            end: undefined,
            axis: undefined,
            root: undefined,
            rootMargin: undefined,
            observerThreshold: undefined,
            inverted: undefined,
            once: undefined,
            requireRootVisible: undefined,
            cssVar: undefined
        });

        expect(getScrollProgressDebugRegistryState()).toEqual(before);
    });

    it('preserves explicit null, zero, false and empty strings', () => {
        const id = registerScrollProgressDebugItem(
            createDebugRegistration({
                root: {} as HTMLElement,
                cssVar: '--custom-progress',
                observerThreshold: [0, 0.5, 1],
                inverted: true,
                once: true,
                requireRootVisible: true
            })
        );

        const values = {
            debugId: '',
            label: '',
            start: 0,
            end: 0,
            root: null,
            rootMargin: '',
            observerThreshold: 0,
            inverted: false,
            once: false,
            requireRootVisible: false,
            cssVar: null
        };

        updateScrollProgressDebugItem(id, values);

        expect(getScrollProgressDebugRegistryState().items[0]).toMatchObject(values);

        const secondId = registerScrollProgressDebugItem(createDebugRegistration(values));

        const secondItem = getScrollProgressDebugRegistryState().items.find(
            (item) => item.id === secondId
        );

        expect(secondItem).toMatchObject(values);
    });
});
