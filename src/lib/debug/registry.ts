import type {
    ScrollProgressAxis,
    ScrollProgressCssVar,
    ScrollProgressObserverThreshold,
    ScrollProgressRoot,
    ScrollProgressRootMargin,
    ScrollProgressState
} from '../types.js';

interface ScrollProgressDebugTrackingConfig {
    readonly start: number;
    readonly end: number;
    readonly axis: ScrollProgressAxis;
    readonly root: ScrollProgressRoot;
    readonly rootMargin: ScrollProgressRootMargin;
    readonly observerThreshold: ScrollProgressObserverThreshold;
    readonly inverted: boolean;
    readonly once: boolean;
    readonly requireRootVisible: boolean;
    readonly cssVar: ScrollProgressCssVar | null;
}

interface ScrollProgressDebugMetadata {
    readonly debugId: string;
    readonly label: string;
    readonly element: HTMLElement;
}

export type ScrollProgressDebugItemRegistration = Omit<
    ScrollProgressDebugMetadata,
    'debugId' | 'label'
> &
    Partial<Pick<ScrollProgressDebugMetadata, 'debugId' | 'label'>> &
    Partial<ScrollProgressDebugTrackingConfig> & {
        completed?: boolean;
        state?: ScrollProgressState;
    };

export interface ScrollProgressDebugRegistryItem
    extends ScrollProgressDebugMetadata, ScrollProgressDebugTrackingConfig {
    readonly id: string;
    readonly completed: boolean;
    readonly state: ScrollProgressState;
    readonly selected: boolean;
}

export interface ScrollProgressDebugRegistryState {
    readonly selectedId: string | null;
    readonly items: readonly ScrollProgressDebugRegistryItem[];
}

export type ScrollProgressDebugItemUpdate = Partial<ScrollProgressDebugMetadata> &
    Partial<ScrollProgressDebugTrackingConfig> & {
        completed?: boolean;
        state?: ScrollProgressState;
    };

export interface ScrollProgressDebugItemController {
    readonly id: string;
    update: (update: ScrollProgressDebugItemUpdate) => void;
    destroy: () => void;
}

export type ScrollProgressDebugRegistrySubscriber = (
    state: ScrollProgressDebugRegistryState
) => void;

type ScrollProgressDebugRegistryEntry = Omit<ScrollProgressDebugRegistryItem, 'selected'>;

const INITIAL_SCROLL_PROGRESS_DEBUG_STATE: ScrollProgressState = {
    progress: 0,
    progressDirection: 'none',
    scrollDirection: 'none',
    isInObservationArea: false,
    isRootVisible: true,
    isTracking: false,
    intersectionRatio: 0
};

const DEFAULT_SCROLL_PROGRESS_DEBUG_TRACKING_CONFIG: ScrollProgressDebugTrackingConfig = {
    start: 0.8,
    end: 0.4,
    axis: 'y',
    root: null,
    rootMargin: '0px',
    observerThreshold: 0,
    inverted: false,
    once: false,
    requireRootVisible: false,
    cssVar: null
};

const subscribers = new Set<ScrollProgressDebugRegistrySubscriber>();

let idCounter = 0;

let selectedId: string | null = null;

const items = new Map<string, ScrollProgressDebugRegistryEntry>();

function createDebugItemId() {
    idCounter += 1;

    return `scroll-progress-debug-${idCounter}`;
}

function resolveDebugObserverThreshold(
    observerThreshold: ScrollProgressObserverThreshold,
    currentObserverThreshold?: ScrollProgressObserverThreshold
): ScrollProgressObserverThreshold {
    if (!Array.isArray(observerThreshold)) {
        return observerThreshold;
    }

    if (
        Array.isArray(currentObserverThreshold) &&
        observerThreshold.length === currentObserverThreshold.length &&
        observerThreshold.every((threshold, index) => threshold === currentObserverThreshold[index])
    ) {
        return currentObserverThreshold;
    }

    return [...observerThreshold];
}

export function getScrollProgressDebugRegistryState(): ScrollProgressDebugRegistryState {
    return {
        selectedId,
        items: Array.from(items.values()).map((item) => ({
            ...item,
            observerThreshold: Array.isArray(item.observerThreshold)
                ? [...item.observerThreshold]
                : item.observerThreshold,
            state: { ...item.state },
            selected: item.id === selectedId
        }))
    };
}

export function registerScrollProgressDebugItem(
    registration: ScrollProgressDebugItemRegistration
): string {
    const id = createDebugItemId();
    const debugId = registration.debugId ?? id;

    const defaults = DEFAULT_SCROLL_PROGRESS_DEBUG_TRACKING_CONFIG;

    const observerThreshold = resolveDebugObserverThreshold(
        registration.observerThreshold ?? defaults.observerThreshold
    );

    items.set(id, {
        id,
        debugId,
        element: registration.element,
        label: registration.label ?? debugId,

        start: registration.start ?? defaults.start,
        end: registration.end ?? defaults.end,
        axis: registration.axis ?? defaults.axis,
        root: registration.root === undefined ? defaults.root : registration.root,
        rootMargin: registration.rootMargin ?? defaults.rootMargin,
        observerThreshold,
        inverted: registration.inverted ?? defaults.inverted,
        once: registration.once ?? defaults.once,
        requireRootVisible: registration.requireRootVisible ?? defaults.requireRootVisible,
        cssVar: registration.cssVar === undefined ? defaults.cssVar : registration.cssVar,
        completed: registration.completed ?? false,

        state: registration.state
            ? { ...registration.state }
            : { ...INITIAL_SCROLL_PROGRESS_DEBUG_STATE }
    });

    if (selectedId === null) {
        selectedId = id;
    }

    notifyScrollProgressDebugRegistrySubscribers();

    return id;
}

export function updateScrollProgressDebugItem(
    id: string,
    update: ScrollProgressDebugItemUpdate
): void {
    const item = items.get(id);

    if (!item) {
        return;
    }
    const { state, observerThreshold } = update;

    const nextState = state ? { ...state } : item.state;

    const nextObserverThreshold =
        observerThreshold === undefined
            ? item.observerThreshold
            : resolveDebugObserverThreshold(observerThreshold, item.observerThreshold);

    items.set(id, {
        ...item,

        debugId: update.debugId ?? item.debugId,
        label: update.label ?? item.label,
        element: update.element ?? item.element,

        start: update.start ?? item.start,
        end: update.end ?? item.end,
        axis: update.axis ?? item.axis,
        root: update.root === undefined ? item.root : update.root,
        rootMargin: update.rootMargin ?? item.rootMargin,
        observerThreshold: nextObserverThreshold,
        inverted: update.inverted ?? item.inverted,
        once: update.once ?? item.once,
        requireRootVisible: update.requireRootVisible ?? item.requireRootVisible,
        cssVar: update.cssVar === undefined ? item.cssVar : update.cssVar,
        completed: update.completed ?? item.completed,

        state: nextState
    });

    notifyScrollProgressDebugRegistrySubscribers();
}

export function unregisterScrollProgressDebugItem(id: string): void {
    const deleted = items.delete(id);

    if (!deleted) {
        return;
    }

    if (selectedId === id) {
        selectedId = items.keys().next().value ?? null;
    }

    notifyScrollProgressDebugRegistrySubscribers();
}

export function selectScrollProgressDebugItem(id: string | null): void {
    if (id !== null && !items.has(id)) {
        return;
    }

    if (selectedId === id) {
        return;
    }

    selectedId = id;

    notifyScrollProgressDebugRegistrySubscribers();
}

export function resetScrollProgressDebugRegistry() {
    idCounter = 0;
    selectedId = null;
    items.clear();
    subscribers.clear();
}

function notifyScrollProgressDebugRegistrySubscribers(): void {
    const state = getScrollProgressDebugRegistryState();

    for (const subscriber of subscribers) {
        try {
            subscriber(state);
        } catch (error) {
            // Report every failure after this call returns, without cancelling
            // the committed write or interrupting the remaining subscribers.
            queueMicrotask(() => {
                throw error;
            });
        }
    }
}

export function subscribeScrollProgressDebugRegistry(
    subscriber: ScrollProgressDebugRegistrySubscriber
): () => void {
    subscribers.add(subscriber);
    try {
        subscriber(getScrollProgressDebugRegistryState());
    } catch (error) {
        subscribers.delete(subscriber);
        throw error;
    }

    return () => {
        subscribers.delete(subscriber);
    };
}
