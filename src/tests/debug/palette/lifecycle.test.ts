// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createDebugPalette } from '../../../lib/debug/palette';

import { resetScrollProgressDebugRegistry } from '../../../lib/debug/registry';

import {
    resetScrollProgressTestMocks,
    runAnimationFrame,
    setupScrollProgressTestMocks
} from '../../helpers/scroll-progress-test-utils';

import { getPaletteContentElement, getPaletteElement, registerPaletteTestItem } from './helpers';

describe('createDebugPalette lifecycle', () => {
    beforeEach(() => {
        setupScrollProgressTestMocks();
    });

    afterEach(() => {
        resetScrollProgressDebugRegistry();
        resetScrollProgressTestMocks();
        document.body.innerHTML = '';
    });

    it('creates a debug palette container', () => {
        const palette = createDebugPalette();

        const element = getPaletteElement();

        expect(element).toBeInstanceOf(HTMLElement);

        palette.destroy();
    });

    it('removes the debug palette container on destroy', () => {
        const palette = createDebugPalette();

        palette.destroy();

        expect(getPaletteElement()).toBeNull();
    });

    it('can be destroyed multiple times', () => {
        const palette = createDebugPalette();

        palette.destroy();
        palette.destroy();

        expect(getPaletteElement()).toBeNull();
    });

    it('mounts into a custom target', () => {
        const target = document.createElement('div');

        document.body.appendChild(target);

        const palette = createDebugPalette({ target });

        expect(getPaletteElement(target)).toBeInstanceOf(HTMLElement);

        palette.destroy();
    });

    it('adds a custom class name', () => {
        const palette = createDebugPalette({
            className: 'custom-debug-palette'
        });

        const element = getPaletteElement();

        expect(element?.classList.contains('scroll-progress-debug-palette')).toBe(true);
        expect(element?.classList.contains('custom-debug-palette')).toBe(true);

        palette.destroy();
    });

    it('applies a theme name without replacing custom classes', () => {
        const palette = createDebugPalette({
            className: 'custom-debug-palette',
            theme: 'tron'
        });

        const element = getPaletteElement();

        expect(element?.classList.contains('custom-debug-palette')).toBe(true);
        expect(element?.dataset.scrollProgressDebugTheme).toBe('tron');

        palette.destroy();
    });

    it('does not add a theme attribute by default', () => {
        const palette = createDebugPalette();

        expect(getPaletteElement()?.hasAttribute('data-scroll-progress-debug-theme')).toBe(false);

        palette.destroy();
    });

    it('renders palette content inside a dedicated content container', () => {
        const palette = createDebugPalette();

        runAnimationFrame();

        const content = getPaletteContentElement();

        expect(content).toBeInstanceOf(HTMLElement);
        expect(content?.textContent).toContain('Scroll Progress');

        palette.destroy();
    });

    it('does not update the DOM after destroy', () => {
        const palette = createDebugPalette();

        palette.destroy();

        registerPaletteTestItem({
            debugId: 'demo',
            label: 'Demo'
        });

        expect(document.body.textContent).not.toContain('Demo');
    });
});
