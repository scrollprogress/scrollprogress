import { calculateScrollProgress } from './core.js';
import type { ReadScrollProgressOptions, ScrollProgressAxis, ScrollProgressRoot } from './types.js';

export function readScrollProgress(
    element: HTMLElement,
    options: ReadScrollProgressOptions
): number {
    validateReadScrollProgressInput(element, options);

    const axis = options.axis ?? 'y';
    const root = options.root ?? null;
    const rect = element.getBoundingClientRect();

    return calculateScrollProgress({
        elementStart: readElementStart(rect, axis, root),
        elementSize: readElementSize(rect, axis),
        rootSize: readRootSize(axis, root),
        start: options.start,
        end: options.end
    });
}

function validateReadScrollProgressInput(
    element: HTMLElement,
    options: ReadScrollProgressOptions
): void {
    if (
        !(element instanceof HTMLElement) ||
        element.ownerDocument !== document ||
        options === null ||
        typeof options !== 'object'
    ) {
        throw new TypeError('scrollprogress requires a target and options in the current document');
    }

    const root = options.root ?? null;

    if (
        root !== null &&
        root !== document &&
        (!(root instanceof Element) || root.ownerDocument !== document)
    ) {
        throw new TypeError('scrollprogress requires a root in the current document');
    }

    if (!Number.isFinite(options.start) || !Number.isFinite(options.end)) {
        throw new RangeError('scrollprogress start and end must be finite');
    }

    if (options.axis !== undefined && options.axis !== 'x' && options.axis !== 'y') {
        throw new TypeError('scrollprogress axis must be x or y');
    }
}

function isElementRoot(root: ScrollProgressRoot): root is Element {
    return root instanceof Element;
}

function readRootSize(axis: ScrollProgressAxis, root: ScrollProgressRoot): number {
    if (!isElementRoot(root)) {
        return readWindowRootSize(axis);
    }

    return axis === 'x' ? root.clientWidth : root.clientHeight;
}

function readElementStart(
    elementRect: DOMRect,
    axis: ScrollProgressAxis,
    root: ScrollProgressRoot
): number {
    if (!isElementRoot(root)) {
        return axis === 'x' ? elementRect.left : elementRect.top;
    }

    const rootRect = root.getBoundingClientRect();

    return axis === 'x'
        ? elementRect.left - rootRect.left - root.clientLeft
        : elementRect.top - rootRect.top - root.clientTop;
}

function readElementSize(rect: DOMRect, axis: ScrollProgressAxis): number {
    return axis === 'x' ? rect.width : rect.height;
}

function readWindowRootSize(axis: ScrollProgressAxis): number {
    return axis === 'x' ? window.innerWidth : window.innerHeight;
}
