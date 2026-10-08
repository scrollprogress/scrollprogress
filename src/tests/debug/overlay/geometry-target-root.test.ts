// @vitest-environment happy-dom

import { setElementSize } from '../../helpers/scroll-progress-test-utils';

import { afterEach, describe, expect, it } from 'vitest';

import { resetScrollProgressDebugControlGroups } from '../../../lib/debug/controls/registry';
import {
    registerScrollProgressDebugItem,
    resetScrollProgressDebugRegistry
} from '../../../lib/debug/registry';
import { createDebugOverlay } from '../../../lib/debug/overlay/overlay';
import { createTestRect } from './helpers';

let overlay: ReturnType<typeof createDebugOverlay> | undefined;

afterEach(() => {
    overlay?.destroy();
    overlay = undefined;

    resetScrollProgressDebugControlGroups();
    resetScrollProgressDebugRegistry();
    document.body.innerHTML = '';
});

describe('scroll progress debug overlay target and root geometry', () => {
    it('positions the target overlay layer on the selected debug item element', () => {
        const target = document.createElement('div');

        target.getBoundingClientRect = () => createTestRect(10, 20, 300, 150);

        registerScrollProgressDebugItem({
            element: target
        });

        overlay = createDebugOverlay();

        const targetLayer = document.querySelector<HTMLElement>('[data-layer="target"]');

        expect(targetLayer?.dataset.hasGeometry).toBe('true');
        expect(targetLayer?.style.transform).toBe('translate3d(10px, 20px, 0)');
        expect(targetLayer?.style.width).toBe('300px');
        expect(targetLayer?.style.height).toBe('150px');
    });

    it('positions the root overlay layer on the viewport when the selected item has no custom root', () => {
        const target = document.createElement('div');

        registerScrollProgressDebugItem({
            element: target
        });

        overlay = createDebugOverlay();

        const rootLayer = document.querySelector<HTMLElement>('[data-layer="root"]');

        expect(rootLayer).toBeInstanceOf(HTMLDivElement);
        expect(rootLayer?.dataset.hasGeometry).toBe('true');
        expect(rootLayer?.style.transform).toContain('translate3d(0px, 0px, 0');
        expect(rootLayer?.style.width).toBe(`${window.innerWidth}px`);
        expect(rootLayer?.style.height).toBe(`${window.innerHeight}px`);
    });

    it('positions the root overlay layer on the selected item custom root element', () => {
        const target = document.createElement('div');
        const root = document.createElement('div');

        root.getBoundingClientRect = () => createTestRect(30, 40, 500, 250);
        setElementSize(root, { width: 500, height: 250 });

        registerScrollProgressDebugItem({
            element: target,
            root
        });

        overlay = createDebugOverlay();

        const rootLayer = document.querySelector<HTMLElement>('[data-layer="root"]');

        expect(rootLayer).toBeInstanceOf(HTMLDivElement);
        expect(rootLayer?.dataset.hasGeometry).toBe('true');
        expect(rootLayer?.style.transform).toContain('translate3d(30px, 40px, 0');
        expect(rootLayer?.style.width).toBe('500px');
        expect(rootLayer?.style.height).toBe('250px');
    });
});
