// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createDebugPalette } from '../../../lib/debug/palette';

import { resetScrollProgressDebugRegistry } from '../../../lib/debug/registry';

import {
    resetScrollProgressTestMocks,
    runAnimationFrame,
    setWindowSize,
    setupScrollProgressTestMocks
} from '../../helpers/scroll-progress-test-utils';

import {
    createPointerTestEvent,
    getPaletteActionButton,
    getPaletteDragHandle,
    getPaletteElement,
    mockElementRect
} from './helpers';

describe('createDebugPalette drag', () => {
    beforeEach(() => {
        setupScrollProgressTestMocks();
    });

    afterEach(() => {
        resetScrollProgressDebugRegistry();
        resetScrollProgressTestMocks();
        document.body.innerHTML = '';
    });

    it('renders a dedicated drag handle', () => {
        const palette = createDebugPalette();

        runAnimationFrame();

        const dragHandle = getPaletteDragHandle();

        expect(dragHandle).toBeInstanceOf(HTMLButtonElement);
        expect(dragHandle?.getAttribute('data-scroll-progress-debug-action')).toBeNull();
        expect(dragHandle?.classList.contains('spdp-button')).toBe(true);
        expect(dragHandle?.classList.contains('spdp-icon-button')).toBe(true);
        expect(dragHandle?.classList.contains('spdp-handle-button')).toBe(true);
        expect(dragHandle?.classList.contains('spdp-drag-handle')).toBe(true);
        expect(dragHandle?.getAttribute('aria-label')).toBe('Move palette');

        palette.destroy();
    });

    it('moves the palette from the drag handle', () => {
        const palette = createDebugPalette();

        runAnimationFrame();

        const element = getPaletteElement();
        const dragHandle = getPaletteDragHandle();

        expect(element).toBeInstanceOf(HTMLElement);
        expect(dragHandle).toBeInstanceOf(HTMLButtonElement);

        mockElementRect(element as HTMLElement, {
            left: 100,
            top: 120,
            width: 300,
            height: 240
        });

        dragHandle?.dispatchEvent(
            createPointerTestEvent('pointerdown', {
                pointerId: 1,
                pointerType: 'mouse',
                button: 0,
                clientX: 20,
                clientY: 30
            })
        );

        expect(element?.classList.contains('spdp-is-dragging')).toBe(true);
        expect(element?.style.left).toBe('100px');
        expect(element?.style.top).toBe('120px');
        expect(element?.style.right).toBe('auto');
        expect(element?.style.bottom).toBe('auto');

        window.dispatchEvent(
            createPointerTestEvent('pointermove', {
                pointerId: 1,
                pointerType: 'mouse',
                clientX: 70,
                clientY: 90
            })
        );

        expect(element?.style.left).toBe('150px');
        expect(element?.style.top).toBe('180px');

        window.dispatchEvent(
            createPointerTestEvent('pointerup', {
                pointerId: 1,
                pointerType: 'mouse'
            })
        );

        expect(element?.classList.contains('spdp-is-dragging')).toBe(false);

        palette.destroy();
    });

    it('keeps a dragged palette inside the viewport after resize', () => {
        setWindowSize({ width: 1000, height: 800 });

        const palette = createDebugPalette();

        runAnimationFrame();

        const element = getPaletteElement();
        const dragHandle = getPaletteDragHandle();

        expect(element).toBeInstanceOf(HTMLElement);
        expect(dragHandle).toBeInstanceOf(HTMLButtonElement);

        mockElementRect(element as HTMLElement, {
            left: 100,
            top: 120,
            width: 300,
            height: 240
        });

        dragHandle?.dispatchEvent(
            createPointerTestEvent('pointerdown', {
                pointerId: 1,
                pointerType: 'mouse',
                button: 0,
                clientX: 20,
                clientY: 30
            })
        );

        window.dispatchEvent(
            createPointerTestEvent('pointermove', {
                pointerId: 1,
                pointerType: 'mouse',
                clientX: 520,
                clientY: 330
            })
        );

        window.dispatchEvent(
            createPointerTestEvent('pointerup', {
                pointerId: 1,
                pointerType: 'mouse'
            })
        );

        expect(element?.style.left).toBe('600px');
        expect(element?.style.top).toBe('420px');

        mockElementRect(element as HTMLElement, {
            left: 600,
            top: 420,
            width: 300,
            height: 240
        });

        setWindowSize({ width: 700, height: 500 });

        window.dispatchEvent(new Event('resize'));

        expect(element?.style.left).toBe('384px');
        expect(element?.style.top).toBe('244px');
        expect(element?.style.right).toBe('auto');
        expect(element?.style.bottom).toBe('auto');

        palette.destroy();
    });

    it('preserves the desktop position while the responsive drag handle is hidden', () => {
        const palette = createDebugPalette();

        runAnimationFrame();

        const element = getPaletteElement();
        const dragHandle = getPaletteDragHandle();

        expect(element).toBeInstanceOf(HTMLElement);
        expect(dragHandle).toBeInstanceOf(HTMLButtonElement);

        mockElementRect(element as HTMLElement, {
            left: 100,
            top: 120,
            width: 300,
            height: 240
        });

        dragHandle?.dispatchEvent(
            createPointerTestEvent('pointerdown', {
                pointerId: 1,
                pointerType: 'mouse',
                button: 0,
                clientX: 20,
                clientY: 30
            })
        );

        window.dispatchEvent(
            createPointerTestEvent('pointermove', {
                pointerId: 1,
                pointerType: 'mouse',
                clientX: 70,
                clientY: 90
            })
        );

        window.dispatchEvent(
            createPointerTestEvent('pointerup', {
                pointerId: 1,
                pointerType: 'mouse'
            })
        );

        expect(element?.style.left).toBe('150px');
        expect(element?.style.top).toBe('180px');

        if (dragHandle) {
            dragHandle.style.display = 'none';
        }

        setWindowSize({ width: 700, height: 500 });
        window.dispatchEvent(new Event('resize'));

        expect(element?.style.left).toBe('150px');
        expect(element?.style.top).toBe('180px');

        if (dragHandle) {
            dragHandle.style.display = '';
        }

        palette.destroy();
    });

    it('does not start dragging from a hidden responsive handle', () => {
        const palette = createDebugPalette();

        runAnimationFrame();

        const element = getPaletteElement();
        const dragHandle = getPaletteDragHandle();

        expect(element).toBeInstanceOf(HTMLElement);
        expect(dragHandle).toBeInstanceOf(HTMLButtonElement);

        if (dragHandle) {
            dragHandle.style.display = 'none';
        }

        dragHandle?.dispatchEvent(
            createPointerTestEvent('pointerdown', {
                pointerId: 1,
                pointerType: 'touch',
                clientX: 20,
                clientY: 30
            })
        );

        expect(element?.classList.contains('spdp-is-dragging')).toBe(false);
        expect(element?.style.left).toBe('');
        expect(element?.style.top).toBe('');

        palette.destroy();
    });

    it('removes active drag listeners when the palette is destroyed', () => {
        const palette = createDebugPalette();

        runAnimationFrame();

        const element = getPaletteElement();
        const dragHandle = getPaletteDragHandle();

        expect(element).toBeInstanceOf(HTMLElement);
        expect(dragHandle).toBeInstanceOf(HTMLButtonElement);

        mockElementRect(element as HTMLElement, {
            left: 100,
            top: 120,
            width: 300,
            height: 240
        });

        dragHandle?.dispatchEvent(
            createPointerTestEvent('pointerdown', {
                pointerId: 1,
                pointerType: 'mouse',
                button: 0,
                clientX: 20,
                clientY: 30
            })
        );

        expect(element?.classList.contains('spdp-is-dragging')).toBe(true);

        palette.destroy();

        expect(element?.classList.contains('spdp-is-dragging')).toBe(false);
        expect(getPaletteElement()).toBeNull();

        window.dispatchEvent(
            createPointerTestEvent('pointermove', {
                pointerId: 1,
                pointerType: 'mouse',
                clientX: 120,
                clientY: 140
            })
        );

        expect(element?.style.left).toBe('100px');
        expect(element?.style.top).toBe('120px');
    });

    it('does not start dragging from non-handle controls', () => {
        const palette = createDebugPalette();

        runAnimationFrame();

        const element = getPaletteElement();
        const collapseButton = getPaletteActionButton('toggle-collapse');

        expect(element).toBeInstanceOf(HTMLElement);
        expect(collapseButton).toBeInstanceOf(HTMLButtonElement);

        mockElementRect(element as HTMLElement, {
            left: 100,
            top: 120,
            width: 300,
            height: 240
        });

        collapseButton?.dispatchEvent(
            createPointerTestEvent('pointerdown', {
                pointerId: 1,
                pointerType: 'mouse',
                button: 0,
                clientX: 20,
                clientY: 30
            })
        );

        expect(element?.classList.contains('spdp-is-dragging')).toBe(false);
        expect(element?.style.left).toBe('');
        expect(element?.style.top).toBe('');

        palette.destroy();
    });
});
