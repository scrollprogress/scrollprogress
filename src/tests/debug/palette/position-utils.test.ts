// @vitest-environment happy-dom

import { afterEach, describe, expect, it } from 'vitest';

import {
    clampPaletteIntoViewport,
    clampPalettePosition,
    readPaletteViewportSpacing
} from '../../../lib/debug/palette/utils/position-utils';

import {
    resetScrollProgressTestMocks,
    setWindowSize
} from '../../helpers/scroll-progress-test-utils';

import { mockElementRect } from './helpers';

afterEach(() => {
    resetScrollProgressTestMocks();
    document.body.innerHTML = '';
});

describe('debug palette position utils', () => {
    it.each([
        { value: 100, size: 300, viewportSize: 1000, expected: 100 },
        { value: -20, size: 300, viewportSize: 1000, expected: 16 },
        { value: 800, size: 300, viewportSize: 1000, expected: 684 },
        { value: 100, size: 1000, viewportSize: 800, expected: 16 }
    ])(
        'clamps $value to $expected for the available viewport',
        ({ value, size, viewportSize, expected }) => {
            expect(clampPalettePosition(value, size, viewportSize, 16)).toBe(expected);
        }
    );

    it('reads the palette viewport spacing token', () => {
        const element = document.createElement('div');

        element.style.setProperty('--sp-debug-palette-token-viewport-spacing', '24px');

        document.body.appendChild(element);

        expect(readPaletteViewportSpacing(element)).toBe(24);
    });

    it('falls back when the palette viewport spacing token is invalid', () => {
        const element = document.createElement('div');

        element.style.setProperty('--sp-debug-palette-token-viewport-spacing', 'invalid');

        document.body.appendChild(element);

        expect(readPaletteViewportSpacing(element)).toBe(16);
    });

    it('clamps both palette axes into the viewport', () => {
        setWindowSize({ width: 1000, height: 800 });

        const element = document.createElement('div');

        element.style.setProperty('--sp-debug-palette-token-viewport-spacing', '24px');

        document.body.appendChild(element);

        mockElementRect(element, {
            left: -20,
            top: 700,
            width: 300,
            height: 240
        });

        clampPaletteIntoViewport(element);

        expect(element.style.left).toBe('24px');
        expect(element.style.top).toBe('536px');
        expect(element.style.right).toBe('auto');
        expect(element.style.bottom).toBe('auto');
    });
});
