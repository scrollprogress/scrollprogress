import type { ScrollProgressRoot, TrackScrollProgressConfig } from '../types.js';

export function createIntersectionObserverOptions(
    config: Pick<TrackScrollProgressConfig, 'root' | 'rootMargin' | 'observerThreshold'>
): IntersectionObserverInit {
    return {
        /**
         * Native IntersectionObserver root.
         *
         * null means the document viewport.
         * Custom roots define the observation area.
         */
        root: config.root,

        /**
         * Public API name: rootMargin.
         * Native IntersectionObserver option name: rootMargin.
         *
         * This expands or shrinks the observer root bounds.
         * It affects the observation area, not the scroll progress calculation.
         */
        rootMargin: config.rootMargin,

        /**
         * Public API name: observerThreshold.
         * Native IntersectionObserver option name: threshold.
         *
         * This controls observer callback notifications, not the scroll
         * progress calculation.
         */
        threshold: config.observerThreshold
    };
}

export function createScrollProgressIntersectionObserver(
    element: HTMLElement,
    config: Pick<TrackScrollProgressConfig, 'root' | 'rootMargin' | 'observerThreshold'>,
    callback: IntersectionObserverCallback
): IntersectionObserver {
    const observer = new IntersectionObserver(callback, createIntersectionObserverOptions(config));

    try {
        observer.observe(element);
    } catch (error) {
        observer.disconnect();
        throw error;
    }

    return observer;
}

export function createRootVisibilityObserver(
    root: Element,
    callback: IntersectionObserverCallback
): IntersectionObserver {
    const observer = new IntersectionObserver(callback, {
        root: null,
        rootMargin: '0px',
        threshold: 0
    });

    try {
        observer.observe(root);
    } catch (error) {
        observer.disconnect();
        throw error;
    }

    return observer;
}

export function resolveInitialRootVisibility(root: ScrollProgressRoot): boolean {
    if (!(root instanceof Element)) {
        return true;
    }

    const rect = root.getBoundingClientRect();

    return (
        rect.width > 0 &&
        rect.height > 0 &&
        rect.bottom > 0 &&
        rect.right > 0 &&
        rect.top < window.innerHeight &&
        rect.left < window.innerWidth
    );
}
