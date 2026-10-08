// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
    getScrollProgressDebugControlGroupsState,
    registerScrollProgressDebugControlGroup,
    resetScrollProgressDebugControlGroups,
    unregisterScrollProgressDebugControlGroup,
    updateScrollProgressDebugControlGroup
} from '../../../lib/debug/controls/registry';

import { createDebugPalette } from '../../../lib/debug/palette';

import { resetScrollProgressDebugRegistry } from '../../../lib/debug/registry';

import {
    resetScrollProgressTestMocks,
    runAnimationFrame,
    setupScrollProgressTestMocks
} from '../../helpers/scroll-progress-test-utils';

import {
    getPaletteActionButton,
    getPaletteControlButton,
    getPaletteControlGroupFooterActionButton,
    getPaletteControlGroupToggleButton,
    getPaletteDetailsPanel,
    registerPaletteTestItem
} from './helpers';
import { createScrollProgressDebugOverlayLayerVisibilityController } from '../../../lib/debug/overlay/layers';
import { createScrollProgressDebugOverlayControls } from '../../../lib/debug/overlay/controls';

import type { ScrollProgressDebugOverlayResolvedColors } from '../../../lib/debug/overlay/colors';

const resolvedOverlayColors = {
    target: '#facc15',
    'progress-start': '#22c55e',
    'progress-end': '#ff6644',
    root: '#60a5fa',
    margin: '#a855f7',
    intersection: '#f87171'
} satisfies ScrollProgressDebugOverlayResolvedColors;

describe('createDebugPalette control groups', () => {
    beforeEach(() => {
        setupScrollProgressTestMocks();
    });

    afterEach(() => {
        resetScrollProgressDebugControlGroups();
        resetScrollProgressDebugRegistry();
        resetScrollProgressTestMocks();
        document.body.innerHTML = '';
    });

    it('renders registered debug control groups', () => {
        registerScrollProgressDebugControlGroup({
            id: 'overlay-controls',
            label: 'Overlays',
            controls: [
                {
                    id: 'target',
                    type: 'toggle',
                    label: 'Target',
                    pressed: true,
                    ariaLabel: 'Toggle target overlay',
                    title: 'Show target overlay',
                    onActivate: vi.fn()
                },
                {
                    id: 'reset',
                    type: 'button',
                    label: 'Reset',
                    disabled: true,
                    ariaLabel: 'Reset overlay position',
                    onActivate: vi.fn()
                }
            ]
        });

        const palette = createDebugPalette();

        runAnimationFrame();

        const targetButton = getPaletteControlButton('overlay-controls', 'target');
        const resetButton = getPaletteControlButton('overlay-controls', 'reset');

        expect(document.body.textContent).toContain('Overlays');

        expect(targetButton).toBeInstanceOf(HTMLButtonElement);
        const targetRow = targetButton?.closest('.spdp-control-row');

        expect(targetRow).toBeInstanceOf(HTMLElement);
        expect(targetRow?.textContent).toContain('Target');
        expect(targetButton?.textContent).toContain('On');
        expect(targetButton?.classList.contains('spdp-control-switch')).toBe(true);
        expect(targetButton?.getAttribute('aria-pressed')).toBe('true');
        expect(targetButton?.getAttribute('aria-label')).toBe('Toggle target overlay');
        expect(targetButton?.getAttribute('title')).toBe('Show target overlay');

        expect(resetButton).toBeInstanceOf(HTMLButtonElement);
        expect(resetButton?.textContent).toContain('Reset');
        expect(resetButton?.hasAttribute('aria-pressed')).toBe(false);
        expect(resetButton?.hasAttribute('disabled')).toBe(true);
        expect(resetButton?.getAttribute('aria-label')).toBe('Reset overlay position');

        expect(document.querySelector('.spdp-control-group-footer')).toBeNull();

        palette.destroy();
    });

    it('keeps control groups and the tracker list visible with inline details open', () => {
        registerScrollProgressDebugControlGroup({
            id: 'overlay-controls',
            label: 'Overlays',
            controls: [
                {
                    id: 'target',
                    type: 'toggle',
                    label: 'Target',
                    pressed: true,
                    onActivate: vi.fn()
                }
            ]
        });

        const palette = createDebugPalette();
        const id = registerPaletteTestItem();

        runAnimationFrame();

        getPaletteActionButton('select', id)?.click();
        runAnimationFrame();

        expect(document.querySelector('.spdp-control-groups')).toBeInstanceOf(HTMLElement);
        expect(document.querySelector('.spdp-tracker-list')).toBeInstanceOf(HTMLUListElement);
        expect(getPaletteDetailsPanel()).toBeInstanceOf(HTMLElement);
        expect(getPaletteControlButton('overlay-controls', 'target')).toBeInstanceOf(
            HTMLButtonElement
        );

        palette.destroy();
    });

    it('renders registered control legend colors as decorative swatches', () => {
        registerScrollProgressDebugControlGroup({
            id: 'visual-controls',
            label: 'Visual controls',
            controls: [
                {
                    id: 'single-color',
                    type: 'toggle',
                    label: 'Single color',
                    legendColors: ['#facc15'],
                    pressed: true,
                    onActivate: vi.fn()
                },
                {
                    id: 'multiple-colors',
                    type: 'toggle',
                    label: 'Multiple colors',
                    legendColors: ['#22c55e', '#f97316'],
                    pressed: true,
                    onActivate: vi.fn()
                },
                {
                    id: 'without-colors',
                    type: 'toggle',
                    label: 'Without colors',
                    pressed: false,
                    onActivate: vi.fn()
                }
            ]
        });

        const palette = createDebugPalette();

        runAnimationFrame();

        const singleColorRow = getPaletteControlButton(
            'visual-controls',
            'single-color'
        )?.closest<HTMLElement>('.spdp-control-row');

        const multipleColorsRow = getPaletteControlButton(
            'visual-controls',
            'multiple-colors'
        )?.closest<HTMLElement>('.spdp-control-row');

        const withoutColorsRow = getPaletteControlButton(
            'visual-controls',
            'without-colors'
        )?.closest<HTMLElement>('.spdp-control-row');

        const readLegendColors = (row: HTMLElement | null | undefined): string[] => {
            return Array.from(
                row?.querySelectorAll<HTMLElement>('.spdp-control-legend-swatch') ?? []
            ).map((swatch) =>
                swatch.style.getPropertyValue('--sp-debug-palette-control-legend-color').trim()
            );
        };

        expect(
            singleColorRow?.querySelector('.spdp-control-legend')?.getAttribute('aria-hidden')
        ).toBe('true');

        expect(readLegendColors(singleColorRow)).toEqual(['#facc15']);

        expect(readLegendColors(multipleColorsRow)).toEqual(['#22c55e', '#f97316']);

        expect(withoutColorsRow?.querySelector('.spdp-control-legend')).toBeNull();

        palette.destroy();
    });

    it('activates registered debug controls through the registry', () => {
        const onActivate = vi.fn();

        registerScrollProgressDebugControlGroup({
            id: 'overlay-controls',
            label: 'Overlays',
            controls: [
                {
                    id: 'target',
                    type: 'toggle',
                    label: 'Target',
                    pressed: true,
                    onActivate
                }
            ]
        });

        const palette = createDebugPalette();

        runAnimationFrame();

        const targetButton = getPaletteControlButton('overlay-controls', 'target');

        expect(targetButton).toBeInstanceOf(HTMLButtonElement);

        targetButton?.click();

        expect(onActivate).toHaveBeenCalledTimes(1);

        palette.destroy();
    });

    it('does not activate disabled registered debug controls', () => {
        const onActivate = vi.fn();

        registerScrollProgressDebugControlGroup({
            id: 'overlay-controls',
            label: 'Overlays',
            controls: [
                {
                    id: 'target',
                    type: 'toggle',
                    label: 'Target',
                    pressed: true,
                    disabled: true,
                    onActivate
                }
            ]
        });

        const palette = createDebugPalette();

        runAnimationFrame();

        const targetButton = getPaletteControlButton('overlay-controls', 'target');

        expect(targetButton).toBeInstanceOf(HTMLButtonElement);
        expect(targetButton?.hasAttribute('disabled')).toBe(true);

        targetButton?.click();

        expect(onActivate).not.toHaveBeenCalled();

        palette.destroy();
    });

    it('updates when registered debug control groups change', () => {
        const groupId = registerScrollProgressDebugControlGroup({
            id: 'overlay-controls',
            label: 'Overlays',
            controls: [
                {
                    id: 'target',
                    type: 'toggle',
                    label: 'Target',
                    pressed: true,
                    onActivate: vi.fn()
                }
            ]
        });

        const palette = createDebugPalette();

        runAnimationFrame();

        expect(
            getPaletteControlButton('overlay-controls', 'target')?.getAttribute('aria-pressed')
        ).toBe('true');

        updateScrollProgressDebugControlGroup(groupId, {
            label: 'Overlay layers',
            controls: [
                {
                    id: 'target',
                    type: 'toggle',
                    label: 'Target',
                    pressed: false,
                    disabled: true,
                    onActivate: vi.fn()
                }
            ]
        });

        runAnimationFrame();

        const updatedButton = getPaletteControlButton('overlay-controls', 'target');

        expect(document.body.textContent).toContain('Overlay layers');
        expect(updatedButton?.getAttribute('aria-pressed')).toBe('false');
        expect(updatedButton?.hasAttribute('disabled')).toBe(true);

        unregisterScrollProgressDebugControlGroup(groupId);

        runAnimationFrame();

        expect(document.body.textContent).not.toContain('Overlay layers');
        expect(getPaletteControlButton('overlay-controls', 'target')).toBeNull();

        palette.destroy();
    });

    it('renders injected control groups as expanded panels with active counts', () => {
        registerScrollProgressDebugControlGroup({
            id: 'overlay-controls',
            label: 'Overlays',
            controls: [
                {
                    id: 'target',
                    type: 'toggle',
                    label: 'Target',
                    pressed: true,
                    onActivate: vi.fn()
                },
                {
                    id: 'progress',
                    type: 'toggle',
                    label: 'Progress',
                    pressed: true,
                    onActivate: vi.fn()
                },
                {
                    id: 'root',
                    type: 'toggle',
                    label: 'Root',
                    pressed: false,
                    onActivate: vi.fn()
                }
            ]
        });

        const palette = createDebugPalette();

        runAnimationFrame();

        const panel = document.querySelector<HTMLElement>(
            '.spdp-control-group-panel' + '[data-control-group-id="overlay-controls"]'
        );
        const toggleButton = getPaletteControlGroupToggleButton('overlay-controls');

        expect(panel).toBeInstanceOf(HTMLElement);
        expect(panel?.dataset.collapsed).toBe('false');

        expect(toggleButton).toBeInstanceOf(HTMLButtonElement);
        expect(toggleButton?.getAttribute('aria-expanded')).toBe('true');
        expect(toggleButton?.textContent).toContain('Overlays');
        expect(toggleButton?.textContent).toContain('2/3 active');

        expect(getPaletteControlButton('overlay-controls', 'target')).toBeInstanceOf(
            HTMLButtonElement
        );

        palette.destroy();
    });

    it('collapses and expands injected control group panels', () => {
        registerScrollProgressDebugControlGroup({
            id: 'overlay-controls',
            label: 'Overlays',
            controls: [
                {
                    id: 'target',
                    type: 'toggle',
                    label: 'Target',
                    pressed: true,
                    onActivate: vi.fn()
                }
            ],
            footerActions: [
                {
                    id: 'toggle-all',
                    label: 'Turn all on',
                    onActivate: vi.fn()
                }
            ]
        });

        const palette = createDebugPalette();

        runAnimationFrame();

        expect(getPaletteControlButton('overlay-controls', 'target')).toBeInstanceOf(
            HTMLButtonElement
        );

        expect(
            getPaletteControlGroupFooterActionButton('overlay-controls', 'toggle-all')
        ).toBeInstanceOf(HTMLButtonElement);

        const collapseButton = getPaletteControlGroupToggleButton('overlay-controls');

        expect(collapseButton).toBeInstanceOf(HTMLButtonElement);

        collapseButton?.focus();

        expect(document.activeElement).toBe(collapseButton);

        collapseButton?.click();

        runAnimationFrame();

        const collapsedPanel = document.querySelector<HTMLElement>(
            '.spdp-control-group-panel' + '[data-control-group-id="overlay-controls"]'
        );

        expect(collapsedPanel?.dataset.collapsed).toBe('true');

        const expandButton = getPaletteControlGroupToggleButton('overlay-controls');

        expect(expandButton).toBeInstanceOf(HTMLButtonElement);
        expect(expandButton).not.toBe(collapseButton);
        expect(expandButton?.getAttribute('aria-expanded')).toBe('false');
        expect(document.activeElement).toBe(expandButton);

        expect(getPaletteControlButton('overlay-controls', 'target')).toBeNull();

        expect(
            getPaletteControlGroupFooterActionButton('overlay-controls', 'toggle-all')
        ).toBeNull();

        expandButton?.click();

        runAnimationFrame();

        const expandedPanel = document.querySelector<HTMLElement>(
            '.spdp-control-group-panel' + '[data-control-group-id="overlay-controls"]'
        );

        expect(expandedPanel?.dataset.collapsed).toBe('false');

        const restoredCollapseButton = getPaletteControlGroupToggleButton('overlay-controls');

        expect(restoredCollapseButton).toBeInstanceOf(HTMLButtonElement);
        expect(restoredCollapseButton).not.toBe(expandButton);
        expect(restoredCollapseButton?.getAttribute('aria-expanded')).toBe('true');
        expect(document.activeElement).toBe(restoredCollapseButton);

        expect(getPaletteControlButton('overlay-controls', 'target')).toBeInstanceOf(
            HTMLButtonElement
        );

        expect(
            getPaletteControlGroupFooterActionButton('overlay-controls', 'toggle-all')
        ).toBeInstanceOf(HTMLButtonElement);

        palette.destroy();
    });

    it('renders and activates registered control group footer actions', () => {
        const onActivate = vi.fn();

        registerScrollProgressDebugControlGroup({
            id: 'overlay-controls',
            label: 'Overlays',
            controls: [],
            footerActions: [
                {
                    id: 'toggle-all',
                    label: 'Turn all on',
                    ariaLabel: 'Turn all overlay layers on',
                    title: 'Show all overlay layers',
                    onActivate
                }
            ]
        });

        const palette = createDebugPalette();

        runAnimationFrame();

        const footer = document.querySelector<HTMLElement>('.spdp-control-group-footer');
        const actionButton = getPaletteControlGroupFooterActionButton(
            'overlay-controls',
            'toggle-all'
        );

        expect(footer).toBeInstanceOf(HTMLElement);
        expect(actionButton).toBeInstanceOf(HTMLButtonElement);
        expect(actionButton?.textContent).toContain('Turn all on');
        expect(actionButton?.getAttribute('aria-label')).toBe('Turn all overlay layers on');
        expect(actionButton?.getAttribute('title')).toBe('Show all overlay layers');

        actionButton?.click();

        expect(onActivate).toHaveBeenCalledTimes(1);

        palette.destroy();
    });

    it('does not activate disabled control group footer actions', () => {
        const onActivate = vi.fn();

        registerScrollProgressDebugControlGroup({
            id: 'overlay-controls',
            label: 'Overlays',
            controls: [],
            footerActions: [
                {
                    id: 'toggle-all',
                    label: 'Turn all on',
                    disabled: true,
                    onActivate
                }
            ]
        });

        const palette = createDebugPalette();

        runAnimationFrame();

        const actionButton = getPaletteControlGroupFooterActionButton(
            'overlay-controls',
            'toggle-all'
        );

        expect(actionButton).toBeInstanceOf(HTMLButtonElement);
        expect(actionButton?.hasAttribute('disabled')).toBe(true);

        actionButton?.click();

        expect(onActivate).not.toHaveBeenCalled();

        palette.destroy();
    });

    it('updates registered control group footer actions', () => {
        const groupId = registerScrollProgressDebugControlGroup({
            id: 'overlay-controls',
            label: 'Overlays',
            controls: [],
            footerActions: [
                {
                    id: 'toggle-all',
                    label: 'Turn all on',
                    onActivate: vi.fn()
                }
            ]
        });

        const palette = createDebugPalette();

        runAnimationFrame();

        expect(
            getPaletteControlGroupFooterActionButton('overlay-controls', 'toggle-all')?.textContent
        ).toContain('Turn all on');

        updateScrollProgressDebugControlGroup(groupId, {
            footerActions: [
                {
                    id: 'toggle-all',
                    label: 'Turn all off',
                    disabled: true,
                    onActivate: vi.fn()
                }
            ]
        });

        runAnimationFrame();

        const updatedButton = getPaletteControlGroupFooterActionButton(
            'overlay-controls',
            'toggle-all'
        );

        expect(updatedButton?.textContent).toContain('Turn all off');
        expect(updatedButton?.hasAttribute('disabled')).toBe(true);

        updateScrollProgressDebugControlGroup(groupId, {
            footerActions: []
        });

        runAnimationFrame();

        expect(document.querySelector('.spdp-control-group-footer')).toBeNull();

        palette.destroy();
    });

    it('renders the overlay toggle-all action and active count', () => {
        const layerVisibility = createScrollProgressDebugOverlayLayerVisibilityController();

        const overlayControls = createScrollProgressDebugOverlayControls(
            layerVisibility,
            resolvedOverlayColors,
            {
                state: {
                    enabled: false,
                    available: false
                },
                onToggle: () => {}
            }
        );

        const groupId = getScrollProgressDebugControlGroupsState().groups[0].id;

        const palette = createDebugPalette();

        runAnimationFrame();

        expect(getPaletteControlGroupToggleButton(groupId)?.textContent).toContain('0/5 active');
        expect(
            getPaletteControlGroupFooterActionButton(groupId, 'toggle-all')?.textContent
        ).toContain('Turn all on');

        getPaletteControlGroupFooterActionButton(groupId, 'toggle-all')?.click();

        runAnimationFrame();

        expect(getPaletteControlGroupToggleButton(groupId)?.textContent).toContain('5/5 active');
        expect(
            getPaletteControlGroupFooterActionButton(groupId, 'toggle-all')?.textContent
        ).toContain('Turn all off');

        getPaletteControlGroupFooterActionButton(groupId, 'toggle-all')?.click();

        runAnimationFrame();

        expect(getPaletteControlGroupToggleButton(groupId)?.textContent).toContain('0/5 active');
        expect(
            getPaletteControlGroupFooterActionButton(groupId, 'toggle-all')?.textContent
        ).toContain('Turn all on');

        overlayControls.destroy();
        palette.destroy();
    });
});
