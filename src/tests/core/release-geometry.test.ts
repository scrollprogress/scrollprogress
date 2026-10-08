import { expect, it } from 'vitest';
import { calculateScrollProgress } from '../../lib/core';

it.each([
    [900, 300, 1000, 0.8, 0.4, 0],
    [800, 300, 1000, 0.8, 0.4, 0],
    [450, 300, 1000, 0.8, 0.4, 0.5],
    [100, 300, 1000, 0.8, 0.4, 1],
    [-100, 300, 1000, 0.8, 0.4, 1],
    [400, 0, 1000, 0.4, 0.4, 0],
    [399, 0, 1000, 0.4, 0.4, 1],
    [400, 100, 1000, 0.4, 0.8, 0],
    [399, 100, 1000, 0.4, 0.8, 1],
    [0, 0, 0, 0.8, 0.4, 0],
    [-50, 100, 0, 0.8, 0.4, 0.5],
    [550, 100, 1000, 1.5, -0.3, 0.5]
])(
    'calculates geometry (%s, %s, %s, %s, %s)',
    (elementStart, elementSize, rootSize, start, end, expected) => {
        expect(
            calculateScrollProgress({ elementStart, elementSize, rootSize, start, end })
        ).toBeCloseTo(expected);
    }
);

it('does not validate numeric preconditions in the allocation-free calculation API', () => {
    expect(
        calculateScrollProgress({
            elementStart: NaN,
            elementSize: 1,
            rootSize: 100,
            start: 1,
            end: 0
        })
    ).toBeNaN();
    expect(
        calculateScrollProgress({
            elementStart: 0,
            elementSize: 1,
            rootSize: 100,
            start: Infinity,
            end: 0
        })
    ).toBeNaN();
});
