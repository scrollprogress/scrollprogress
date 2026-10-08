// @vitest-environment happy-dom

import { setElementSize } from '../../helpers/scroll-progress-test-utils';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
    activateScrollProgressDebugControl,
    getScrollProgressDebugControlGroupsState,
    resetScrollProgressDebugControlGroups
} from '../../../lib/debug/controls/registry';
import { createDebugOverlay } from '../../../lib/debug/overlay/overlay';
import {
    registerScrollProgressDebugItem,
    resetScrollProgressDebugRegistry,
    selectScrollProgressDebugItem
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

describe('scroll progress debug overlay target clipping', () => {
    it('does not clip the target layer to a custom root by default', () => {
        const target = document.createElement('div');
        const root = document.createElement('div');

        target.getBoundingClientRect = () => createTestRect(50, 50, 500, 400);

        root.getBoundingClientRect = () => createTestRect(100, 100, 300, 200);
        setElementSize(root, { width: 300, height: 200 });

        registerScrollProgressDebugItem({
            element: target,
            root
        });

        overlay = createDebugOverlay();

        const targetLayer = document.querySelector<HTMLElement>('[data-layer="target"]');

        expect(targetLayer?.style.clipPath).toBe('');
    });

    it('clips the target layer and its label to custom root bounds', () => {
        const target = document.createElement('div');
        const root = document.createElement('div');

        target.getBoundingClientRect = () => createTestRect(50, 50, 500, 400);

        root.getBoundingClientRect = () => createTestRect(100, 100, 300, 200);
        setElementSize(root, { width: 300, height: 200 });

        registerScrollProgressDebugItem({
            element: target,
            root,
            rootMargin: '40px'
        });

        overlay = createDebugOverlay({
            clipTargetToRoot: true
        });

        const targetLayer = document.querySelector<HTMLElement>('[data-layer="target"]');

        const targetLabel = targetLayer?.querySelector('.spdo-layer-label-target');

        expect(targetLayer?.style.transform).toBe('translate3d(50px, 50px, 0)');
        expect(targetLayer?.style.width).toBe('500px');
        expect(targetLayer?.style.height).toBe('400px');

        expect(targetLayer?.style.clipPath).toBe('inset(50px 150px 150px 50px)');

        expect(targetLabel).toBeInstanceOf(HTMLSpanElement);
        expect(targetLayer?.contains(targetLabel ?? null)).toBe(true);
    });

    it('does not clip the target layer for a viewport root', () => {
        const target = document.createElement('div');

        target.getBoundingClientRect = () => createTestRect(-50, -50, 500, 400);

        registerScrollProgressDebugItem({
            element: target
        });

        overlay = createDebugOverlay({
            clipTargetToRoot: true
        });

        const targetLayer = document.querySelector<HTMLElement>('[data-layer="target"]');

        expect(targetLayer?.style.clipPath).toBe('');
    });

    it('clears target clipping when selection changes to a viewport-root item', () => {
        vi.useFakeTimers();

        const customRootTarget = document.createElement('div');
        const viewportTarget = document.createElement('div');
        const root = document.createElement('div');

        customRootTarget.getBoundingClientRect = () => createTestRect(50, 50, 500, 400);

        viewportTarget.getBoundingClientRect = () => createTestRect(10, 20, 100, 80);

        root.getBoundingClientRect = () => createTestRect(100, 100, 300, 200);
        setElementSize(root, { width: 300, height: 200 });

        registerScrollProgressDebugItem({
            element: customRootTarget,
            root
        });

        const viewportItemId = registerScrollProgressDebugItem({
            element: viewportTarget
        });

        overlay = createDebugOverlay({
            clipTargetToRoot: true
        });

        const targetLayer = document.querySelector<HTMLElement>('[data-layer="target"]');

        expect(targetLayer?.style.clipPath).toBe('inset(50px 150px 150px 50px)');

        selectScrollProgressDebugItem(viewportItemId);

        vi.advanceTimersToNextFrame();

        expect(targetLayer?.style.clipPath).toBe('');
    });

    it('recalculates target clipping after scroll', () => {
        vi.useFakeTimers();

        let targetTop = 50;

        const target = document.createElement('div');
        const root = document.createElement('div');

        target.getBoundingClientRect = () => createTestRect(50, targetTop, 500, 400);

        root.getBoundingClientRect = () => createTestRect(100, 100, 300, 200);
        setElementSize(root, { width: 300, height: 200 });

        root.append(target);
        document.body.append(root);

        registerScrollProgressDebugItem({
            element: target,
            root
        });

        overlay = createDebugOverlay({
            clipTargetToRoot: true
        });

        const targetLayer = document.querySelector<HTMLElement>('[data-layer="target"]');

        expect(targetLayer?.style.clipPath).toBe('inset(50px 150px 150px 50px)');

        targetTop = -50;
        root.dispatchEvent(new Event('scroll'));

        expect(targetLayer?.style.clipPath).toBe('inset(50px 150px 150px 50px)');

        vi.advanceTimersToNextFrame();

        expect(targetLayer?.style.clipPath).toBe('inset(150px 150px 50px 50px)');
    });

    it('recalculates target clipping after resize', () => {
        vi.useFakeTimers();

        let rootWidth = 300;
        let rootHeight = 200;

        const target = document.createElement('div');
        const root = document.createElement('div');
        Object.defineProperties(root, {
            clientWidth: { get: () => rootWidth },
            clientHeight: { get: () => rootHeight }
        });

        target.getBoundingClientRect = () => createTestRect(50, -50, 500, 400);

        root.getBoundingClientRect = () => createTestRect(100, 100, rootWidth, rootHeight);

        root.append(target);
        document.body.append(root);

        registerScrollProgressDebugItem({
            element: target,
            root
        });

        overlay = createDebugOverlay({
            clipTargetToRoot: true
        });

        const targetLayer = document.querySelector<HTMLElement>('[data-layer="target"]');

        expect(targetLayer?.style.clipPath).toBe('inset(150px 150px 50px 50px)');

        rootWidth = 350;
        rootHeight = 250;
        window.dispatchEvent(new Event('resize'));

        expect(targetLayer?.style.clipPath).toBe('inset(150px 150px 50px 50px)');

        vi.advanceTimersToNextFrame();

        expect(targetLayer?.style.clipPath).toBe('inset(150px 100px 0px 50px)');
    });

    it('toggles target clipping through the footer action', () => {
        vi.useFakeTimers();

        const target = document.createElement('div');
        const root = document.createElement('div');

        target.getBoundingClientRect = () => createTestRect(50, 50, 500, 400);

        root.getBoundingClientRect = () => createTestRect(100, 100, 300, 200);
        setElementSize(root, { width: 300, height: 200 });

        registerScrollProgressDebugItem({
            element: target,
            root
        });

        overlay = createDebugOverlay();

        const targetLayer = document.querySelector<HTMLElement>('[data-layer="target"]');

        const groupId = getScrollProgressDebugControlGroupsState().groups[0].id;

        expect(
            getScrollProgressDebugControlGroupsState().groups[0].footerActions?.find(
                (action) => action.id === 'toggle-target-clipping'
            )
        ).toMatchObject({
            label: 'Clip target to root',
            disabled: false
        });

        expect(targetLayer?.style.clipPath).toBe('');

        activateScrollProgressDebugControl(groupId, 'toggle-target-clipping');

        vi.advanceTimersToNextFrame();

        expect(targetLayer?.style.clipPath).toBe('inset(50px 150px 150px 50px)');

        expect(
            getScrollProgressDebugControlGroupsState().groups[0].footerActions?.find(
                (action) => action.id === 'toggle-target-clipping'
            )?.label
        ).toBe('Show full target');

        activateScrollProgressDebugControl(groupId, 'toggle-target-clipping');

        vi.advanceTimersToNextFrame();

        expect(targetLayer?.style.clipPath).toBe('');

        expect(
            getScrollProgressDebugControlGroupsState().groups[0].footerActions?.find(
                (action) => action.id === 'toggle-target-clipping'
            )?.label
        ).toBe('Clip target to root');
    });

    it('preserves target clipping state across custom root and viewport selections', () => {
        vi.useFakeTimers();

        const customRootTarget = document.createElement('div');
        const viewportTarget = document.createElement('div');
        const root = document.createElement('div');

        customRootTarget.getBoundingClientRect = () => createTestRect(50, 50, 500, 400);

        viewportTarget.getBoundingClientRect = () => createTestRect(10, 20, 100, 80);

        root.getBoundingClientRect = () => createTestRect(100, 100, 300, 200);
        setElementSize(root, { width: 300, height: 200 });

        const customRootItemId = registerScrollProgressDebugItem({
            element: customRootTarget,
            root
        });

        const viewportItemId = registerScrollProgressDebugItem({
            element: viewportTarget
        });

        overlay = createDebugOverlay({
            clipTargetToRoot: true
        });

        const targetLayer = document.querySelector<HTMLElement>('[data-layer="target"]');

        expect(targetLayer?.style.clipPath).toBe('inset(50px 150px 150px 50px)');

        selectScrollProgressDebugItem(viewportItemId);

        vi.advanceTimersToNextFrame();

        expect(targetLayer?.style.clipPath).toBe('');

        expect(
            getScrollProgressDebugControlGroupsState().groups[0].footerActions?.find(
                (action) => action.id === 'toggle-target-clipping'
            )
        ).toMatchObject({
            label: 'Show full target',
            disabled: true
        });

        selectScrollProgressDebugItem(customRootItemId);

        vi.advanceTimersToNextFrame();

        expect(targetLayer?.style.clipPath).toBe('inset(50px 150px 150px 50px)');

        expect(
            getScrollProgressDebugControlGroupsState().groups[0].footerActions?.find(
                (action) => action.id === 'toggle-target-clipping'
            )
        ).toMatchObject({
            label: 'Show full target',
            disabled: false
        });
    });
});
