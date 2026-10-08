import type { ScrollProgressDebugRegistryItem } from '../../registry.js';

import type { ScrollProgressDebugOverlayLayer } from '../layers.js';

import {
    applyLayerRect,
    getIntersectionRect,
    getItemRootRect,
    getProgressRangeRect,
    getRectClipInsets,
    resetLayerRect
} from './geometry-utils.js';

import { getSelectedDebugItem } from './selected-item-utils.js';

import {
    resetMarginLayerContent,
    resetProgressLayerContent,
    syncMarginLayerContent,
    syncProgressLayerContent
} from './dom-utils.js';

import { getRootMarginGeometry, getRootMarginRect } from './root-margin-utils.js';

type OverlayLayerElements = Map<ScrollProgressDebugOverlayLayer, HTMLDivElement>;

export function syncOverlayLayerBounds(
    layerElements: OverlayLayerElements,
    clipTargetToRoot: boolean
): void {
    const selectedItem = getSelectedDebugItem();

    if (!selectedItem) {
        resetOverlayLayerBounds(layerElements);
        return;
    }

    const rootRect = getItemRootRect(selectedItem);

    syncTargetLayerBounds(layerElements, selectedItem, rootRect, clipTargetToRoot);
    syncRootLayerBounds(layerElements, rootRect);
    syncProgressLayerBounds(layerElements, selectedItem, rootRect);
    syncMarginLayerBounds(layerElements, selectedItem, rootRect);
    syncIntersectionLayerBounds(layerElements, selectedItem, rootRect);
}

function resetOverlayLayerBounds(layerElements: OverlayLayerElements): void {
    for (const [layer, layerElement] of layerElements) {
        if (layer === 'progress') {
            resetProgressLayerContent(layerElement);
        }

        if (layer === 'target') {
            resetTargetLayerClip(layerElement);
        }

        if (layer === 'margin') {
            resetMarginLayerContent(layerElement);
        }

        resetLayerRect(layerElement);
    }
}

function syncTargetLayerBounds(
    layerElements: OverlayLayerElements,
    selectedItem: ScrollProgressDebugRegistryItem,
    rootRect: DOMRect | null,
    clipTargetToRoot: boolean
): void {
    const targetLayerElement = layerElements.get('target');

    if (!targetLayerElement) {
        return;
    }

    const targetRect = selectedItem.element.getBoundingClientRect();

    applyLayerRect(targetLayerElement, targetRect);

    syncTargetLayerClip(targetLayerElement, selectedItem, targetRect, rootRect, clipTargetToRoot);
}

function syncTargetLayerClip(
    targetLayerElement: HTMLElement,
    selectedItem: ScrollProgressDebugRegistryItem,
    targetRect: DOMRect,
    rootRect: DOMRect | null,
    clipTargetToRoot: boolean
): void {
    if (!clipTargetToRoot || !(selectedItem.root instanceof Element) || !rootRect) {
        resetTargetLayerClip(targetLayerElement);
        return;
    }

    const clipInsets = getRectClipInsets(targetRect, rootRect);

    targetLayerElement.style.clipPath =
        `inset(${clipInsets.top}px ${clipInsets.right}px ` +
        `${clipInsets.bottom}px ${clipInsets.left}px)`;
}

function resetTargetLayerClip(targetLayerElement: HTMLElement): void {
    targetLayerElement.style.clipPath = '';
}

function syncRootLayerBounds(layerElements: OverlayLayerElements, rootRect: DOMRect | null): void {
    const rootLayerElement = layerElements.get('root');

    if (!rootLayerElement) {
        return;
    }

    if (!rootRect) {
        resetLayerRect(rootLayerElement);
        return;
    }

    applyLayerRect(rootLayerElement, rootRect);
}

function syncProgressLayerBounds(
    layerElements: OverlayLayerElements,
    selectedItem: ScrollProgressDebugRegistryItem,
    rootRect: DOMRect | null
): void {
    const progressLayerElement = layerElements.get('progress');

    if (!progressLayerElement) {
        return;
    }

    if (!rootRect) {
        resetProgressLayerContent(progressLayerElement);
        resetLayerRect(progressLayerElement);
        return;
    }

    const rect = getProgressRangeRect(
        rootRect,
        selectedItem.axis,
        selectedItem.start,
        selectedItem.end
    );

    syncProgressLayerContent(progressLayerElement, {
        axis: selectedItem.axis,
        start: selectedItem.start,
        end: selectedItem.end,
        inverted: selectedItem.inverted
    });

    applyLayerRect(progressLayerElement, rect);
}

function syncMarginLayerBounds(
    layerElements: OverlayLayerElements,
    selectedItem: ScrollProgressDebugRegistryItem,
    rootRect: DOMRect | null
): void {
    const marginLayerElement = layerElements.get('margin');

    if (!marginLayerElement) {
        return;
    }

    if (!rootRect) {
        resetMarginLayerContent(marginLayerElement);
        resetLayerRect(marginLayerElement);
        return;
    }

    const marginGeometry = getRootMarginGeometry(rootRect, selectedItem.rootMargin);

    if (!marginGeometry) {
        resetMarginLayerContent(marginLayerElement);
        resetLayerRect(marginLayerElement);
        return;
    }

    applyLayerRect(marginLayerElement, marginGeometry.rect);

    syncMarginLayerContent(marginLayerElement, {
        ...marginGeometry,
        rootType: selectedItem.root instanceof Element ? 'custom' : 'viewport'
    });
}

function syncIntersectionLayerBounds(
    layerElements: OverlayLayerElements,
    selectedItem: ScrollProgressDebugRegistryItem,
    rootRect: DOMRect | null
): void {
    const intersectionLayerElement = layerElements.get('intersection');

    if (!intersectionLayerElement) {
        return;
    }

    if (!rootRect) {
        resetLayerRect(intersectionLayerElement);
        return;
    }

    const effectiveRootRect = getRootMarginRect(rootRect, selectedItem.rootMargin);

    if (!effectiveRootRect) {
        resetLayerRect(intersectionLayerElement);
        return;
    }

    const targetRect = selectedItem.element.getBoundingClientRect();
    const intersectionRect = getIntersectionRect(targetRect, effectiveRootRect);

    if (!intersectionRect) {
        resetLayerRect(intersectionLayerElement);
        return;
    }

    applyLayerRect(intersectionLayerElement, intersectionRect);
}
