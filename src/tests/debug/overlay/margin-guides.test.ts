// @vitest-environment happy-dom

import { setElementSize } from '../../helpers/scroll-progress-test-utils';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { resetScrollProgressDebugControlGroups } from '../../../lib/debug/controls/registry';
import { createDebugOverlay } from '../../../lib/debug/overlay/overlay';
import {
    selectScrollProgressDebugItem,
    registerScrollProgressDebugItem,
    resetScrollProgressDebugRegistry
} from '../../../lib/debug/registry';
import { createTestRect } from './helpers';

let overlay: ReturnType<typeof createDebugOverlay> | undefined;

type MarginGuideSide = 'top' | 'right' | 'bottom' | 'left';

afterEach(() => {
    overlay?.destroy();
    overlay = undefined;

    vi.useRealTimers();
    vi.restoreAllMocks();
    resetScrollProgressDebugControlGroups();
    resetScrollProgressDebugRegistry();
    document.body.innerHTML = '';
});

function getMarginLayer(): HTMLDivElement {
    const marginLayer = document.querySelector<HTMLElement>('[data-layer="margin"]');

    expect(marginLayer).toBeInstanceOf(HTMLDivElement);

    return marginLayer as HTMLDivElement;
}

function getMarginLabel(marginLayer: HTMLElement): HTMLSpanElement {
    const labelElement = marginLayer.querySelector<HTMLElement>('.spdo-layer-label-margin');

    expect(labelElement).toBeInstanceOf(HTMLSpanElement);

    return labelElement as HTMLSpanElement;
}

function getMarginGuide(
    marginLayer: HTMLElement,
    side: MarginGuideSide
): {
    guideElement: HTMLDivElement;
    labelElement: HTMLSpanElement;
} {
    const guideElement = marginLayer.querySelector<HTMLElement>(`.spdo-margin-guide-${side}`);

    const labelElement = guideElement?.querySelector<HTMLElement>('.spdo-margin-guide-label');

    expect(guideElement).toBeInstanceOf(HTMLDivElement);
    expect(labelElement).toBeInstanceOf(HTMLSpanElement);

    return {
        guideElement: guideElement as HTMLDivElement,
        labelElement: labelElement as HTMLSpanElement
    };
}

describe('scroll progress debug overlay margin guides', () => {
    it('syncs positive viewport root margins as offscreen guides', () => {
        const target = document.createElement('div');

        registerScrollProgressDebugItem({
            element: target,
            rootMargin: '10% 48px 6% 24px'
        });

        overlay = createDebugOverlay();
        const marginLayer = getMarginLayer();

        expect(marginLayer.dataset.rootType).toBe('viewport');

        const topOffset = Number((window.innerWidth * 0.1).toFixed(2));
        const bottomOffset = Number((window.innerWidth * 0.06).toFixed(2));

        const expectedGuides = [
            {
                side: 'top',
                offset: topOffset,
                label: `↑ 10% (${topOffset}px) offscreen`
            },
            {
                side: 'right',
                offset: 48,
                label: '→ 48px offscreen'
            },
            {
                side: 'bottom',
                offset: bottomOffset,
                label: `↓ 6% (${bottomOffset}px) offscreen`
            },
            {
                side: 'left',
                offset: 24,
                label: '← 24px offscreen'
            }
        ] as const;

        for (const { side, offset, label } of expectedGuides) {
            const { guideElement, labelElement } = getMarginGuide(marginLayer, side);

            expect(guideElement.dataset.state).toBe('offscreen');
            expect(guideElement.dataset.anchor).toBe('root');
            expect(labelElement.textContent).toBe(label);

            expect(marginLayer.style.getPropertyValue(`--spdo-margin-offset-${side}`)).toBe(
                `${offset}px`
            );
        }
    });

    it('syncs negative viewport root margins as inside guides', () => {
        const target = document.createElement('div');

        registerScrollProgressDebugItem({
            element: target,
            rootMargin: '-10% -48px -6% -24px'
        });

        overlay = createDebugOverlay();
        const marginLayer = getMarginLayer();

        expect(marginLayer.dataset.rootType).toBe('viewport');

        const topOffset = Number((window.innerWidth * 0.1).toFixed(2));
        const bottomOffset = Number((window.innerWidth * 0.06).toFixed(2));

        const expectedGuides = [
            {
                side: 'top',
                offset: -topOffset,
                label: `↓ 10% (${topOffset}px) inside`
            },
            {
                side: 'right',
                offset: -48,
                label: '← 48px inside'
            },
            {
                side: 'bottom',
                offset: -bottomOffset,
                label: `↑ 6% (${bottomOffset}px) inside`
            },
            {
                side: 'left',
                offset: -24,
                label: '→ 24px inside'
            }
        ] as const;

        for (const { side, offset, label } of expectedGuides) {
            const { guideElement, labelElement } = getMarginGuide(marginLayer, side);

            expect(guideElement.dataset.state).toBe('inside');
            expect(guideElement.dataset.anchor).toBe('margin');
            expect(labelElement.textContent).toBe(label);

            expect(marginLayer.style.getPropertyValue(`--spdo-margin-offset-${side}`)).toBe(
                `${offset}px`
            );
        }
    });

    it('hides zero viewport root margin guides in mixed configurations', () => {
        const target = document.createElement('div');

        registerScrollProgressDebugItem({
            element: target,
            rootMargin: '0px 48px -6% 24px'
        });

        overlay = createDebugOverlay();
        const marginLayer = getMarginLayer();

        expect(marginLayer.dataset.rootType).toBe('viewport');

        const bottomOffset = Number((window.innerWidth * 0.06).toFixed(2));

        const expectedGuides = [
            {
                side: 'top',
                offset: 0,
                state: 'hidden',
                anchor: undefined,
                label: ''
            },
            {
                side: 'right',
                offset: 48,
                state: 'offscreen',
                anchor: 'root',
                label: '→ 48px offscreen'
            },
            {
                side: 'bottom',
                offset: -bottomOffset,
                state: 'inside',
                anchor: 'margin',
                label: `↑ 6% (${bottomOffset}px) inside`
            },
            {
                side: 'left',
                offset: 24,
                state: 'offscreen',
                anchor: 'root',
                label: '← 24px offscreen'
            }
        ] as const;

        for (const { side, offset, state, anchor, label } of expectedGuides) {
            const { guideElement, labelElement } = getMarginGuide(marginLayer, side);

            expect(guideElement.dataset.state).toBe(state);
            expect(guideElement.dataset.anchor).toBe(anchor);
            expect(labelElement.textContent).toBe(label);

            expect(marginLayer.style.getPropertyValue(`--spdo-margin-offset-${side}`)).toBe(
                `${offset}px`
            );
        }
    });

    it('syncs custom root margins as margin-anchored guides', () => {
        const target = document.createElement('div');
        const root = document.createElement('div');

        root.getBoundingClientRect = () => createTestRect(100, 200, 400, 300);
        setElementSize(root, { width: 400, height: 300 });

        registerScrollProgressDebugItem({
            element: target,
            root,
            rootMargin: '10% 48px -6% 24px'
        });

        overlay = createDebugOverlay();
        const marginLayer = getMarginLayer();

        expect(marginLayer.dataset.rootType).toBe('custom');

        const expectedGuides = [
            {
                side: 'top',
                offset: 40,
                state: 'offscreen',
                label: '↑ 10% (40px) offscreen'
            },
            {
                side: 'right',
                offset: 48,
                state: 'offscreen',
                label: '→ 48px offscreen'
            },
            {
                side: 'bottom',
                offset: -24,
                state: 'inside',
                label: '↑ 6% (24px) inside'
            },
            {
                side: 'left',
                offset: 24,
                state: 'offscreen',
                label: '← 24px offscreen'
            }
        ] as const;

        for (const { side, offset, state, label } of expectedGuides) {
            const { guideElement, labelElement } = getMarginGuide(marginLayer, side);

            expect(guideElement.dataset.state).toBe(state);
            expect(guideElement.dataset.anchor).toBe('margin');
            expect(labelElement.textContent).toBe(label);

            expect(marginLayer.style.getPropertyValue(`--spdo-margin-offset-${side}`)).toBe(
                `${offset}px`
            );
        }
    });

    it.each([
        {
            vertical: 'top',
            rootMargin: '24px 0px 0px 0px'
        },
        {
            vertical: 'top',
            rootMargin: '-24px 0px 0px 0px'
        },
        {
            vertical: 'bottom',
            rootMargin: '0px 0px 24px 0px'
        },
        {
            vertical: 'bottom',
            rootMargin: '0px 0px -24px 0px'
        }
    ] as const)(
        'moves a centered internal $vertical margin label to the left when its guide is visible',
        ({ vertical, rootMargin }) => {
            const target = document.createElement('div');

            registerScrollProgressDebugItem({
                element: target,
                rootMargin
            });

            overlay = createDebugOverlay({
                labelPlacements: {
                    margin: {
                        mode: 'internal',
                        vertical,
                        horizontal: 'center'
                    }
                }
            });

            const marginLabel = getMarginLabel(getMarginLayer());

            expect(marginLabel.classList.contains('spdo-label-center')).toBe(true);

            expect(marginLabel.classList.contains('spdo-label-left')).toBe(false);

            expect(marginLabel.dataset.horizontalFallback).toBe('left');
        }
    );

    it.each([
        {
            description: 'the top offset is zero',
            rootMargin: '0px 24px 16px 8px',
            mode: 'internal',
            vertical: 'top'
        },
        {
            description: 'the bottom offset is zero',
            rootMargin: '16px 24px 0px 8px',
            mode: 'internal',
            vertical: 'bottom'
        },
        {
            description: 'the top label is external',
            rootMargin: '24px 0px 0px 0px',
            mode: 'external',
            vertical: 'top'
        },
        {
            description: 'the bottom label is external',
            rootMargin: '0px 0px -24px 0px',
            mode: 'external',
            vertical: 'bottom'
        }
    ] as const)(
        'keeps the centered margin label unchanged when $description',
        ({ rootMargin, mode, vertical }) => {
            const target = document.createElement('div');

            registerScrollProgressDebugItem({
                element: target,
                rootMargin
            });

            overlay = createDebugOverlay({
                labelPlacements: {
                    margin: {
                        mode,
                        vertical,
                        horizontal: 'center'
                    }
                }
            });

            const marginLabel = getMarginLabel(getMarginLayer());

            expect(marginLabel.classList.contains('spdo-label-center')).toBe(true);

            expect(marginLabel.dataset.horizontalFallback).toBeUndefined();
        }
    );

    it('removes the margin label fallback when the next selection does not collide', () => {
        vi.useFakeTimers();

        const firstTarget = document.createElement('div');
        const secondTarget = document.createElement('div');

        registerScrollProgressDebugItem({
            element: firstTarget,
            rootMargin: '24px 0px 0px 0px'
        });

        const secondItemId = registerScrollProgressDebugItem({
            element: secondTarget,
            rootMargin: '0px'
        });

        overlay = createDebugOverlay({
            labelPlacements: {
                margin: {
                    mode: 'internal',
                    vertical: 'top',
                    horizontal: 'center'
                }
            }
        });

        const marginLabel = getMarginLabel(getMarginLayer());

        expect(marginLabel.dataset.horizontalFallback).toBe('left');

        selectScrollProgressDebugItem(secondItemId);

        vi.advanceTimersToNextFrame();

        expect(marginLabel.dataset.horizontalFallback).toBeUndefined();

        expect(marginLabel.classList.contains('spdo-label-center')).toBe(true);
    });
});
