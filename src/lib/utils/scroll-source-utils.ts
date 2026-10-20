import { resolveEffectiveRoot } from './effective-root-utils.js';
import type { ScrollProgressAxis, ScrollProgressRoot } from '../types.js';

export type ScrollEventTarget = Window | Document | Element;

export function resolveScrollEventTargets(root: ScrollProgressRoot): ScrollEventTarget[] {
    root = resolveEffectiveRoot(root);
    if (root instanceof Element) {
        return [root];
    }

    return [window];
}

export function addScrollEventListeners(
    targets: ScrollEventTarget[],
    listener: EventListener
): void {
    for (const target of targets) {
        target.addEventListener('scroll', listener, { passive: true });
    }
}

export function removeScrollEventListeners(
    targets: ScrollEventTarget[],
    listener: EventListener
): void {
    for (const target of targets) {
        target.removeEventListener('scroll', listener);
    }
}

export function areScrollEventTargetsEqual(
    firstTargets: ScrollEventTarget[],
    secondTargets: ScrollEventTarget[]
): boolean {
    if (firstTargets.length !== secondTargets.length) {
        return false;
    }

    return firstTargets.every((target, index) => target === secondTargets[index]);
}

export function readScrollPosition(root: ScrollProgressRoot, axis: ScrollProgressAxis): number {
    root = resolveEffectiveRoot(root);
    if (root instanceof Element) {
        return axis === 'x' ? root.scrollLeft : root.scrollTop;
    }

    return readDocumentScrollPosition(axis);
}

function readDocumentScrollPosition(axis: ScrollProgressAxis): number {
    const positions =
        axis === 'x'
            ? [
                  window.scrollX,
                  document.scrollingElement?.scrollLeft ?? 0,
                  document.documentElement.scrollLeft,
                  document.body?.scrollLeft ?? 0
              ]
            : [
                  window.scrollY,
                  document.scrollingElement?.scrollTop ?? 0,
                  document.documentElement.scrollTop,
                  document.body?.scrollTop ?? 0
              ];

    return positions.find((position) => position !== 0) ?? 0;
}
