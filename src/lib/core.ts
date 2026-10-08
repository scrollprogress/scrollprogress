import type {
    ScrollProgressDirection,
    ScrollProgressInput,
    ScrollProgressObserverThreshold
} from './types.js';

export function calculateScrollProgress(input: ScrollProgressInput): number {
    const startPx = input.rootSize * input.start;
    const endPx = input.rootSize * input.end;

    const trackLength = startPx - endPx;
    const traveled = startPx - input.elementStart;
    const travelLength = input.elementSize + trackLength;

    if (travelLength <= 0) {
        return traveled > 0 ? 1 : 0;
    }

    return clampProgress(traveled / travelLength);
}

export function getScrollProgressDirection(
    previousProgress: number | null,
    progress: number
): ScrollProgressDirection {
    if (previousProgress === null || progress === previousProgress) {
        return 'none';
    }

    return progress > previousProgress ? 'forward' : 'backward';
}

export function areObserverThresholdsEqual(
    a: ScrollProgressObserverThreshold,
    b: ScrollProgressObserverThreshold
): boolean {
    if (typeof a === 'number' && typeof b === 'number') {
        return a === b;
    }

    if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) {
            return false;
        }

        return a.every((value, index) => value === b[index]);
    }

    return false;
}

function clampProgress(value: number): number {
    return Math.min(1, Math.max(0, value));
}
