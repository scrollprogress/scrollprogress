// @vitest-environment happy-dom

import { setElementSize } from '../../helpers/scroll-progress-test-utils';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { resetScrollProgressDebugControlGroups } from '../../../lib/debug/controls/registry';
import { createDebugOverlay } from '../../../lib/debug/overlay/overlay';
import {
    registerScrollProgressDebugItem,
    resetScrollProgressDebugRegistry
} from '../../../lib/debug/registry';
import { createTestRect } from './helpers';

let overlay: ReturnType<typeof createDebugOverlay> | undefined;

afterEach(() => {
    overlay?.destroy();
    overlay = undefined;

    vi.useRealTimers();
    vi.restoreAllMocks();
    resetScrollProgressDebugControlGroups();
    resetScrollProgressDebugRegistry();
    document.body.innerHTML = '';
});

describe('scroll progress debug overlay scroll synchronization', () => {
    it('keeps completed tracker geometry inspectable while scrolling', () => {
        vi.useFakeTimers();

        let targetTop = 20;
        const target = document.createElement('div');

        target.getBoundingClientRect = vi.fn(() => createTestRect(10, targetTop, 300, 150));
        document.body.append(target);

        registerScrollProgressDebugItem({
            element: target,
            once: true,
            completed: true
        });

        overlay = createDebugOverlay();

        const targetLayer = document.querySelector<HTMLElement>('[data-layer="target"]');

        expect(targetLayer?.style.transform).toBe('translate3d(10px, 20px, 0)');

        targetTop = -40;
        window.dispatchEvent(new Event('scroll'));
        vi.advanceTimersToNextFrame();

        expect(targetLayer?.style.transform).toBe('translate3d(10px, -40px, 0)');
    });

    it('syncs overlay geometry when the selected custom root scrolls', () => {
        vi.useFakeTimers();

        let targetTop = 20;

        const target = document.createElement('div');
        const root = document.createElement('div');

        target.getBoundingClientRect = vi.fn(() => createTestRect(10, targetTop, 300, 150));

        root.append(target);
        document.body.append(root);

        registerScrollProgressDebugItem({
            element: target,
            root
        });

        overlay = createDebugOverlay();

        const targetLayer = document.querySelector<HTMLElement>('[data-layer="target"]');

        expect(targetLayer?.style.transform).toBe('translate3d(10px, 20px, 0)');

        targetTop = -40;
        root.dispatchEvent(new Event('scroll'));

        expect(targetLayer?.style.transform).toBe('translate3d(10px, 20px, 0)');

        vi.advanceTimersToNextFrame();

        expect(targetLayer?.style.transform).toBe('translate3d(10px, -40px, 0)');
    });

    it('syncs custom-root overlay geometry when an ancestor scrolls', () => {
        vi.useFakeTimers();

        let rootTop = 120;

        const ancestor = document.createElement('div');
        const root = document.createElement('div');
        const target = document.createElement('div');

        const getRootRect = vi.fn(() => createTestRect(40, rootTop, 500, 300));

        root.getBoundingClientRect = getRootRect;
        setElementSize(root, { width: 500, height: 300 });

        root.append(target);
        ancestor.append(root);
        document.body.append(ancestor);

        registerScrollProgressDebugItem({
            element: target,
            root
        });

        overlay = createDebugOverlay();

        const rootLayer = document.querySelector<HTMLElement>('[data-layer="root"]');

        expect(rootLayer?.style.transform).toContain('translate3d(40px, 120px, 0');

        rootTop = 70;
        ancestor.dispatchEvent(new Event('scroll'));

        vi.advanceTimersToNextFrame();

        expect(rootLayer?.style.transform).toContain('translate3d(40px, 70px, 0');

        overlay.destroy();
        overlay = undefined;

        getRootRect.mockClear();

        rootTop = 20;
        ancestor.dispatchEvent(new Event('scroll'));

        vi.advanceTimersToNextFrame();

        expect(getRootRect).not.toHaveBeenCalled();
    });

    it('syncs custom-root overlay geometry when the window scrolls', () => {
        vi.useFakeTimers();

        let rootTop = 120;

        const root = document.createElement('div');
        const target = document.createElement('div');

        root.getBoundingClientRect = vi.fn(() => createTestRect(40, rootTop, 500, 300));
        setElementSize(root, { width: 500, height: 300 });

        root.append(target);
        document.body.append(root);

        registerScrollProgressDebugItem({
            element: target,
            root
        });

        overlay = createDebugOverlay();

        const rootLayer = document.querySelector<HTMLElement>('[data-layer="root"]');

        expect(rootLayer?.style.transform).toContain('translate3d(40px, 120px, 0');

        rootTop = 30;
        window.dispatchEvent(new Event('scroll'));

        vi.advanceTimersToNextFrame();

        expect(rootLayer?.style.transform).toContain('translate3d(40px, 30px, 0');
    });

    it('coalesces layer bounds sync from multiple scroll sources', () => {
        vi.useFakeTimers();

        const ancestor = document.createElement('div');
        const root = document.createElement('div');
        const target = document.createElement('div');

        const getTargetRect = vi.fn(() => createTestRect(10, 20, 300, 150));

        const getRootRect = vi.fn(() => createTestRect(0, 0, 500, 400));

        target.getBoundingClientRect = getTargetRect;
        root.getBoundingClientRect = getRootRect;
        setElementSize(root, { width: 500, height: 400 });

        root.append(target);
        ancestor.append(root);
        document.body.append(ancestor);

        registerScrollProgressDebugItem({
            element: target,
            root
        });

        overlay = createDebugOverlay();

        getTargetRect.mockClear();
        getRootRect.mockClear();

        root.dispatchEvent(new Event('scroll'));
        ancestor.dispatchEvent(new Event('scroll'));
        window.dispatchEvent(new Event('scroll'));

        expect(getTargetRect).not.toHaveBeenCalled();
        expect(getRootRect).not.toHaveBeenCalled();

        vi.advanceTimersToNextFrame();

        expect(getTargetRect).toHaveBeenCalledTimes(2);
        expect(getRootRect).toHaveBeenCalledTimes(1);

        vi.advanceTimersToNextFrame();

        expect(getTargetRect).toHaveBeenCalledTimes(2);
        expect(getRootRect).toHaveBeenCalledTimes(1);
    });

    it('removes layer bounds scroll listeners on destroy', () => {
        const windowAddEventListener = vi.spyOn(window, 'addEventListener');

        const windowRemoveEventListener = vi.spyOn(window, 'removeEventListener');

        const documentAddEventListener = vi.spyOn(document, 'addEventListener');

        const documentRemoveEventListener = vi.spyOn(document, 'removeEventListener');

        overlay = createDebugOverlay();

        const windowScrollListener = windowAddEventListener.mock.calls.find(
            ([type]) => type === 'scroll'
        )?.[1];

        const documentScrollListener = documentAddEventListener.mock.calls.find(
            ([type]) => type === 'scroll'
        )?.[1];

        expect(windowScrollListener).toBeDefined();
        expect(documentScrollListener).toBeDefined();

        expect(documentAddEventListener).toHaveBeenCalledWith(
            'scroll',
            documentScrollListener,
            true
        );

        overlay.destroy();
        overlay = undefined;

        expect(windowRemoveEventListener).toHaveBeenCalledWith('scroll', windowScrollListener);

        expect(documentRemoveEventListener).toHaveBeenCalledWith(
            'scroll',
            documentScrollListener,
            true
        );
    });
});
