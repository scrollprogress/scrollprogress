// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createDebugPalette } from '../../../lib/debug/palette';

import { resetScrollProgressDebugRegistry } from '../../../lib/debug/registry';

import {
    resetScrollProgressTestMocks,
    runAnimationFrame,
    setupScrollProgressTestMocks
} from '../../helpers/scroll-progress-test-utils';

import {
    getPaletteActionButton,
    getPaletteElement,
    getPaletteTrackerCard,
    registerPaletteTestItem
} from './helpers';

describe('createDebugPalette UI state', () => {
    beforeEach(() => {
        setupScrollProgressTestMocks();
    });

    afterEach(() => {
        resetScrollProgressDebugRegistry();
        resetScrollProgressTestMocks();
        document.body.innerHTML = '';
    });

    it('collapses and expands the debug palette', () => {
        const palette = createDebugPalette();

        runAnimationFrame();

        const id = registerPaletteTestItem({
            debugId: 'collapse-demo',
            label: 'Collapse demo'
        });

        runAnimationFrame();

        getPaletteActionButton('select', id)?.click();
        runAnimationFrame();

        const element = getPaletteElement();
        const collapseButton = getPaletteActionButton('toggle-collapse');

        expect(element).toBeInstanceOf(HTMLElement);
        expect(collapseButton).toBeInstanceOf(HTMLButtonElement);
        expect(collapseButton?.getAttribute('aria-expanded')).toBe('true');
        expect(element?.classList.contains('spdp-has-open-details')).toBe(true);

        expect(getPaletteTrackerCard(id)).toBeInstanceOf(HTMLElement);

        collapseButton?.click();

        runAnimationFrame();

        expect(element?.classList.contains('spdp-is-collapsed')).toBe(true);
        expect(element?.classList.contains('spdp-has-open-details')).toBe(false);

        const expandButton = getPaletteActionButton('toggle-collapse');

        expect(expandButton).toBeInstanceOf(HTMLButtonElement);
        expect(expandButton?.getAttribute('aria-expanded')).toBe('false');

        expect(getPaletteTrackerCard(id)).toBeNull();

        expandButton?.click();

        runAnimationFrame();

        expect(element?.classList.contains('spdp-is-collapsed')).toBe(false);
        expect(element?.classList.contains('spdp-has-open-details')).toBe(true);

        expect(getPaletteTrackerCard(id)).toBeInstanceOf(HTMLElement);

        palette.destroy();
    });
});
