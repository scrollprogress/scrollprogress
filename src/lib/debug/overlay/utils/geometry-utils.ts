type ScrollProgressDebugOverlayRootSource = {
    root: Element | Document | null;
};

export interface RectClipInsets {
    top: number;
    right: number;
    bottom: number;
    left: number;
}

export function applyLayerRect(element: HTMLElement, rect: DOMRect): void {
    element.style.transform = `translate3d(${rect.left}px, ${rect.top}px, 0)`;
    element.style.width = `${rect.width}px`;
    element.style.height = `${rect.height}px`;
    element.dataset.hasGeometry = 'true';
}

export function resetLayerRect(element: HTMLElement): void {
    element.style.transform = '';
    element.style.width = '';
    element.style.height = '';
    element.dataset.hasGeometry = 'false';
}

export function getRectClipInsets(rect: DOMRect, clippingRect: DOMRect): RectClipInsets {
    return {
        top: clippingRect.top - rect.top,
        right: rect.right - clippingRect.right,
        bottom: rect.bottom - clippingRect.bottom,
        left: clippingRect.left - rect.left
    };
}

export function getViewportRect(): DOMRect {
    return {
        left: 0,
        top: 0,
        width: window.innerWidth,
        height: window.innerHeight,
        right: window.innerWidth,
        bottom: window.innerHeight,
        x: 0,
        y: 0,
        toJSON: () => ({})
    } as DOMRect;
}

export function getItemRootRect(item: ScrollProgressDebugOverlayRootSource | null): DOMRect | null {
    if (!item) {
        return null;
    }

    if (item.root instanceof Element) {
        const rect = item.root.getBoundingClientRect();
        return DOMRect.fromRect({
            x: rect.left + item.root.clientLeft,
            y: rect.top + item.root.clientTop,
            width: item.root.clientWidth,
            height: item.root.clientHeight
        });
    }

    return getViewportRect();
}

export function getProgressRangeRect(
    rootRect: DOMRect,
    axis: 'x' | 'y',
    start: number,
    end: number
): DOMRect {
    if (axis === 'x') {
        const startX = rootRect.left + rootRect.width * start;
        const endX = rootRect.left + rootRect.width * end;
        const left = Math.min(startX, endX);
        const width = Math.abs(endX - startX);

        return {
            left,
            top: rootRect.top,
            width,
            height: rootRect.height,
            right: left + width,
            bottom: rootRect.bottom,
            x: left,
            y: rootRect.top,
            toJSON: () => ({})
        } as DOMRect;
    }

    const startY = rootRect.top + rootRect.height * start;
    const endY = rootRect.top + rootRect.height * end;
    const top = Math.min(startY, endY);
    const height = Math.abs(endY - startY);

    return {
        left: rootRect.left,
        top,
        width: rootRect.width,
        height,
        right: rootRect.right,
        bottom: top + height,
        x: rootRect.left,
        y: top,
        toJSON: () => ({})
    } as DOMRect;
}

export function getIntersectionRect(firstRect: DOMRect, secondRect: DOMRect): DOMRect | null {
    const left = Math.max(firstRect.left, secondRect.left);
    const top = Math.max(firstRect.top, secondRect.top);
    const right = Math.min(firstRect.right, secondRect.right);
    const bottom = Math.min(firstRect.bottom, secondRect.bottom);

    const width = right - left;
    const height = bottom - top;

    if (width <= 0 || height <= 0) {
        return null;
    }

    return {
        left,
        top,
        width,
        height,
        right,
        bottom,
        x: left,
        y: top,
        toJSON: () => ({})
    } as DOMRect;
}
