import type { ScrollProgressRoot } from '../types.js';

/** Resolve viewport aliases without changing the configured public root. */
export function resolveEffectiveRoot(root: ScrollProgressRoot): Element | null {
    if (
        root === null ||
        root === document ||
        root === document.documentElement ||
        (root === document.body && root === document.scrollingElement)
    ) {
        return null;
    }
    return root as Element;
}
