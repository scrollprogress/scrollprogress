import type { ScrollProgressAxis, ScrollProgressRoot } from '../types.js';

export type ScrollEventTarget = Window | Document | Element;

export function resolveScrollEventTargets(root: ScrollProgressRoot): ScrollEventTarget[] {
    if (root instanceof Element) {
        return [root];
    }

    const targets: ScrollEventTarget[] = [];

    addUniqueScrollEventTarget(targets, window);
    addUniqueScrollEventTarget(targets, document);

    if (document.scrollingElement instanceof Element) {
        addUniqueScrollEventTarget(targets, document.scrollingElement);
    }

    addUniqueScrollEventTarget(targets, document.documentElement);

    if (document.body) {
        addUniqueScrollEventTarget(targets, document.body);
    }

    return targets;
}

export function addScrollEventListeners(
    targets: ScrollEventTarget[],
    listener: EventListener
): void {
    for (const target of targets) {
        target.addEventListener('scroll', listener);
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
    if (root instanceof Element) {
        return axis === 'x' ? root.scrollLeft : root.scrollTop;
    }

    return readDocumentScrollPosition(axis);
}

function addUniqueScrollEventTarget(targets: ScrollEventTarget[], target: ScrollEventTarget): void {
    if (targets.includes(target)) {
        return;
    }

    targets.push(target);
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
