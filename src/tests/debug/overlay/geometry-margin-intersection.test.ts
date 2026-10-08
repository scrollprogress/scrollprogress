// @vitest-environment happy-dom

import { setElementSize } from '../../helpers/scroll-progress-test-utils';

import { afterEach, describe, expect, it } from 'vitest';

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

    resetScrollProgressDebugControlGroups();
    resetScrollProgressDebugRegistry();
    document.body.innerHTML = '';
});

describe('scroll progress debug overlay margin and intersection geometry', () => {
    it('positions the margin overlay layer on the root margin rect', () => {
        const target = document.createElement('div');
        const root = document.createElement('div');

        root.getBoundingClientRect = () => createTestRect(100, 200, 300, 400);
        setElementSize(root, { width: 300, height: 400 });

        registerScrollProgressDebugItem({
            element: target,
            root,
            rootMargin: '10px 20px 30px 40px'
        });

        overlay = createDebugOverlay();

        const marginLayer = document.querySelector<HTMLElement>('[data-layer="margin"]');

        expect(marginLayer).toBeInstanceOf(HTMLDivElement);
        expect(marginLayer?.dataset.hasGeometry).toBe('true');
        expect(marginLayer?.style.transform).toContain('translate3d(60px, 190px, 0');
        expect(marginLayer?.style.width).toBe('360px');
        expect(marginLayer?.style.height).toBe('440px');
    });

    it('positions the margin overlay layer inside the root for negative root margins', () => {
        const target = document.createElement('div');
        const root = document.createElement('div');

        root.getBoundingClientRect = () => createTestRect(100, 200, 300, 400);
        setElementSize(root, { width: 300, height: 400 });

        registerScrollProgressDebugItem({
            element: target,
            root,
            rootMargin: '-10px -20px -30px -40px'
        });

        overlay = createDebugOverlay();

        const marginLayer = document.querySelector<HTMLElement>('[data-layer="margin"]');

        expect(marginLayer).toBeInstanceOf(HTMLDivElement);
        expect(marginLayer?.dataset.hasGeometry).toBe('true');
        expect(marginLayer?.style.transform).toContain('translate3d(140px, 210px, 0');
        expect(marginLayer?.style.width).toBe('240px');
        expect(marginLayer?.style.height).toBe('360px');
    });

    it('positions the margin overlay layer on the root when root margin has no visual effect', () => {
        const target = document.createElement('div');
        const root = document.createElement('div');

        root.getBoundingClientRect = () => createTestRect(100, 200, 300, 400);
        setElementSize(root, { width: 300, height: 400 });

        registerScrollProgressDebugItem({
            element: target,
            root,
            rootMargin: '0px'
        });

        overlay = createDebugOverlay();

        const marginLayer = document.querySelector<HTMLElement>('[data-layer="margin"]');

        expect(marginLayer).toBeInstanceOf(HTMLDivElement);
        expect(marginLayer?.dataset.hasGeometry).toBe('true');
        expect(marginLayer?.style.transform).toContain('translate3d(100px, 200px, 0');
        expect(marginLayer?.style.width).toBe('300px');
        expect(marginLayer?.style.height).toBe('400px');
    });

    it('positions the intersection overlay layer on the overlap between target and effective root', () => {
        const target = document.createElement('div');
        const root = document.createElement('div');

        target.getBoundingClientRect = () => createTestRect(250, 500, 300, 200);

        root.getBoundingClientRect = () => createTestRect(100, 200, 300, 400);
        setElementSize(root, { width: 300, height: 400 });

        registerScrollProgressDebugItem({
            element: target,
            root,
            rootMargin: '0px'
        });

        overlay = createDebugOverlay();

        const intersectionLayer = document.querySelector<HTMLElement>(
            '[data-layer="intersection"]'
        );

        expect(intersectionLayer).toBeInstanceOf(HTMLDivElement);
        expect(intersectionLayer?.dataset.hasGeometry).toBe('true');
        expect(intersectionLayer?.style.transform).toContain('translate3d(250px, 500px, 0');
        expect(intersectionLayer?.style.width).toBe('150px');
        expect(intersectionLayer?.style.height).toBe('100px');
    });

    it('positions the intersection overlay layer using the root margin rect', () => {
        const target = document.createElement('div');
        const root = document.createElement('div');

        target.getBoundingClientRect = () => createTestRect(80, 180, 80, 80);

        root.getBoundingClientRect = () => createTestRect(100, 200, 300, 400);
        setElementSize(root, { width: 300, height: 400 });

        registerScrollProgressDebugItem({
            element: target,
            root,
            rootMargin: '30px'
        });

        overlay = createDebugOverlay();

        const intersectionLayer = document.querySelector<HTMLElement>(
            '[data-layer="intersection"]'
        );

        expect(intersectionLayer).toBeInstanceOf(HTMLDivElement);
        expect(intersectionLayer?.dataset.hasGeometry).toBe('true');
        expect(intersectionLayer?.style.transform).toContain('translate3d(80px, 180px, 0');
        expect(intersectionLayer?.style.width).toBe('80px');
        expect(intersectionLayer?.style.height).toBe('80px');
    });

    it('resets the intersection overlay layer when target and effective root do not overlap', () => {
        const target = document.createElement('div');
        const root = document.createElement('div');

        target.getBoundingClientRect = () => createTestRect(1000, 1000, 100, 100);

        root.getBoundingClientRect = () => createTestRect(100, 200, 300, 400);
        setElementSize(root, { width: 300, height: 400 });

        registerScrollProgressDebugItem({
            element: target,
            root,
            rootMargin: '0px'
        });

        overlay = createDebugOverlay();

        const intersectionLayer = document.querySelector<HTMLElement>(
            '[data-layer="intersection"]'
        );

        expect(intersectionLayer).toBeInstanceOf(HTMLDivElement);
        expect(intersectionLayer?.dataset.hasGeometry).toBe('false');
        expect(intersectionLayer?.style.transform).toBe('');
        expect(intersectionLayer?.style.width).toBe('');
        expect(intersectionLayer?.style.height).toBe('');
    });

    it('positions the margin overlay layer using percentage root margins', () => {
        const target = document.createElement('div');
        const root = document.createElement('div');

        root.getBoundingClientRect = () => createTestRect(100, 200, 1000, 400);
        setElementSize(root, { width: 1000, height: 400 });

        registerScrollProgressDebugItem({
            element: target,
            root,
            rootMargin: '10%'
        });

        overlay = createDebugOverlay();

        const marginLayer = document.querySelector<HTMLElement>('[data-layer="margin"]');

        expect(marginLayer).toBeInstanceOf(HTMLDivElement);
        expect(marginLayer?.dataset.hasGeometry).toBe('true');
        expect(marginLayer?.style.transform).toContain('translate3d(0px, 100px, 0');
        expect(marginLayer?.style.width).toBe('1200px');
        expect(marginLayer?.style.height).toBe('600px');
    });

    it('positions the intersection overlay layer using percentage root margins', () => {
        const target = document.createElement('div');
        const root = document.createElement('div');

        target.getBoundingClientRect = () => createTestRect(40, 140, 40, 40);

        root.getBoundingClientRect = () => createTestRect(100, 200, 1000, 400);
        setElementSize(root, { width: 1000, height: 400 });

        registerScrollProgressDebugItem({
            element: target,
            root,
            rootMargin: '10%'
        });

        overlay = createDebugOverlay();

        const intersectionLayer = document.querySelector<HTMLElement>(
            '[data-layer="intersection"]'
        );

        expect(intersectionLayer).toBeInstanceOf(HTMLDivElement);
        expect(intersectionLayer?.dataset.hasGeometry).toBe('true');
        expect(intersectionLayer?.style.transform).toContain('translate3d(40px, 140px, 0');
        expect(intersectionLayer?.style.width).toBe('40px');
        expect(intersectionLayer?.style.height).toBe('40px');
    });

    it('resets all overlay layer geometry when no debug item is selected', () => {
        overlay = createDebugOverlay();

        const layerElements = Array.from(document.querySelectorAll<HTMLElement>('[data-layer]'));
        const progressRange = document.querySelector<HTMLElement>('.spdo-progress-range');
        const startLabel = document.querySelector<HTMLElement>('.spdo-progress-label-start');
        const endLabel = document.querySelector<HTMLElement>('.spdo-progress-label-end');

        expect(layerElements).toHaveLength(5);

        for (const layerElement of layerElements) {
            expect(layerElement.dataset.hasGeometry).toBe('false');
            expect(layerElement.style.transform).toBe('');
            expect(layerElement.style.width).toBe('');
            expect(layerElement.style.height).toBe('');
        }

        expect(progressRange?.dataset.axis).toBeUndefined();
        expect(progressRange?.dataset.start).toBeUndefined();
        expect(progressRange?.dataset.end).toBeUndefined();
        expect(progressRange?.dataset.inverted).toBeUndefined();
        expect(progressRange?.classList.contains('spdo-axis-x')).toBe(false);
        expect(progressRange?.classList.contains('spdo-axis-y')).toBe(false);
        expect(startLabel?.textContent).toBe('start');
        expect(endLabel?.textContent).toBe('end');
    });
});
