import { expect, vi } from 'vitest';

interface SetupScrollProgressTestMocksOptions {
    resizeObserver?: boolean;
}

let latestIntersectionObserver: MockIntersectionObserver | null = null;
let latestResizeObserver: MockResizeObserver | null = null;
let nextAnimationFrameId = 1;

const intersectionObserverInstances: MockIntersectionObserver[] = [];
const resizeObserverInstances: MockResizeObserver[] = [];

const animationFrameCallbacks = new Map<number, FrameRequestCallback>();

export class MockIntersectionObserver {
    private callback: IntersectionObserverCallback;

    options: IntersectionObserverInit | undefined;
    observedElements: Element[] = [];
    disconnect = vi.fn();

    constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
        this.callback = callback;
        this.options = options;

        // eslint-disable-next-line @typescript-eslint/no-this-alias -- Tests inspect the most recently constructed observer.
        latestIntersectionObserver = this;
        intersectionObserverInstances.push(this);
    }

    observe(element: Element) {
        this.observedElements.push(element);
    }

    trigger(isIntersecting: boolean, intersectionRatio = isIntersecting ? 1 : 0) {
        this.callback(
            [
                {
                    isIntersecting,
                    intersectionRatio
                } as IntersectionObserverEntry
            ],
            this as unknown as IntersectionObserver
        );
    }
}

export class MockResizeObserver {
    private callback: ResizeObserverCallback;

    observedElements: Element[] = [];
    disconnect = vi.fn();

    constructor(callback: ResizeObserverCallback) {
        this.callback = callback;

        // eslint-disable-next-line @typescript-eslint/no-this-alias -- Tests inspect the most recently constructed observer.
        latestResizeObserver = this;
        resizeObserverInstances.push(this);
    }

    observe(element: Element) {
        this.observedElements.push(element);
    }

    trigger() {
        this.callback([], this as unknown as ResizeObserver);
    }
}

/**
 * Installs DOM observer and animation frame mocks used by tracker-level tests.
 *
 * This helper stores mock instances in module-level state so tests can inspect
 * created observers and manually trigger callbacks. Pair it with
 * resetScrollProgressTestMocks in afterEach to avoid state leaking across tests.
 */
export function setupScrollProgressTestMocks(options: SetupScrollProgressTestMocksOptions = {}) {
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);

    vi.stubGlobal('ResizeObserver', options.resizeObserver ? MockResizeObserver : undefined);

    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
        const frameId = nextAnimationFrameId++;

        animationFrameCallbacks.set(frameId, callback);

        return frameId;
    });

    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((frameId) => {
        animationFrameCallbacks.delete(frameId);
    });
}

/**
 * Clears all observer and animation frame mock state.
 *
 * Call this in afterEach for every test file using setupScrollProgressTestMocks.
 */
export function resetScrollProgressTestMocks() {
    latestIntersectionObserver = null;
    latestResizeObserver = null;
    nextAnimationFrameId = 1;
    animationFrameCallbacks.clear();

    intersectionObserverInstances.length = 0;
    resizeObserverInstances.length = 0;

    vi.restoreAllMocks();
    vi.unstubAllGlobals();
}

type TestRectInit = Partial<Pick<DOMRect, 'top' | 'left' | 'width' | 'height'>>;

export function createElementWithRect(rect: TestRectInit = {}): HTMLElement {
    const element = document.createElement('div');

    const top = rect.top ?? 450;
    const left = rect.left ?? 450;
    const width = rect.width ?? 300;
    const height = rect.height ?? 300;

    element.getBoundingClientRect = () =>
        ({
            top,
            left,
            width,
            height,
            right: left + width,
            bottom: top + height,
            x: left,
            y: top,
            toJSON: () => ({})
        }) as DOMRect;

    return element;
}

export function createRootElementWithRect(rect: TestRectInit = {}): HTMLElement {
    const top = rect.top ?? 0;
    const left = rect.left ?? 0;
    const width = rect.width ?? 1000;
    const height = rect.height ?? 1000;

    const root = createElementWithRect({
        top,
        left,
        width,
        height
    });

    setElementSize(root, {
        width,
        height
    });

    setElementScrollPosition(root, 'scrollTop', 0);
    setElementScrollPosition(root, 'scrollLeft', 0);

    return root;
}

export function setWindowValue(
    name: 'innerWidth' | 'innerHeight' | 'scrollX' | 'scrollY',
    value: number
) {
    vi.stubGlobal(name, value);
}

export function setWindowSize(size: { width?: number; height?: number }) {
    if (size.width !== undefined) {
        setWindowValue('innerWidth', size.width);
    }

    if (size.height !== undefined) {
        setWindowValue('innerHeight', size.height);
    }
}

export function setElementSize(
    element: HTMLElement,
    size: {
        width?: number;
        height?: number;
    }
) {
    if (size.width !== undefined) {
        Object.defineProperty(element, 'clientWidth', {
            value: size.width,
            configurable: true
        });
    }

    if (size.height !== undefined) {
        Object.defineProperty(element, 'clientHeight', {
            value: size.height,
            configurable: true
        });
    }
}

export function setElementScrollPosition(
    element: HTMLElement,
    name: 'scrollTop' | 'scrollLeft',
    value: number
) {
    Object.defineProperty(element, name, {
        value,
        writable: true,
        configurable: true
    });
}

export function runAnimationFrame() {
    if (animationFrameCallbacks.size === 0) {
        throw new Error('Expected an animation frame callback to be scheduled');
    }

    const callbacks = Array.from(animationFrameCallbacks.values());

    animationFrameCallbacks.clear();

    for (const callback of callbacks) {
        callback(0);
    }
}

export function runNextAnimationFrame() {
    const nextCallback = animationFrameCallbacks.entries().next().value;

    if (!nextCallback) {
        throw new Error('Expected an animation frame callback to be scheduled');
    }

    const [frameId, callback] = nextCallback;

    animationFrameCallbacks.delete(frameId);
    callback(0);
}

export function hasScheduledAnimationFrame() {
    return animationFrameCallbacks.size > 0;
}

export function getLatestIntersectionObserver(): MockIntersectionObserver {
    if (!latestIntersectionObserver) {
        throw new Error('Expected an IntersectionObserver to have been created');
    }

    return latestIntersectionObserver;
}

export function getLatestResizeObserver(): MockResizeObserver {
    if (!latestResizeObserver) {
        throw new Error('Expected a ResizeObserver to have been created');
    }

    return latestResizeObserver;
}

export function getIntersectionObserverInstances(): MockIntersectionObserver[] {
    return intersectionObserverInstances;
}

export function getResizeObserverInstances(): MockResizeObserver[] {
    return resizeObserverInstances;
}

export function getIntersectionObserverForObservedElement(
    element: Element
): MockIntersectionObserver {
    const observer = intersectionObserverInstances.find((observer) =>
        observer.observedElements.includes(element)
    );

    if (!observer) {
        throw new Error('Expected an IntersectionObserver observing the element');
    }

    return observer;
}

export function expectObservedElements(
    observer: MockResizeObserver | null,
    expectedElements: Element[]
) {
    expect(observer).not.toBeNull();
    expect(observer?.observedElements).toHaveLength(expectedElements.length);

    for (const element of expectedElements) {
        expect(observer?.observedElements).toContain(element);
    }
}
