import type { ScrollProgressDebugOverlayLayer } from '../layers.js';

import {
    resolveScrollProgressDebugOverlayLabelPlacement,
    type ScrollProgressDebugOverlayLabelPlacement,
    type ScrollProgressDebugOverlayLabelPlacements
} from '../label-placements.js';

import type { RootMarginOffsets, RootMarginTokens } from './root-margin-utils.js';

type OverlayMarker = 'start' | 'end';

const rootMarginSides = ['top', 'right', 'bottom', 'left'] as const;

type RootMarginSide = (typeof rootMarginSides)[number];

type RootMarginGuideState = 'offscreen' | 'inside';
type RootMarginGuideAnchor = 'root' | 'margin';
type MarginLayerRootType = 'viewport' | 'custom';

const rootMarginGuideArrows: Record<RootMarginGuideState, Record<RootMarginSide, string>> = {
    offscreen: {
        top: '↑',
        right: '→',
        bottom: '↓',
        left: '←'
    },
    inside: {
        top: '↓',
        right: '←',
        bottom: '↑',
        left: '→'
    }
};

export type ProgressLayerContent = {
    axis: 'x' | 'y';
    start: number;
    end: number;
    inverted: boolean;
};

export type MarginLayerContent = {
    offsets: RootMarginOffsets;
    tokens: RootMarginTokens;
    rootType: MarginLayerRootType;
};

export function createOverlayLayerElement(
    layer: ScrollProgressDebugOverlayLayer,
    labelPlacements: ScrollProgressDebugOverlayLabelPlacements = {}
): HTMLDivElement {
    const element = document.createElement('div');

    element.classList.add('spdo-layer', `spdo-layer-${layer}`);
    element.dataset.layer = layer;
    element.dataset.visible = 'false';

    if (layer === 'progress') {
        element.append(createProgressRangeElement(labelPlacements));

        return element;
    }

    element.append(createLayerLabelElement(layer, labelPlacements));

    if (layer === 'margin') {
        element.append(...createMarginGuideElements());
    }

    return element;
}

function createMarginGuideElements(): HTMLDivElement[] {
    return rootMarginSides.map((side) => {
        return createMarginGuideElement(side);
    });
}

function createMarginGuideElement(side: RootMarginSide): HTMLDivElement {
    const element = document.createElement('div');
    const labelElement = document.createElement('span');

    element.classList.add('spdo-margin-guide', `spdo-margin-guide-${side}`);
    element.dataset.state = 'hidden';

    labelElement.classList.add('spdo-label', 'spdo-margin-guide-label');

    element.append(labelElement);

    return element;
}

function createLayerLabelElement(
    layer: Exclude<ScrollProgressDebugOverlayLayer, 'progress'>,
    labelPlacements: ScrollProgressDebugOverlayLabelPlacements
): HTMLSpanElement {
    return createOverlayLabelElement(
        layer,
        ['spdo-layer-label', `spdo-layer-label-${layer}`],
        resolveScrollProgressDebugOverlayLabelPlacement(layer, labelPlacements)
    );
}

function createProgressRangeElement(
    labelPlacements: ScrollProgressDebugOverlayLabelPlacements
): HTMLDivElement {
    const element = document.createElement('div');

    element.classList.add('spdo-progress-range');
    element.append(
        createProgressLineElement('start', labelPlacements),
        createProgressLineElement('end', labelPlacements)
    );

    return element;
}

function createProgressLineElement(
    marker: OverlayMarker,
    labelPlacements: ScrollProgressDebugOverlayLabelPlacements
): HTMLDivElement {
    const element = document.createElement('div');
    const labelId = getProgressMarkerLabelId(marker);

    const labelElement = createOverlayLabelElement(
        marker,
        ['spdo-progress-label', `spdo-progress-label-${marker}`],
        resolveScrollProgressDebugOverlayLabelPlacement(labelId, labelPlacements)
    );

    element.classList.add('spdo-progress-line', `spdo-progress-line-${marker}`);

    element.append(labelElement);

    return element;
}

function getProgressMarkerLabelId(marker: OverlayMarker): 'progress-start' | 'progress-end' {
    return `progress-${marker}`;
}

function createOverlayLabelElement(
    label: string,
    classNames: string[],
    placement: ScrollProgressDebugOverlayLabelPlacement
): HTMLSpanElement {
    const element = document.createElement('span');

    element.classList.add(
        'spdo-label',
        ...classNames,
        `spdo-label-${placement.mode}`,
        `spdo-label-${placement.vertical}`,
        `spdo-label-${placement.horizontal}`
    );

    element.textContent = label;

    return element;
}

export function syncProgressLayerContent(
    progressLayerElement: HTMLElement,
    content: ProgressLayerContent
): void {
    const rangeElement = getProgressRangeElement(progressLayerElement);

    if (!rangeElement) {
        return;
    }

    rangeElement.dataset.axis = content.axis;
    rangeElement.dataset.start = String(content.start);
    rangeElement.dataset.end = String(content.end);
    rangeElement.dataset.inverted = String(content.inverted);

    syncProgressRangeAxisClass(rangeElement, content.axis);

    setProgressLabelText(
        progressLayerElement,
        'start',
        formatProgressMarkerLabel('start', content)
    );

    setProgressLabelText(progressLayerElement, 'end', formatProgressMarkerLabel('end', content));
}

export function resetProgressLayerContent(progressLayerElement: HTMLElement): void {
    const rangeElement = getProgressRangeElement(progressLayerElement);

    if (!rangeElement) {
        return;
    }

    delete rangeElement.dataset.axis;
    delete rangeElement.dataset.start;
    delete rangeElement.dataset.end;
    delete rangeElement.dataset.inverted;

    resetProgressRangeAxisClass(rangeElement);

    setProgressLabelText(progressLayerElement, 'start', 'start');
    setProgressLabelText(progressLayerElement, 'end', 'end');
}

export function syncMarginLayerContent(
    marginLayerElement: HTMLElement,
    content: MarginLayerContent
): void {
    marginLayerElement.dataset.rootType = content.rootType;

    for (const side of rootMarginSides) {
        marginLayerElement.style.setProperty(
            `--spdo-margin-offset-${side}`,
            `${content.offsets[side]}px`
        );

        syncMarginGuide(
            marginLayerElement,
            side,
            content.tokens[side],
            content.offsets[side],
            content.rootType
        );
    }

    syncMarginLabelHorizontalFallback(marginLayerElement, content.offsets);
}

export function resetMarginLayerContent(marginLayerElement: HTMLElement): void {
    delete marginLayerElement.dataset.rootType;

    resetMarginLabelHorizontalFallback(marginLayerElement);

    for (const side of rootMarginSides) {
        marginLayerElement.style.removeProperty(`--spdo-margin-offset-${side}`);

        resetMarginGuide(marginLayerElement, side);
    }
}

function syncMarginLabelHorizontalFallback(
    marginLayerElement: HTMLElement,
    offsets: RootMarginOffsets
): void {
    const labelElement = getMarginLayerLabelElement(marginLayerElement);

    if (!labelElement) {
        return;
    }

    const verticalSide = getMarginLabelVerticalSide(labelElement);

    const hasCenteredInternalPlacement =
        labelElement.classList.contains('spdo-label-internal') &&
        labelElement.classList.contains('spdo-label-center');

    if (!hasCenteredInternalPlacement || !verticalSide || offsets[verticalSide] === 0) {
        delete labelElement.dataset.horizontalFallback;
        return;
    }

    labelElement.dataset.horizontalFallback = 'left';
}

function resetMarginLabelHorizontalFallback(marginLayerElement: HTMLElement): void {
    const labelElement = getMarginLayerLabelElement(marginLayerElement);

    if (!labelElement) {
        return;
    }

    delete labelElement.dataset.horizontalFallback;
}

function getMarginLabelVerticalSide(labelElement: HTMLElement): 'top' | 'bottom' | null {
    if (labelElement.classList.contains('spdo-label-top')) {
        return 'top';
    }

    if (labelElement.classList.contains('spdo-label-bottom')) {
        return 'bottom';
    }

    return null;
}

function syncMarginGuide(
    marginLayerElement: HTMLElement,
    side: RootMarginSide,
    token: string,
    offset: number,
    rootType: MarginLayerRootType
): void {
    const guideElement = getMarginGuideElement(marginLayerElement, side);

    if (!guideElement) {
        return;
    }

    if (offset === 0) {
        resetMarginGuide(marginLayerElement, side);
        return;
    }

    const state: RootMarginGuideState = offset > 0 ? 'offscreen' : 'inside';

    guideElement.dataset.state = state;
    guideElement.dataset.anchor = getRootMarginGuideAnchor(rootType, state);

    const labelElement = getMarginGuideLabelElement(guideElement);

    if (labelElement) {
        labelElement.textContent = formatMarginGuideLabel(side, state, token, offset);
    }
}

function resetMarginGuide(marginLayerElement: HTMLElement, side: RootMarginSide): void {
    const guideElement = getMarginGuideElement(marginLayerElement, side);

    if (!guideElement) {
        return;
    }

    guideElement.dataset.state = 'hidden';
    delete guideElement.dataset.anchor;

    const labelElement = getMarginGuideLabelElement(guideElement);

    if (labelElement) {
        labelElement.textContent = '';
    }
}

function getMarginGuideElement(
    marginLayerElement: HTMLElement,
    side: RootMarginSide
): HTMLElement | null {
    return marginLayerElement.querySelector(`.spdo-margin-guide-${side}`);
}

function getMarginGuideLabelElement(guideElement: HTMLElement): HTMLElement | null {
    return guideElement.querySelector('.spdo-margin-guide-label');
}

function getMarginLayerLabelElement(marginLayerElement: HTMLElement): HTMLElement | null {
    return marginLayerElement.querySelector('.spdo-layer-label-margin');
}

function formatMarginGuideLabel(
    side: RootMarginSide,
    state: RootMarginGuideState,
    token: string,
    offset: number
): string {
    const arrow = getRootMarginGuideArrow(side, state);
    const absoluteToken = token.startsWith('-') ? token.slice(1) : token;

    const pixelValue = `${Number(Math.abs(offset).toFixed(2))}px`;

    const value = absoluteToken.endsWith('%') ? `${absoluteToken} (${pixelValue})` : pixelValue;

    return `${arrow} ${value} ${state}`;
}

function getRootMarginGuideArrow(side: RootMarginSide, state: RootMarginGuideState): string {
    return rootMarginGuideArrows[state][side];
}

function getRootMarginGuideAnchor(
    rootType: MarginLayerRootType,
    state: RootMarginGuideState
): RootMarginGuideAnchor {
    return rootType === 'viewport' && state === 'offscreen' ? 'root' : 'margin';
}

function getProgressRangeElement(progressLayerElement: HTMLElement): HTMLElement | null {
    return progressLayerElement.querySelector('.spdo-progress-range');
}

function getProgressLabelElement(
    progressLayerElement: HTMLElement,
    marker: OverlayMarker
): HTMLElement | null {
    return progressLayerElement.querySelector(`.spdo-progress-label-${marker}`);
}

function setProgressLabelText(
    progressLayerElement: HTMLElement,
    marker: OverlayMarker,
    text: string
): void {
    const labelElement = getProgressLabelElement(progressLayerElement, marker);

    if (!labelElement) {
        return;
    }

    labelElement.textContent = text;
}

function formatProgressMarkerLabel(marker: OverlayMarker, content: ProgressLayerContent): string {
    const arrow = getProgressMarkerArrow(marker, content.axis);
    const value = marker === 'start' ? content.start : content.end;

    return `${arrow} ${marker}: ${value}`;
}

function getProgressMarkerArrow(marker: OverlayMarker, axis: ProgressLayerContent['axis']): string {
    if (axis === 'x') {
        return marker === 'start' ? '→' : '←';
    }

    return marker === 'start' ? '↓' : '↑';
}

function syncProgressRangeAxisClass(
    rangeElement: HTMLElement,
    axis: ProgressLayerContent['axis']
): void {
    resetProgressRangeAxisClass(rangeElement);
    rangeElement.classList.add(`spdo-axis-${axis}`);
}

function resetProgressRangeAxisClass(rangeElement: HTMLElement): void {
    rangeElement.classList.remove('spdo-axis-x', 'spdo-axis-y');
}
