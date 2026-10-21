// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { measureScrollProgress, readScrollProgress } from '../../lib/read-scroll-progress';
import { calculateScrollProgress } from '../../lib/core';

import {
    createElementWithRect,
    setElementSize,
    setWindowSize
} from '../helpers/scroll-progress-test-utils';

afterEach(() => {
    vi.restoreAllMocks();
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

describe('internal measurement diagnostics', () => {
    it.each([
        {
            rootSize: 1000,
            start: 0.8,
            end: 0.4,
            size: 300,
            position: 450,
            distance: 700,
            progress: 0.5
        },
        {
            rootSize: 1000,
            start: 0.5,
            end: 0.5,
            size: 300,
            position: 350,
            distance: 300,
            progress: 0.5
        },
        {
            rootSize: 1000,
            start: 0,
            end: 1,
            size: 1200,
            position: -100,
            distance: 200,
            progress: 0.5
        },
        { rootSize: 100, start: 0.01, end: 0.03, size: 2, position: 0, distance: 0, progress: 1 },
        { rootSize: 1000, start: 0, end: 1, size: 1000, position: 0, distance: 0, progress: 0 },
        { rootSize: 1000, start: 0, end: 1, size: 200, position: -1, distance: -800, progress: 1 }
    ])(
        'matches the calculator and literal D=$distance, progress=$progress',
        ({ rootSize, start, end, size, position, distance, progress }) => {
            setWindowSize({ height: rootSize });
            const element = createElementWithRect({ height: size, top: position });
            const diagnostic = vi.fn();
            const options = { start, end };
            expect(measureScrollProgress(element, options, diagnostic)).toBe(progress);
            expect(
                calculateScrollProgress({
                    elementSize: size,
                    elementStart: position,
                    rootSize,
                    start,
                    end
                })
            ).toBe(progress);
            expect(readScrollProgress(element, options)).toBe(progress);
            if (distance <= 0) expect(diagnostic).toHaveBeenCalledExactlyOnceWith(distance);
            else expect(diagnostic).not.toHaveBeenCalled();
        }
    );

    it.each(['x', 'y'] as const)('does not add %s geometry reads with diagnostics', (axis) => {
        const root = createElementWithRect({ top: 100, left: 100, width: 520, height: 520 });
        const width = vi.fn(() => 500);
        const height = vi.fn(() => 500);
        Object.defineProperties(root, {
            clientWidth: { get: width },
            clientHeight: { get: height },
            clientLeft: { value: 10 },
            clientTop: { value: 10 }
        });
        const element = createElementWithRect({ top: 335, left: 335, width: 150, height: 150 });
        const rect = vi.spyOn(element, 'getBoundingClientRect');
        const boxes = vi.spyOn(element, 'getClientRects');
        const rootRect = vi.spyOn(root, 'getBoundingClientRect');
        const options = { root, axis, start: 0, end: 1 };
        const diagnostic = vi.fn();
        for (const notify of [undefined, diagnostic]) {
            rect.mockClear();
            boxes.mockClear();
            rootRect.mockClear();
            width.mockClear();
            height.mockClear();
            expect(measureScrollProgress(element, options, notify)).toBe(0);
            expect(rect).toHaveBeenCalledTimes(1);
            expect(boxes).toHaveBeenCalledTimes(1);
            expect(rootRect).toHaveBeenCalledTimes(1);
            expect(axis === 'x' ? width : height).toHaveBeenCalledTimes(1);
            expect(axis === 'x' ? height : width).not.toHaveBeenCalled();
        }
        expect(diagnostic).toHaveBeenCalledExactlyOnceWith(-350);
    });

    it('reports only after all reads succeed and skips boxless targets', () => {
        const root = createElementWithRect();
        const element = createElementWithRect();
        const notify = vi.fn();
        const error = new Error('root read');
        Object.defineProperty(root, 'clientHeight', {
            get: () => {
                throw error;
            }
        });
        expect(() => measureScrollProgress(element, { root, start: 0, end: 1 }, notify)).toThrow(
            error
        );
        expect(notify).not.toHaveBeenCalled();
        vi.spyOn(element, 'getClientRects').mockReturnValue([] as unknown as DOMRectList);
        expect(measureScrollProgress(element, { root, start: 0, end: 1 }, notify)).toBeNull();
        expect(notify).not.toHaveBeenCalled();
    });
});
