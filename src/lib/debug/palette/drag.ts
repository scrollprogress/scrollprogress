import {
    clampPaletteIntoViewport,
    clampPalettePosition,
    readPaletteViewportSpacing
} from './utils/position-utils.js';

type DragState = {
    pointerId: number;
    startX: number;
    startY: number;
    startLeft: number;
    startTop: number;
    width: number;
    height: number;
    viewportSpacing: number;
    handle: HTMLElement;
};

export interface DebugPaletteDragController {
    destroy: () => void;
}

export function createDebugPaletteDragController(element: HTMLElement): DebugPaletteDragController {
    let dragState: DragState | null = null;
    let hasCustomPosition = false;

    function isDragHandleVisible(handle: HTMLElement): boolean {
        return getComputedStyle(handle).display !== 'none';
    }

    function handlePointerDown(event: PointerEvent): void {
        if (dragState) {
            return;
        }

        const target = event.target;

        if (!(target instanceof Element)) {
            return;
        }

        const dragHandle = target.closest<HTMLElement>(
            '[data-scroll-progress-debug-handle="drag"]'
        );

        if (!dragHandle) {
            return;
        }

        if (!isDragHandleVisible(dragHandle)) {
            return;
        }

        if (event.pointerType === 'mouse' && event.button !== 0) {
            return;
        }

        const rect = element.getBoundingClientRect();
        const viewportSpacing = readPaletteViewportSpacing(element);

        dragState = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            startLeft: rect.left,
            startTop: rect.top,
            width: rect.width,
            height: rect.height,
            viewportSpacing,
            handle: dragHandle
        };

        hasCustomPosition = true;

        element.style.left = `${rect.left}px`;
        element.style.top = `${rect.top}px`;
        element.style.right = 'auto';
        element.style.bottom = 'auto';

        element.classList.add('spdp-is-dragging');

        dragHandle.setPointerCapture?.(event.pointerId);

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
        window.addEventListener('pointercancel', handlePointerUp);

        event.preventDefault();
    }

    function handlePointerMove(event: PointerEvent): void {
        if (!dragState || dragState.pointerId !== event.pointerId) {
            return;
        }

        const nextLeft = dragState.startLeft + event.clientX - dragState.startX;
        const nextTop = dragState.startTop + event.clientY - dragState.startY;

        element.style.left = `${clampPalettePosition(
            nextLeft,
            dragState.width,
            window.innerWidth,
            dragState.viewportSpacing
        )}px`;

        element.style.top = `${clampPalettePosition(
            nextTop,
            dragState.height,
            window.innerHeight,
            dragState.viewportSpacing
        )}px`;
    }

    function handlePointerUp(event: PointerEvent): void {
        stopDragging(event.pointerId);
    }

    function stopDragging(pointerId?: number): void {
        if (!dragState) {
            return;
        }

        if (typeof pointerId === 'number' && dragState.pointerId !== pointerId) {
            return;
        }

        dragState.handle.releasePointerCapture?.(dragState.pointerId);
        dragState = null;

        element.classList.remove('spdp-is-dragging');

        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
        window.removeEventListener('pointercancel', handlePointerUp);
    }

    function handleResize(): void {
        const dragHandle = element.querySelector<HTMLElement>(
            '[data-scroll-progress-debug-handle="drag"]'
        );

        if (!dragHandle || !isDragHandleVisible(dragHandle)) {
            stopDragging();
            return;
        }

        if (!hasCustomPosition) {
            return;
        }

        clampPaletteIntoViewport(element);
    }

    element.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('resize', handleResize);

    return {
        destroy() {
            stopDragging();
            element.removeEventListener('pointerdown', handlePointerDown);
            window.removeEventListener('resize', handleResize);
        }
    };
}
