// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createDebugPalette } from '../../../lib/debug/palette';

import {
    resetScrollProgressDebugRegistry,
    unregisterScrollProgressDebugItem,
    updateScrollProgressDebugItem
} from '../../../lib/debug/registry';

import {
    resetScrollProgressTestMocks,
    runAnimationFrame,
    setupScrollProgressTestMocks
} from '../../helpers/scroll-progress-test-utils';

import {
    expectDetailsRowValue,
    getPaletteActionButton,
    getPaletteDetailsPanel,
    getPaletteElement,
    getPaletteTrackerCard,
    registerPaletteTestItem
} from './helpers';

describe('createDebugPalette actions', () => {
    beforeEach(() => {
        setupScrollProgressTestMocks();
    });

    afterEach(() => {
        resetScrollProgressDebugRegistry();
        resetScrollProgressTestMocks();
        document.body.innerHTML = '';
    });

    it('restores focus to an item action after a registry render', () => {
        const palette = createDebugPalette();

        const id = registerPaletteTestItem();

        runAnimationFrame();

        const button = getPaletteActionButton('select', id);

        expect(button).toBeInstanceOf(HTMLButtonElement);

        button?.focus();

        expect(document.activeElement).toBe(button);

        updateScrollProgressDebugItem(id, { label: 'Updated demo' });

        runAnimationFrame();

        const updatedButton = getPaletteActionButton('select', id);

        expect(updatedButton).toBeInstanceOf(HTMLButtonElement);
        expect(updatedButton).not.toBe(button);
        expect(document.activeElement).toBe(updatedButton);

        palette.destroy();
    });

    it('preserves palette scroll when a registry render restores focus', () => {
        const palette = createDebugPalette();
        const id = registerPaletteTestItem();

        runAnimationFrame();

        const element = getPaletteElement();
        const button = getPaletteActionButton('select', id);

        expect(element).toBeInstanceOf(HTMLElement);
        expect(button).toBeInstanceOf(HTMLButtonElement);

        button?.focus();

        if (element) {
            element.scrollLeft = 12;
            element.scrollTop = 160;
        }

        const originalFocus = HTMLButtonElement.prototype.focus;
        const focus = vi.spyOn(HTMLButtonElement.prototype, 'focus').mockImplementation(function (
            this: HTMLButtonElement,
            options
        ) {
            originalFocus.call(this, options);

            if (element) {
                element.scrollLeft = 0;
                element.scrollTop = 0;
            }
        });

        updateScrollProgressDebugItem(id, { label: 'Updated demo' });
        runAnimationFrame();

        expect(focus).toHaveBeenCalled();
        expect(element?.scrollLeft).toBe(12);
        expect(element?.scrollTop).toBe(160);

        palette.destroy();
    });

    it('selects an item through the registry', () => {
        const palette = createDebugPalette();

        const firstId = registerPaletteTestItem({
            debugId: 'first-demo',
            label: 'First demo'
        });

        const secondId = registerPaletteTestItem({
            debugId: 'second-demo',
            label: 'Second demo'
        });

        runAnimationFrame();

        const secondSelectButton = getPaletteActionButton('select', secondId);

        expect(secondSelectButton).toBeInstanceOf(HTMLButtonElement);

        secondSelectButton?.click();

        runAnimationFrame();

        const firstItem = getPaletteTrackerCard(firstId);
        const secondItem = getPaletteTrackerCard(secondId);

        const firstSelectButton = getPaletteActionButton('select', firstId);
        const updatedSecondSelectButton = getPaletteActionButton('select', secondId);

        expect(firstItem).toBeInstanceOf(HTMLElement);
        expect(secondItem).toBeInstanceOf(HTMLElement);
        expect(firstSelectButton).toBeInstanceOf(HTMLButtonElement);
        expect(updatedSecondSelectButton).toBeInstanceOf(HTMLButtonElement);

        expect(firstItem?.getAttribute('data-selected')).toBe('false');
        expect(firstSelectButton?.hasAttribute('aria-current')).toBe(false);

        expect(secondItem?.getAttribute('data-selected')).toBe('true');
        expect(updatedSecondSelectButton?.getAttribute('aria-current')).toBe('true');

        const details = getPaletteDetailsPanel();

        expect(details).toBeInstanceOf(HTMLElement);
        expect(secondItem?.textContent).toContain('Second demo');

        expectDetailsRowValue('debug id', 'second-demo');

        palette.destroy();
    });

    it('closes details through the selected item without clearing selection or focus', () => {
        const palette = createDebugPalette();
        const id = registerPaletteTestItem({
            debugId: 'toggle-details-demo',
            label: 'Toggle details demo'
        });

        runAnimationFrame();

        const element = getPaletteElement();
        const initialSelectButton = getPaletteActionButton('select', id);

        initialSelectButton?.click();
        runAnimationFrame();

        const expandedSelectButton = getPaletteActionButton('select', id);

        expect(element?.classList.contains('spdp-has-open-details')).toBe(true);
        expect(expandedSelectButton).toBeInstanceOf(HTMLButtonElement);
        expect(expandedSelectButton?.getAttribute('aria-expanded')).toBe('true');

        expandedSelectButton?.focus();
        expandedSelectButton?.click();
        runAnimationFrame();

        const selectedButton = getPaletteActionButton('select', id);

        expect(getPaletteDetailsPanel()).toBeNull();
        expect(element?.classList.contains('spdp-has-open-details')).toBe(false);
        expect(selectedButton?.getAttribute('aria-current')).toBe('true');
        expect(selectedButton?.getAttribute('aria-expanded')).toBe('false');
        expect(document.activeElement).toBe(selectedButton);

        palette.destroy();
    });

    it('keeps focus on the selected item when inline details open', () => {
        const palette = createDebugPalette();
        const id = registerPaletteTestItem({
            debugId: 'inline-focus-demo',
            label: 'Inline focus demo'
        });

        runAnimationFrame();

        const selectedButton = getPaletteActionButton('select', id);

        selectedButton?.focus();
        selectedButton?.click();
        runAnimationFrame();

        const updatedSelectedButton = getPaletteActionButton('select', id);
        const details = getPaletteDetailsPanel();

        expect(document.activeElement).toBe(updatedSelectedButton);
        expect(details?.parentElement).toBe(getPaletteTrackerCard(id));

        palette.destroy();
    });

    it('keeps details closed when the first item is registered after an empty registry', () => {
        const palette = createDebugPalette();
        const firstId = registerPaletteTestItem({ debugId: 'first-demo' });

        runAnimationFrame();

        const element = getPaletteElement();

        expect(getPaletteActionButton('select', firstId)?.getAttribute('aria-current')).toBe(
            'true'
        );
        expect(getPaletteDetailsPanel()).toBeNull();
        expect(element?.classList.contains('spdp-has-open-details')).toBe(false);

        unregisterScrollProgressDebugItem(firstId);
        runAnimationFrame();

        expect(element?.classList.contains('spdp-has-open-details')).toBe(false);

        const secondId = registerPaletteTestItem({ debugId: 'second-demo' });

        runAnimationFrame();

        expect(getPaletteActionButton('select', secondId)).toBeInstanceOf(HTMLButtonElement);
        expect(getPaletteDetailsPanel()).toBeNull();
        expect(element?.classList.contains('spdp-has-open-details')).toBe(false);

        palette.destroy();
    });

    it('scrolls only the palette enough to reveal the start of inline details', () => {
        const palette = createDebugPalette();
        const id = registerPaletteTestItem();

        runAnimationFrame();

        const element = getPaletteElement();
        const selectButton = getPaletteActionButton('select', id);
        const pageScrollTop = window.scrollY;

        expect(element).toBeInstanceOf(HTMLElement);
        expect(selectButton).toBeInstanceOf(HTMLButtonElement);

        if (element) {
            element.scrollTop = 100;
        }

        const rect = vi
            .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
            .mockImplementation(function (this: HTMLElement) {
                let top = 0;
                let bottom = 0;

                if (this === element) {
                    bottom = 300;
                } else if (this.classList.contains('spdp-header')) {
                    bottom = 50;
                } else if (this.dataset.scrollProgressDebugAction === 'select') {
                    top = 240;
                    bottom = 280;
                } else if (this.classList.contains('spdp-details-readout')) {
                    top = 280;
                    bottom = 360;
                }

                return {
                    x: 0,
                    y: top,
                    left: 0,
                    top,
                    right: 320,
                    bottom,
                    width: 320,
                    height: bottom - top,
                    toJSON: () => ({})
                } as DOMRect;
            });

        selectButton?.click();
        runAnimationFrame();

        expect(element?.scrollTop).toBe(160);
        expect(window.scrollY).toBe(pageScrollTop);

        rect.mockRestore();

        palette.destroy();
    });
});
