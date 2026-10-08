import { describe, expect, it } from 'vitest';
import {
    areObserverThresholdsEqual,
    calculateScrollProgress,
    getScrollProgressDirection
} from '../../lib/core';

describe('calculateScrollProgress', () => {
    it('returns 0 when the element start is on the start line', () => {
        const progress = calculateScrollProgress({
            elementStart: 800,
            elementSize: 300,
            rootSize: 1000,
            start: 0.8,
            end: 0.4
        });

        expect(progress).toBe(0);
    });

    it('returns 0.5 when the element is halfway through the travel length', () => {
        const progress = calculateScrollProgress({
            elementStart: 450,
            elementSize: 300,
            rootSize: 1000,
            start: 0.8,
            end: 0.4
        });

        expect(progress).toBe(0.5);
    });

    it('returns 1 when the element end reaches the end line', () => {
        const progress = calculateScrollProgress({
            elementStart: 100,
            elementSize: 300,
            rootSize: 1000,
            start: 0.8,
            end: 0.4
        });

        expect(progress).toBe(1);
    });

    it('clamps progress below 0', () => {
        const progress = calculateScrollProgress({
            elementStart: 900,
            elementSize: 300,
            rootSize: 1000,
            start: 0.8,
            end: 0.4
        });

        expect(progress).toBe(0);
    });

    it('clamps progress above 1', () => {
        const progress = calculateScrollProgress({
            elementStart: 0,
            elementSize: 300,
            rootSize: 1000,
            start: 0.8,
            end: 0.4
        });

        expect(progress).toBe(1);
    });

    it('uses the track length as part of the travel length', () => {
        const progress = calculateScrollProgress({
            elementStart: 600,
            elementSize: 200,
            rootSize: 1000,
            start: 0.8,
            end: 0.6
        });

        expect(progress).toBe(0.5);
    });

    it('handles non-positive travel length', () => {
        expect(
            calculateScrollProgress({
                elementStart: 100,
                elementSize: 0,
                rootSize: 1000,
                start: 0.4,
                end: 0.4
            })
        ).toBe(1);

        expect(
            calculateScrollProgress({
                elementStart: 500,
                elementSize: 0,
                rootSize: 1000,
                start: 0.4,
                end: 0.4
            })
        ).toBe(0);
    });
});

describe('getScrollProgressDirection', () => {
    it('returns none when there is no previous progress', () => {
        expect(getScrollProgressDirection(null, 0)).toBe('none');
        expect(getScrollProgressDirection(null, 0.5)).toBe('none');
        expect(getScrollProgressDirection(null, 1)).toBe('none');
    });

    it('returns none when progress has not changed', () => {
        expect(getScrollProgressDirection(0, 0)).toBe('none');
        expect(getScrollProgressDirection(0.5, 0.5)).toBe('none');
        expect(getScrollProgressDirection(1, 1)).toBe('none');
    });

    it('returns forward when progress increases', () => {
        expect(getScrollProgressDirection(0, 0.1)).toBe('forward');
        expect(getScrollProgressDirection(0.4, 0.7)).toBe('forward');
    });

    it('returns backward when progress decreases', () => {
        expect(getScrollProgressDirection(1, 0.9)).toBe('backward');
        expect(getScrollProgressDirection(0.7, 0.4)).toBe('backward');
    });
});

describe('areObserverThresholdsEqual', () => {
    it('returns true for equal numeric thresholds', () => {
        expect(areObserverThresholdsEqual(0, 0)).toBe(true);
        expect(areObserverThresholdsEqual(0.5, 0.5)).toBe(true);
    });

    it('returns false for different numeric thresholds', () => {
        expect(areObserverThresholdsEqual(0, 0.5)).toBe(false);
    });

    it('returns true for arrays with the same values in the same order', () => {
        expect(areObserverThresholdsEqual([0, 0.5, 1], [0, 0.5, 1])).toBe(true);
    });

    it('returns false for arrays with different values', () => {
        expect(areObserverThresholdsEqual([0, 0.25, 1], [0, 0.5, 1])).toBe(false);
    });

    it('returns false for arrays with different lengths', () => {
        expect(areObserverThresholdsEqual([0, 1], [0, 0.5, 1])).toBe(false);
    });

    it('returns false when one threshold is numeric and the other is an array', () => {
        expect(areObserverThresholdsEqual(0, [0])).toBe(false);
    });
});
