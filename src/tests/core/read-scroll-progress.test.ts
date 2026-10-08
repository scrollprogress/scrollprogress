// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { readScrollProgress } from '../../lib/read-scroll-progress';

import {
    createElementWithRect,
    setElementSize,
    setWindowSize
} from '../helpers/scroll-progress-test-utils';

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('readScrollProgress', () => {
    it.each(['x', 'y'] as const)('excludes the custom root border from the %s origin', (axis) => {
        const root = createElementWithRect({ top: 100, left: 100, width: 520, height: 520 });
        setElementSize(root, { width: 500, height: 500 });
        Object.defineProperties(root, { clientTop: { value: 10 }, clientLeft: { value: 10 } });
        const target = createElementWithRect({ top: 335, left: 335, width: 150, height: 150 });
        expect(readScrollProgress(target, { start: 0.8, end: 0.4, axis, root })).toBe(0.5);
    });
    it('reads vertical progress from top, height and window.innerHeight', () => {
        setWindowSize({ height: 1000 });

        const element = createElementWithRect({
            top: 450,
            height: 300
        });

        const progress = readScrollProgress(element, {
            start: 0.8,
            end: 0.4,
            axis: 'y'
        });

        expect(progress).toBe(0.5);
    });

    it('uses the vertical axis by default', () => {
        setWindowSize({
            width: 2000,
            height: 1000
        });

        const element = createElementWithRect({
            top: 450,
            height: 300,
            left: 450,
            width: 300
        });

        const progress = readScrollProgress(element, {
            start: 0.8,
            end: 0.4
        });

        expect(progress).toBe(0.5);
    });

    it('reads horizontal progress from left, width and window.innerWidth', () => {
        setWindowSize({ width: 1000 });

        const element = createElementWithRect({
            left: 450,
            width: 300
        });

        const progress = readScrollProgress(element, {
            start: 0.8,
            end: 0.4,
            axis: 'x'
        });

        expect(progress).toBe(0.5);
    });

    it('reads the current viewport size on each call', () => {
        const element = createElementWithRect({
            left: 450,
            width: 300
        });

        const options = {
            start: 0.8,
            end: 0.4,
            axis: 'x' as const
        };

        setWindowSize({ width: 1000 });

        expect(readScrollProgress(element, options)).toBe(0.5);

        setWindowSize({ width: 2000 });

        expect(readScrollProgress(element, options)).toBe(1);
    });

    it('reads vertical progress relative to a custom root element', () => {
        const root = createElementWithRect({
            top: 100,
            height: 500
        });

        setElementSize(root, {
            height: 500
        });

        const element = createElementWithRect({
            top: 325,
            height: 150
        });

        const progress = readScrollProgress(element, {
            start: 0.8,
            end: 0.4,
            axis: 'y',
            root
        });

        expect(progress).toBe(0.5);
    });

    it('reads horizontal progress relative to a custom root element', () => {
        // This intentionally differs from the custom root size.
        // If readScrollProgress used window.innerWidth here, this test would fail.
        setWindowSize({ width: 2000 });

        const root = createElementWithRect({
            left: 100,
            width: 500
        });

        setElementSize(root, {
            width: 500
        });

        const element = createElementWithRect({
            left: 325,
            width: 150
        });

        const progress = readScrollProgress(element, {
            start: 0.8,
            end: 0.4,
            axis: 'x',
            root
        });

        expect(progress).toBe(0.5);
    });

    it.each([
        { start: NaN, end: 0.4 },
        { start: 0.8, end: Infinity },
        { start: -Infinity, end: 0.4 }
    ])('rejects non-finite ranges: %j', (options) => {
        expect(() => readScrollProgress(createElementWithRect({}), options)).toThrow(RangeError);
    });

    it('rejects unsupported axes at runtime', () => {
        expect(() =>
            readScrollProgress(createElementWithRect({}), {
                start: 0.8,
                end: 0.4,
                axis: 'z' as 'x'
            })
        ).toThrow(TypeError);
    });

    it('rejects targets and roots from another document', () => {
        const foreign = document.implementation.createHTMLDocument();
        const target = createElementWithRect({});

        expect(() =>
            readScrollProgress(foreign.createElement('div'), { start: 0.8, end: 0.4 })
        ).toThrow(TypeError);
        expect(() => readScrollProgress(target, { start: 0.8, end: 0.4, root: foreign })).toThrow(
            TypeError
        );
        expect(() =>
            readScrollProgress(target, { start: 0.8, end: 0.4, root: foreign.body })
        ).toThrow(TypeError);
    });
});
