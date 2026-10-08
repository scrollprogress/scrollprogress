import { createAnimationFrameScheduler } from '../../utils/animation-frame-utils.js';

import { createScrollProgressResizeObserver } from '../../utils/resize-observer-utils.js';

import {
    addScrollEventListeners,
    areScrollEventTargetsEqual,
    removeScrollEventListeners,
    resolveScrollEventTargets,
    type ScrollEventTarget
} from '../../utils/scroll-source-utils.js';

import { subscribeScrollProgressDebugRegistry } from '../registry.js';

import { scrollProgressDebugOverlayStyles } from './styles.js';

import {
    createScrollProgressDebugOverlayControls,
    type ScrollProgressDebugOverlayTargetClippingState
} from './controls.js';

import { createOverlayLayerElement } from './utils/dom-utils.js';

import {
    createScrollProgressDebugOverlayLayerVisibilityController,
    type ScrollProgressDebugOverlayLayer,
    scrollProgressDebugOverlayLayers,
    type ScrollProgressDebugOverlayLayerVisibilityState
} from './layers.js';

import { getSelectedDebugItem } from './utils/selected-item-utils.js';

import { syncOverlayLayerBounds } from './utils/sync-utils.js';

import {
    applyScrollProgressDebugOverlayColors,
    getScrollProgressDebugOverlayResolvedColors,
    type ScrollProgressDebugOverlayColors
} from './colors.js';

import type { ScrollProgressDebugOverlayLabelPlacements } from './label-placements.js';

const defaultScrollProgressDebugOverlayVisibleLayers = [
    'target',
    'progress'
] as const satisfies readonly ScrollProgressDebugOverlayLayer[];

export interface ScrollProgressDebugOverlay {
    getLayerVisibilityState: () => ScrollProgressDebugOverlayLayerVisibilityState;
    setLayerVisible: (layer: ScrollProgressDebugOverlayLayer, visible: boolean) => void;
    toggleLayerVisible: (layer: ScrollProgressDebugOverlayLayer) => void;
    destroy: () => void;
}

export interface ScrollProgressDebugOverlayOptions {
    target?: HTMLElement;
    className?: string;
    theme?: string;
    visibleLayers?: readonly ScrollProgressDebugOverlayLayer[];
    clipTargetToRoot?: boolean;
    colors?: ScrollProgressDebugOverlayColors;
    labelPlacements?: ScrollProgressDebugOverlayLabelPlacements;
}

function createScrollProgressDebugOverlayInitialLayerVisibilityState(
    visibleLayers: readonly ScrollProgressDebugOverlayLayer[]
): Partial<ScrollProgressDebugOverlayLayerVisibilityState> {
    const state: Partial<ScrollProgressDebugOverlayLayerVisibilityState> = {};

    for (const layer of scrollProgressDebugOverlayLayers) {
        if (visibleLayers.includes(layer)) {
            state[layer] = true;
        }
    }

    return state;
}

export function createDebugOverlay(
    options: ScrollProgressDebugOverlayOptions = {}
): ScrollProgressDebugOverlay {
    const visibleLayers = options.visibleLayers ?? defaultScrollProgressDebugOverlayVisibleLayers;

    let clipTargetToRoot = options.clipTargetToRoot ?? false;

    const visibility = createScrollProgressDebugOverlayLayerVisibilityController(
        createScrollProgressDebugOverlayInitialLayerVisibilityState(visibleLayers)
    );

    let isDestroyed = false;
    let hasSyncedInitialRegistryState = false;
    let scrollEventTargets: ScrollEventTarget[] = [];
    let resizeObserver: ResizeObserver | null = null;
    let resizeObserverElement: HTMLElement | null = null;
    let resizeObserverRoot: Element | null = null;

    let controls: ReturnType<typeof createScrollProgressDebugOverlayControls> | undefined;

    let unsubscribeVisibility: (() => void) | undefined;
    let unsubscribeDebugRegistry: (() => void) | undefined;

    const mountTarget = options.target ?? document.body;

    const overlayElement = document.createElement('div');
    const styleElement = document.createElement('style');
    const rootElement = document.createElement('div');

    overlayElement.classList.add('scroll-progress-debug-overlay');

    if (options.className) {
        overlayElement.classList.add(...options.className.split(' ').filter(Boolean));
    }

    if (options.theme !== undefined) {
        overlayElement.dataset.scrollProgressDebugTheme = options.theme;
    }

    if (options.colors) {
        applyScrollProgressDebugOverlayColors(overlayElement, options.colors);
    }

    overlayElement.setAttribute('aria-hidden', 'true');

    styleElement.textContent = scrollProgressDebugOverlayStyles;
    rootElement.classList.add('spdo-root');

    const layers = new Map<ScrollProgressDebugOverlayLayer, HTMLDivElement>();

    for (const layer of scrollProgressDebugOverlayLayers) {
        const layerElement = createOverlayLayerElement(layer, options.labelPlacements);

        layers.set(layer, layerElement);
        rootElement.append(layerElement);
    }

    function syncLayerVisibility(state: ScrollProgressDebugOverlayLayerVisibilityState): void {
        for (const layer of scrollProgressDebugOverlayLayers) {
            const layerElement = layers.get(layer);

            if (!layerElement) {
                continue;
            }

            layerElement.dataset.visible = String(state[layer]);
        }
    }

    function syncLayerBounds(): void {
        syncOverlayLayerBounds(layers, clipTargetToRoot);
    }

    const layerBoundsScheduler = createAnimationFrameScheduler(syncLayerBounds, () => isDestroyed);

    function scheduleLayerBoundsSync(): void {
        layerBoundsScheduler.request();
    }

    function getTargetClippingState(): ScrollProgressDebugOverlayTargetClippingState {
        return {
            enabled: clipTargetToRoot,
            available: getSelectedDebugItem()?.root instanceof Element
        };
    }

    function toggleTargetClipping(): void {
        const targetClippingState = getTargetClippingState();

        if (isDestroyed || !targetClippingState.available) {
            return;
        }

        clipTargetToRoot = !clipTargetToRoot;

        controls?.updateTargetClippingState(getTargetClippingState());
        scheduleLayerBoundsSync();
    }

    function syncScrollEventTargets(): void {
        const selectedItem = getSelectedDebugItem();

        const nextScrollEventTargets = selectedItem
            ? resolveScrollEventTargets(selectedItem.root)
            : [];

        if (areScrollEventTargetsEqual(nextScrollEventTargets, scrollEventTargets)) {
            return;
        }

        removeScrollEventListeners(scrollEventTargets, scheduleLayerBoundsSync);

        addScrollEventListeners(nextScrollEventTargets, scheduleLayerBoundsSync);

        scrollEventTargets = nextScrollEventTargets;
    }

    function syncResizeObserverTargets(): void {
        const selectedItem = getSelectedDebugItem();

        const nextElement = selectedItem?.element ?? null;
        const nextRoot = selectedItem?.root instanceof Element ? selectedItem.root : null;

        if (resizeObserverElement === nextElement && resizeObserverRoot === nextRoot) {
            return;
        }

        disconnectResizeObserverTargets();

        resizeObserverElement = nextElement;
        resizeObserverRoot = nextRoot;

        if (!selectedItem) {
            return;
        }

        resizeObserver = createScrollProgressResizeObserver(
            selectedItem.element,
            selectedItem.root,
            scheduleLayerBoundsSync
        );
    }

    function disconnectResizeObserverTargets(): void {
        resizeObserver?.disconnect();
        resizeObserver = null;
        resizeObserverElement = null;
        resizeObserverRoot = null;
    }

    function addLayerBoundsSyncListeners(): void {
        window.addEventListener('resize', scheduleLayerBoundsSync);
        window.addEventListener('scroll', scheduleLayerBoundsSync);
        document.addEventListener('scroll', scheduleLayerBoundsSync, true);
    }

    function removeLayerBoundsSyncListeners(): void {
        window.removeEventListener('resize', scheduleLayerBoundsSync);
        window.removeEventListener('scroll', scheduleLayerBoundsSync);
        document.removeEventListener('scroll', scheduleLayerBoundsSync, true);

        removeScrollEventListeners(scrollEventTargets, scheduleLayerBoundsSync);

        scrollEventTargets = [];
    }

    function destroy(): void {
        if (isDestroyed) {
            return;
        }

        isDestroyed = true;

        let hasError = false;
        let firstError: unknown;

        const cleanupActions = [
            removeLayerBoundsSyncListeners,
            disconnectResizeObserverTargets,
            () => unsubscribeVisibility?.(),
            () => unsubscribeDebugRegistry?.(),
            () => layerBoundsScheduler.cancel(),
            () => controls?.destroy(),
            () => overlayElement.remove()
        ];

        for (const cleanup of cleanupActions) {
            try {
                cleanup();
            } catch (error) {
                if (!hasError) {
                    hasError = true;
                    firstError = error;
                }
            }
        }

        if (hasError) {
            throw firstError;
        }
    }

    try {
        overlayElement.append(styleElement, rootElement);
        mountTarget.append(overlayElement);

        const resolvedColors = getScrollProgressDebugOverlayResolvedColors(overlayElement);

        controls = createScrollProgressDebugOverlayControls(visibility, resolvedColors, {
            state: getTargetClippingState(),
            onToggle: toggleTargetClipping
        });

        unsubscribeVisibility = visibility.subscribe(syncLayerVisibility);

        unsubscribeDebugRegistry = subscribeScrollProgressDebugRegistry(() => {
            if (isDestroyed) {
                return;
            }

            syncScrollEventTargets();
            syncResizeObserverTargets();
            controls?.updateTargetClippingState(getTargetClippingState());

            if (!hasSyncedInitialRegistryState) {
                hasSyncedInitialRegistryState = true;
                syncLayerBounds();
                return;
            }

            scheduleLayerBoundsSync();
        });

        addLayerBoundsSyncListeners();
    } catch (error) {
        try {
            destroy();
        } catch {
            // Preserve the original construction error after attempting cleanup.
        }

        throw error;
    }

    return {
        getLayerVisibilityState() {
            return visibility.getState();
        },

        setLayerVisible(layer, visible) {
            if (isDestroyed) {
                return;
            }

            visibility.setLayerVisible(layer, visible);
        },

        toggleLayerVisible(layer) {
            if (isDestroyed) {
                return;
            }

            visibility.toggleLayerVisible(layer);
        },

        destroy
    };
}
