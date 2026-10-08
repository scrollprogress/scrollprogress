// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { registerScrollProgressDebugItem } from '@scrollprogress/scrollprogress/debug/registry';

import {
    createDebugPalette,
    registerDebugPaletteControlGroup
} from '@scrollprogress/scrollprogress/debug/palette';

import { createDebugOverlay } from '@scrollprogress/scrollprogress/debug/overlay';

import {
    resetScrollProgressTestMocks,
    runAnimationFrame,
    setupScrollProgressTestMocks
} from '../../src/tests/helpers/scroll-progress-test-utils';

const cleanupCallbacks: Array<() => void> = [];

beforeEach(() => {
    setupScrollProgressTestMocks();
});

afterEach(() => {
    for (const cleanup of cleanupCallbacks.splice(0).reverse()) {
        cleanup();
    }

    resetScrollProgressTestMocks();
    vi.restoreAllMocks();
    document.body.innerHTML = '';
});

describe('debug overlay package entry', () => {
    it('shares registered debug items with the overlay entry', () => {
        const target = document.createElement('div');

        target.getBoundingClientRect = () =>
            ({
                left: 40,
                top: 60,
                width: 240,
                height: 120,
                right: 280,
                bottom: 180,
                x: 40,
                y: 60,
                toJSON: () => ({})
            }) as DOMRect;

        document.body.append(target);

        const debugItem = registerScrollProgressDebugItem({
            debugId: 'built-overlay-entry-target',
            element: target
        });

        const overlay = createDebugOverlay({
            visibleLayers: ['target']
        });

        cleanupCallbacks.push(() => {
            debugItem.destroy();
            overlay.destroy();
        });

        const targetLayer = document.querySelector<HTMLElement>('[data-layer="target"]');

        expect(targetLayer).toBeInstanceOf(HTMLElement);
        expect(targetLayer?.dataset.hasGeometry).toBe('true');
        expect(targetLayer?.style.transform).toBe('translate3d(40px, 60px, 0)');
        expect(targetLayer?.style.width).toBe('240px');
        expect(targetLayer?.style.height).toBe('120px');
    });

    it('shares overlay controls with the palette entry', () => {
        const overlay = createDebugOverlay({
            visibleLayers: []
        });

        cleanupCallbacks.push(() => {
            overlay.destroy();
        });

        const palette = createDebugPalette();

        cleanupCallbacks.push(() => {
            palette.destroy();
        });

        runAnimationFrame();

        const overlayPanel = Array.from(
            document.querySelectorAll<HTMLElement>('.spdp-control-group-panel')
        ).find((panel) => panel.textContent?.includes('Overlays'));

        expect(overlayPanel).toBeInstanceOf(HTMLElement);

        const targetRow = Array.from(
            overlayPanel?.querySelectorAll<HTMLElement>('.spdp-control-row') ?? []
        ).find((row) => row.textContent?.includes('Target'));

        const targetButton = targetRow?.querySelector<HTMLButtonElement>('button');

        expect(targetButton).toBeInstanceOf(HTMLButtonElement);
        expect(targetButton?.getAttribute('aria-pressed')).toBe('false');

        expect(overlay.getLayerVisibilityState().target).toBe(false);

        targetButton?.click();

        expect(overlay.getLayerVisibilityState().target).toBe(true);

        runAnimationFrame();

        const updatedTargetRow = Array.from(
            document.querySelectorAll<HTMLElement>('.spdp-control-group-panel .spdp-control-row')
        ).find((row) => row.textContent?.includes('Target'));

        const updatedTargetButton = updatedTargetRow?.querySelector<HTMLButtonElement>('button');

        expect(updatedTargetButton?.getAttribute('aria-pressed')).toBe('true');
    });

    it('supports third-party declarative palette controls', () => {
        const onActivate = vi.fn();
        const controls = registerDebugPaletteControlGroup({
            label: 'Snapshot',
            controls: [
                {
                    id: 'copy',
                    type: 'button',
                    label: 'Copy snapshot',
                    onActivate
                }
            ]
        });
        const palette = createDebugPalette();

        cleanupCallbacks.push(() => {
            palette.destroy();
            controls.destroy();
        });

        runAnimationFrame();

        const button = Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find(
            (candidate) => candidate.textContent?.includes('Copy snapshot')
        );

        button?.click();

        expect(onActivate).toHaveBeenCalledWith({
            registryState: { selectedId: null, items: [] },
            selectedItem: null
        });
    });
});
