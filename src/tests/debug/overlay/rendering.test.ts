// @vitest-environment happy-dom

import { afterEach, describe, expect, it } from 'vitest';

import {
    getScrollProgressDebugControlGroupsState,
    resetScrollProgressDebugControlGroups
} from '../../../lib/debug/controls/registry';
import { createDebugOverlay } from '../../../lib/debug/overlay/overlay';
import { resetScrollProgressDebugRegistry } from '../../../lib/debug/registry';

let overlay: ReturnType<typeof createDebugOverlay> | undefined;

afterEach(() => {
    overlay?.destroy();
    overlay = undefined;

    resetScrollProgressDebugControlGroups();
    resetScrollProgressDebugRegistry();
    document.body.innerHTML = '';
});

describe('scroll progress debug overlay rendering', () => {
    it('syncs overlay layer elements with layer visibility state', () => {
        overlay = createDebugOverlay({
            visibleLayers: []
        });

        const targetLayer = document.querySelector<HTMLDivElement>('[data-layer="target"]');
        const progressLayer = document.querySelector<HTMLDivElement>('[data-layer="progress"]');

        expect(targetLayer).toBeInstanceOf(HTMLDivElement);
        expect(targetLayer?.classList.contains('spdo-layer')).toBe(true);
        expect(targetLayer?.classList.contains('spdo-layer-target')).toBe(true);
        expect(targetLayer?.dataset.visible).toBe('false');

        expect(progressLayer).toBeInstanceOf(HTMLDivElement);
        expect(progressLayer?.classList.contains('spdo-layer-progress')).toBe(true);
        expect(progressLayer?.dataset.visible).toBe('false');

        overlay.setLayerVisible('target', true);

        expect(targetLayer?.dataset.visible).toBe('true');
        expect(progressLayer?.dataset.visible).toBe('false');

        overlay.toggleLayerVisible('target');

        expect(targetLayer?.dataset.visible).toBe('false');
    });

    it('renders progress overlay marker DOM for start and end', () => {
        overlay = createDebugOverlay();

        const progressLayer = document.querySelector<HTMLElement>('[data-layer="progress"]');
        const progressRange = progressLayer?.querySelector<HTMLElement>('.spdo-progress-range');
        const startLine = progressRange?.querySelector<HTMLElement>('.spdo-progress-line-start');
        const endLine = progressRange?.querySelector<HTMLElement>('.spdo-progress-line-end');
        const startLabel = startLine?.querySelector<HTMLElement>('.spdo-progress-label-start');
        const endLabel = endLine?.querySelector<HTMLElement>('.spdo-progress-label-end');

        expect(progressLayer).toBeInstanceOf(HTMLDivElement);
        expect(progressRange).toBeInstanceOf(HTMLDivElement);

        expect(startLine).toBeInstanceOf(HTMLDivElement);
        expect(startLine?.classList.contains('spdo-progress-line')).toBe(true);
        expect(startLabel).toBeInstanceOf(HTMLSpanElement);
        expect(startLabel?.classList.contains('spdo-label')).toBe(true);
        expect(startLabel?.classList.contains('spdo-progress-label')).toBe(true);
        expect(startLabel?.classList.contains('spdo-label-external')).toBe(true);
        expect(startLabel?.classList.contains('spdo-label-top')).toBe(true);
        expect(startLabel?.classList.contains('spdo-label-left')).toBe(true);
        expect(startLabel?.textContent).toBe('start');

        expect(endLine).toBeInstanceOf(HTMLDivElement);
        expect(endLine?.classList.contains('spdo-progress-line')).toBe(true);
        expect(endLabel).toBeInstanceOf(HTMLSpanElement);
        expect(endLabel?.classList.contains('spdo-label')).toBe(true);
        expect(endLabel?.classList.contains('spdo-progress-label')).toBe(true);
        expect(endLabel?.classList.contains('spdo-label-external')).toBe(true);
        expect(endLabel?.classList.contains('spdo-label-bottom')).toBe(true);
        expect(endLabel?.classList.contains('spdo-label-right')).toBe(true);
        expect(endLabel?.textContent).toBe('end');

        const progressClassNames = Array.from(
            progressLayer?.querySelectorAll<HTMLElement>('*') ?? []
        ).flatMap((element) => Array.from(element.classList));

        expect(
            progressClassNames.every((className) => {
                return !className.includes('__') && !className.includes('--');
            })
        ).toBe(true);
    });

    it('renders box overlay layer labels in separate default corners', () => {
        overlay = createDebugOverlay();

        const placements = [
            {
                layer: 'target',
                vertical: 'top',
                horizontal: 'left'
            },
            {
                layer: 'root',
                vertical: 'top',
                horizontal: 'right'
            },
            {
                layer: 'margin',
                vertical: 'bottom',
                horizontal: 'left'
            },
            {
                layer: 'intersection',
                vertical: 'bottom',
                horizontal: 'right'
            }
        ] as const;

        for (const { layer, vertical, horizontal } of placements) {
            const layerElement = document.querySelector<HTMLElement>(`[data-layer="${layer}"]`);

            const labelElement = layerElement?.querySelector<HTMLElement>(
                `.spdo-layer-label-${layer}`
            );

            expect(labelElement).toBeInstanceOf(HTMLSpanElement);
            expect(labelElement?.classList.contains('spdo-label')).toBe(true);

            expect(labelElement?.classList.contains('spdo-layer-label')).toBe(true);

            expect(labelElement?.classList.contains('spdo-label-internal')).toBe(true);

            expect(labelElement?.classList.contains(`spdo-label-${vertical}`)).toBe(true);

            expect(labelElement?.classList.contains(`spdo-label-${horizontal}`)).toBe(true);

            expect(labelElement?.textContent).toBe(layer);
        }
    });

    it('renders horizontal center placement for internal and external labels', () => {
        overlay = createDebugOverlay({
            labelPlacements: {
                target: {
                    horizontal: 'center'
                },
                'progress-start': {
                    horizontal: 'center'
                }
            }
        });

        const targetLabel = document.querySelector<HTMLElement>('.spdo-layer-label-target');

        const progressStartLabel = document.querySelector<HTMLElement>(
            '.spdo-progress-label-start'
        );

        expect(Array.from(targetLabel?.classList ?? [])).toEqual(
            expect.arrayContaining(['spdo-label-internal', 'spdo-label-top', 'spdo-label-center'])
        );

        expect(targetLabel?.classList.contains('spdo-label-left')).toBe(false);
        expect(targetLabel?.classList.contains('spdo-label-right')).toBe(false);

        expect(Array.from(progressStartLabel?.classList ?? [])).toEqual(
            expect.arrayContaining(['spdo-label-external', 'spdo-label-top', 'spdo-label-center'])
        );

        expect(progressStartLabel?.classList.contains('spdo-label-left')).toBe(false);

        expect(progressStartLabel?.classList.contains('spdo-label-right')).toBe(false);
    });

    it('renders hidden margin guides for all root margin sides', () => {
        overlay = createDebugOverlay();

        const marginLayer = document.querySelector<HTMLElement>('[data-layer="margin"]');

        expect(marginLayer).toBeInstanceOf(HTMLDivElement);

        const sides = ['top', 'right', 'bottom', 'left'] as const;

        for (const side of sides) {
            const guideElement = marginLayer?.querySelector<HTMLElement>(
                `.spdo-margin-guide-${side}`
            );

            const labelElement = guideElement?.querySelector<HTMLElement>(
                '.spdo-margin-guide-label'
            );

            expect(guideElement).toBeInstanceOf(HTMLDivElement);
            expect(guideElement?.classList.contains('spdo-margin-guide')).toBe(true);
            expect(guideElement?.dataset.state).toBe('hidden');

            expect(labelElement).toBeInstanceOf(HTMLSpanElement);
            expect(labelElement?.classList.contains('spdo-label')).toBe(true);
            expect(labelElement?.textContent).toBe('');
        }
    });

    it('merges partial label placement overrides with their defaults', () => {
        overlay = createDebugOverlay({
            labelPlacements: {
                target: {
                    mode: 'external'
                },
                'progress-start': {
                    mode: 'internal',
                    horizontal: 'right'
                },
                'progress-end': {
                    mode: 'internal',
                    vertical: 'top'
                }
            }
        });

        const targetLabel = document.querySelector<HTMLElement>('.spdo-layer-label-target');

        const progressStartLabel = document.querySelector<HTMLElement>(
            '.spdo-progress-label-start'
        );

        const progressEndLabel = document.querySelector<HTMLElement>('.spdo-progress-label-end');

        expect(Array.from(targetLabel?.classList ?? [])).toEqual(
            expect.arrayContaining(['spdo-label-external', 'spdo-label-top', 'spdo-label-left'])
        );

        expect(Array.from(progressStartLabel?.classList ?? [])).toEqual(
            expect.arrayContaining(['spdo-label-internal', 'spdo-label-top', 'spdo-label-right'])
        );

        expect(Array.from(progressEndLabel?.classList ?? [])).toEqual(
            expect.arrayContaining(['spdo-label-internal', 'spdo-label-top', 'spdo-label-right'])
        );
    });

    it('applies configured colors as overlay custom properties', () => {
        overlay = createDebugOverlay({
            colors: {
                target: {
                    color: '#facc15',
                    labelTextColor: '#020617'
                },
                'progress-start': {
                    color: '#22c55e'
                },
                'progress-end': {
                    color: '#f97316',
                    labelTextColor: '#ffffff'
                }
            }
        });

        const element = document.querySelector<HTMLElement>('.scroll-progress-debug-overlay');

        expect(element?.style.getPropertyValue('--sp-debug-overlay-target-color')).toBe('#facc15');

        expect(element?.style.getPropertyValue('--sp-debug-overlay-target-label-text')).toBe(
            '#020617'
        );

        expect(element?.style.getPropertyValue('--sp-debug-overlay-progress-start-color')).toBe(
            '#22c55e'
        );

        expect(element?.style.getPropertyValue('--sp-debug-overlay-progress-end-color')).toBe(
            '#f97316'
        );

        expect(element?.style.getPropertyValue('--sp-debug-overlay-progress-end-label-text')).toBe(
            '#ffffff'
        );

        expect(element?.style.getPropertyValue('--sp-debug-overlay-root-color')).toBe('');

        const registeredControls = getScrollProgressDebugControlGroupsState().groups[0].controls;

        expect(registeredControls.find((control) => control.id === 'target')).toMatchObject({
            legendColors: ['#facc15']
        });

        expect(registeredControls.find((control) => control.id === 'progress')).toMatchObject({
            legendColors: ['#22c55e', '#f97316']
        });
    });

    it('lets inline color options override the selected CSS theme', () => {
        const themeStyle = document.createElement('style');

        themeStyle.textContent = `
            .scroll-progress-debug-overlay[data-scroll-progress-debug-theme='tron'] {
                --sp-debug-overlay-target-color: #00e5ff;
                --sp-debug-overlay-root-color: #bd8cff;
            }
        `;

        document.head.append(themeStyle);

        overlay = createDebugOverlay({
            theme: 'tron',
            colors: {
                target: {
                    color: '#ffe66d'
                }
            }
        });

        const element = document.querySelector<HTMLElement>('.scroll-progress-debug-overlay');
        const computedStyle = element ? window.getComputedStyle(element) : null;

        expect(computedStyle?.getPropertyValue('--sp-debug-overlay-target-color').trim()).toBe(
            '#ffe66d'
        );
        expect(computedStyle?.getPropertyValue('--sp-debug-overlay-root-color').trim()).toBe(
            '#bd8cff'
        );

        themeStyle.remove();
    });
});
