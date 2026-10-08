import type { ScrollProgressRoot } from '../types.js';

export function createScrollProgressResizeObserver(
    element: HTMLElement,
    root: ScrollProgressRoot,
    callback: ResizeObserverCallback
): ResizeObserver | null {
    if (typeof ResizeObserver === 'undefined') {
        return null;
    }

    const resizeObserver = new ResizeObserver(callback);

    try {
        resizeObserver.observe(element);

        if (root instanceof Element) {
            resizeObserver.observe(root);
        }
    } catch (error) {
        resizeObserver.disconnect();
        throw error;
    }

    return resizeObserver;
}
