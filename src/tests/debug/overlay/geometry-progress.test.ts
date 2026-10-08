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

describe('scroll progress debug overlay progress geometry', () => {
    it('positions the progress overlay layer between start and end on the y axis', () => {
        const target = document.createElement('div');
        const root = document.createElement('div');

        root.getBoundingClientRect = () => createTestRect(10, 20, 300, 1000);
        setElementSize(root, { width: 300, height: 1000 });

        registerScrollProgressDebugItem({
            element: target,
            root,
            axis: 'y',
            start: 0.8,
            end: 0.4
        });

        overlay = createDebugOverlay();

        const progressLayer = document.querySelector<HTMLElement>('[data-layer="progress"]');

        expect(progressLayer).toBeInstanceOf(HTMLDivElement);
        expect(progressLayer?.dataset.hasGeometry).toBe('true');
        expect(progressLayer?.style.transform).toContain('translate3d(10px, 420px, 0');
        expect(progressLayer?.style.width).toBe('300px');
        expect(progressLayer?.style.height).toBe('400px');
    });

    it('syncs progress overlay marker labels from the selected item config', () => {
        const element = document.createElement('section');

        document.body.append(element);

        element.getBoundingClientRect = () => createTestRect(10, 20, 100, 200);

        registerScrollProgressDebugItem({
            element,
            axis: 'y',
            start: 0.8,
            end: 0.4,
            inverted: false
        });

        overlay = createDebugOverlay();

        const progressRange = document.querySelector<HTMLElement>('.spdo-progress-range');
        const startLabel = document.querySelector<HTMLElement>('.spdo-progress-label-start');
        const endLabel = document.querySelector<HTMLElement>('.spdo-progress-label-end');

        expect(progressRange?.dataset.axis).toBe('y');
        expect(progressRange?.classList.contains('spdo-axis-y')).toBe(true);
        expect(progressRange?.classList.contains('spdo-axis-x')).toBe(false);
        expect(progressRange?.dataset.start).toBe('0.8');
        expect(progressRange?.dataset.end).toBe('0.4');
        expect(progressRange?.dataset.inverted).toBe('false');

        expect(startLabel?.textContent).toBe('↓ start: 0.8');
        expect(endLabel?.textContent).toBe('↑ end: 0.4');
    });

    it('positions the progress overlay layer between start and end on the x axis', () => {
        const target = document.createElement('div');
        const root = document.createElement('div');

        root.getBoundingClientRect = () => createTestRect(10, 20, 1000, 300);
        setElementSize(root, { width: 1000, height: 300 });

        registerScrollProgressDebugItem({
            element: target,
            root,
            axis: 'x',
            start: 0.75,
            end: 0.25
        });

        overlay = createDebugOverlay();

        const progressLayer = document.querySelector<HTMLElement>('[data-layer="progress"]');

        expect(progressLayer).toBeInstanceOf(HTMLDivElement);
        expect(progressLayer?.dataset.hasGeometry).toBe('true');
        expect(progressLayer?.style.transform).toContain('translate3d(260px, 20px, 0');
        expect(progressLayer?.style.width).toBe('500px');
        expect(progressLayer?.style.height).toBe('300px');
    });

    it('keeps progress overlay marker arrows geometry-based when inverted', () => {
        const element = document.createElement('section');

        document.body.append(element);

        element.getBoundingClientRect = () => createTestRect(10, 20, 100, 200);

        registerScrollProgressDebugItem({
            element,
            axis: 'y',
            start: 0.8,
            end: 0.4,
            inverted: true
        });

        overlay = createDebugOverlay();

        const progressRange = document.querySelector<HTMLElement>('.spdo-progress-range');
        const startLabel = document.querySelector<HTMLElement>('.spdo-progress-label-start');
        const endLabel = document.querySelector<HTMLElement>('.spdo-progress-label-end');

        expect(progressRange?.dataset.axis).toBe('y');
        expect(progressRange?.dataset.inverted).toBe('true');
        expect(startLabel?.textContent).toBe('↓ start: 0.8');
        expect(endLabel?.textContent).toBe('↑ end: 0.4');
    });

    it('syncs progress overlay axis class and marker labels for x axis items', () => {
        const element = document.createElement('section');

        document.body.append(element);

        element.getBoundingClientRect = () => createTestRect(10, 20, 100, 200);

        registerScrollProgressDebugItem({
            element,
            axis: 'x',
            start: 0.25,
            end: 0.75
        });

        overlay = createDebugOverlay();

        const progressRange = document.querySelector<HTMLElement>('.spdo-progress-range');
        const startLabel = document.querySelector<HTMLElement>('.spdo-progress-label-start');
        const endLabel = document.querySelector<HTMLElement>('.spdo-progress-label-end');

        expect(progressRange?.dataset.axis).toBe('x');
        expect(progressRange?.dataset.start).toBe('0.25');
        expect(progressRange?.dataset.end).toBe('0.75');
        expect(progressRange?.classList.contains('spdo-axis-x')).toBe(true);
        expect(progressRange?.classList.contains('spdo-axis-y')).toBe(false);

        expect(startLabel?.textContent).toBe('→ start: 0.25');
        expect(endLabel?.textContent).toBe('← end: 0.75');
    });

    it('keeps x axis progress overlay marker arrows geometry-based when inverted', () => {
        const element = document.createElement('section');

        document.body.append(element);

        element.getBoundingClientRect = () => createTestRect(10, 20, 100, 200);

        registerScrollProgressDebugItem({
            element,
            axis: 'x',
            start: 0.25,
            end: 0.75,
            inverted: true
        });

        overlay = createDebugOverlay();

        const progressRange = document.querySelector<HTMLElement>('.spdo-progress-range');
        const startLabel = document.querySelector<HTMLElement>('.spdo-progress-label-start');
        const endLabel = document.querySelector<HTMLElement>('.spdo-progress-label-end');

        expect(progressRange?.dataset.axis).toBe('x');
        expect(progressRange?.dataset.inverted).toBe('true');
        expect(startLabel?.textContent).toBe('→ start: 0.25');
        expect(endLabel?.textContent).toBe('← end: 0.75');
    });
});
