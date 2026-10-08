// @vitest-environment happy-dom

import { setElementSize } from '../../helpers/scroll-progress-test-utils';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { resetScrollProgressDebugControlGroups } from '../../../lib/debug/controls/registry';
import { createDebugOverlay } from '../../../lib/debug/overlay/overlay';
import {
    registerScrollProgressDebugItem,
    resetScrollProgressDebugRegistry,
    selectScrollProgressDebugItem,
    updateScrollProgressDebugItem
} from '../../../lib/debug/registry';

import { createTestRect } from './helpers';

let overlay: ReturnType<typeof createDebugOverlay> | undefined;

afterEach(() => {
    overlay?.destroy();
    overlay = undefined;

    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    resetScrollProgressDebugControlGroups();
    resetScrollProgressDebugRegistry();
    document.body.innerHTML = '';
});

interface MockResizeObserverInstance {
    callback: ResizeObserverCallback;
    observe: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
}

function installMockResizeObserver(): MockResizeObserverInstance[] {
    const instances: MockResizeObserverInstance[] = [];

    class MockResizeObserver {
        observe = vi.fn();
        disconnect = vi.fn();

        constructor(callback: ResizeObserverCallback) {
            instances.push({
                callback,
                observe: this.observe,
                disconnect: this.disconnect
            });
        }
    }

    vi.stubGlobal('ResizeObserver', MockResizeObserver);

    return instances;
}

describe('scroll progress debug overlay resize synchronization', () => {
    it('syncs layer bounds when the selected target is resized', () => {
        vi.useFakeTimers();

        const resizeObserverInstances = installMockResizeObserver();

        let targetRect = createTestRect(10, 20, 300, 150);

        const target = document.createElement('div');

        target.getBoundingClientRect = vi.fn(() => targetRect);

        registerScrollProgressDebugItem({
            element: target
        });

        overlay = createDebugOverlay();

        const targetLayer = document.querySelector<HTMLElement>('[data-layer="target"]');

        expect(resizeObserverInstances).toHaveLength(1);
        expect(resizeObserverInstances[0].observe).toHaveBeenCalledWith(target);
        expect(targetLayer?.style.transform).toBe('translate3d(10px, 20px, 0)');
        expect(targetLayer?.style.width).toBe('300px');
        expect(targetLayer?.style.height).toBe('150px');

        targetRect = createTestRect(40, 60, 320, 180);

        resizeObserverInstances[0].callback([], {} as ResizeObserver);

        expect(targetLayer?.style.transform).toBe('translate3d(10px, 20px, 0)');

        vi.advanceTimersToNextFrame();

        expect(targetLayer?.style.transform).toBe('translate3d(40px, 60px, 0)');
        expect(targetLayer?.style.width).toBe('320px');
        expect(targetLayer?.style.height).toBe('180px');
    });

    it('syncs root-based layers when the selected root is resized', () => {
        vi.useFakeTimers();

        const resizeObserverInstances = installMockResizeObserver();

        const target = document.createElement('div');
        const root = document.createElement('div');

        target.getBoundingClientRect = vi.fn(() => createTestRect(120, 220, 100, 100));

        let rootRect = createTestRect(100, 200, 300, 400);

        root.getBoundingClientRect = vi.fn(() => rootRect);
        setElementSize(root, { width: 300, height: 400 });

        registerScrollProgressDebugItem({
            element: target,
            root,
            rootMargin: '10px'
        });

        overlay = createDebugOverlay();

        const rootLayer = document.querySelector<HTMLElement>('[data-layer="root"]');
        const marginLayer = document.querySelector<HTMLElement>('[data-layer="margin"]');

        expect(resizeObserverInstances).toHaveLength(1);
        expect(resizeObserverInstances[0].observe).toHaveBeenCalledWith(target);
        expect(resizeObserverInstances[0].observe).toHaveBeenCalledWith(root);

        expect(rootLayer?.style.transform).toContain('translate3d(100px, 200px, 0');
        expect(rootLayer?.style.width).toBe('300px');
        expect(rootLayer?.style.height).toBe('400px');

        rootRect = createTestRect(80, 160, 500, 300);
        setElementSize(root, { width: 500, height: 300 });

        resizeObserverInstances[0].callback([], {} as ResizeObserver);

        expect(rootLayer?.style.transform).toContain('translate3d(100px, 200px, 0');

        vi.advanceTimersToNextFrame();

        expect(rootLayer?.style.transform).toContain('translate3d(80px, 160px, 0');
        expect(rootLayer?.style.width).toBe('500px');
        expect(rootLayer?.style.height).toBe('300px');

        expect(marginLayer?.style.transform).toContain('translate3d(70px, 150px, 0');
        expect(marginLayer?.style.width).toBe('520px');
        expect(marginLayer?.style.height).toBe('320px');
    });

    it('replaces resize observer targets when the selected item changes', () => {
        const resizeObserverInstances = installMockResizeObserver();

        const firstTarget = document.createElement('div');
        const secondTarget = document.createElement('div');

        const firstItemId = registerScrollProgressDebugItem({
            element: firstTarget
        });
        const secondItemId = registerScrollProgressDebugItem({
            element: secondTarget
        });

        expect(firstItemId).not.toBe(secondItemId);

        overlay = createDebugOverlay();

        expect(resizeObserverInstances).toHaveLength(1);
        expect(resizeObserverInstances[0].observe).toHaveBeenCalledWith(firstTarget);

        selectScrollProgressDebugItem(secondItemId);

        expect(resizeObserverInstances[0].disconnect).toHaveBeenCalledTimes(1);
        expect(resizeObserverInstances).toHaveLength(2);
        expect(resizeObserverInstances[1].observe).toHaveBeenCalledWith(secondTarget);
    });

    it('replaces the resize observer target when the selected item element changes', () => {
        vi.useFakeTimers();

        const resizeObserverInstances = installMockResizeObserver();

        const firstTarget = document.createElement('div');
        const secondTarget = document.createElement('div');

        firstTarget.getBoundingClientRect = vi.fn(() => createTestRect(10, 20, 300, 150));

        secondTarget.getBoundingClientRect = vi.fn(() => createTestRect(40, 60, 320, 180));

        const itemId = registerScrollProgressDebugItem({
            element: firstTarget
        });

        overlay = createDebugOverlay();

        const targetLayer = document.querySelector<HTMLElement>('[data-layer="target"]');

        expect(resizeObserverInstances).toHaveLength(1);
        expect(resizeObserverInstances[0].observe).toHaveBeenCalledWith(firstTarget);

        expect(targetLayer?.style.transform).toBe('translate3d(10px, 20px, 0)');
        expect(targetLayer?.style.width).toBe('300px');
        expect(targetLayer?.style.height).toBe('150px');

        updateScrollProgressDebugItem(itemId, {
            element: secondTarget
        });

        expect(resizeObserverInstances[0].disconnect).toHaveBeenCalledTimes(1);
        expect(resizeObserverInstances).toHaveLength(2);
        expect(resizeObserverInstances[1].observe).toHaveBeenCalledWith(secondTarget);

        expect(targetLayer?.style.transform).toBe('translate3d(10px, 20px, 0)');
        expect(targetLayer?.style.width).toBe('300px');
        expect(targetLayer?.style.height).toBe('150px');

        vi.advanceTimersToNextFrame();

        expect(targetLayer?.style.transform).toBe('translate3d(40px, 60px, 0)');
        expect(targetLayer?.style.width).toBe('320px');
        expect(targetLayer?.style.height).toBe('180px');
    });

    it('replaces resize observer targets when the selected item root changes', () => {
        const resizeObserverInstances = installMockResizeObserver();

        const target = document.createElement('div');
        const firstRoot = document.createElement('div');
        const secondRoot = document.createElement('div');

        const itemId = registerScrollProgressDebugItem({
            element: target,
            root: firstRoot
        });

        overlay = createDebugOverlay();

        expect(resizeObserverInstances).toHaveLength(1);
        expect(resizeObserverInstances[0].observe).toHaveBeenCalledWith(target);
        expect(resizeObserverInstances[0].observe).toHaveBeenCalledWith(firstRoot);

        updateScrollProgressDebugItem(itemId, {
            root: secondRoot
        });

        expect(resizeObserverInstances[0].disconnect).toHaveBeenCalledTimes(1);
        expect(resizeObserverInstances).toHaveLength(2);
        expect(resizeObserverInstances[1].observe).toHaveBeenCalledWith(target);
        expect(resizeObserverInstances[1].observe).toHaveBeenCalledWith(secondRoot);
    });

    it('disconnects the resize observer on destroy', () => {
        const resizeObserverInstances = installMockResizeObserver();

        const target = document.createElement('div');

        registerScrollProgressDebugItem({
            element: target
        });

        overlay = createDebugOverlay();

        expect(resizeObserverInstances).toHaveLength(1);

        overlay.destroy();
        overlay = undefined;

        expect(resizeObserverInstances[0].disconnect).toHaveBeenCalledTimes(1);
    });

    it('recalculates percentage viewport root margin guides on resize', () => {
        vi.useFakeTimers();

        let viewportWidth = 1000;

        vi.spyOn(window, 'innerWidth', 'get').mockImplementation(() => {
            return viewportWidth;
        });

        const target = document.createElement('div');

        registerScrollProgressDebugItem({
            element: target,
            rootMargin: '10% 0px 0px 0px'
        });

        overlay = createDebugOverlay();

        const marginLayer = document.querySelector<HTMLElement>('[data-layer="margin"]');

        const topGuideElement = marginLayer?.querySelector<HTMLElement>('.spdo-margin-guide-top');

        const topLabelElement = topGuideElement?.querySelector<HTMLElement>(
            '.spdo-margin-guide-label'
        );

        expect(topGuideElement?.dataset.state).toBe('offscreen');
        expect(topLabelElement?.textContent).toBe('↑ 10% (100px) offscreen');

        expect(marginLayer?.style.getPropertyValue('--spdo-margin-offset-top')).toBe('100px');

        viewportWidth = 800;

        window.dispatchEvent(new Event('resize'));

        expect(topLabelElement?.textContent).toBe('↑ 10% (100px) offscreen');

        expect(marginLayer?.style.getPropertyValue('--spdo-margin-offset-top')).toBe('100px');

        vi.advanceTimersToNextFrame();

        expect(topLabelElement?.textContent).toBe('↑ 10% (80px) offscreen');

        expect(marginLayer?.style.getPropertyValue('--spdo-margin-offset-top')).toBe('80px');
    });
});
