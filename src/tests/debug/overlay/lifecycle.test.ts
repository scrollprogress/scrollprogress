// @vitest-environment happy-dom

import { afterEach, describe, expect, it } from 'vitest';

import {
    getScrollProgressDebugControlGroupsState,
    resetScrollProgressDebugControlGroups
} from '../../../lib/debug/controls/registry';
import { createDebugOverlay } from '../../../lib/debug/overlay/overlay';
import { resetScrollProgressDebugRegistry } from '../../../lib/debug/registry';

let overlay: ReturnType<typeof createDebugOverlay> | undefined;

afterEach(() => {
    overlay?.destroy();
    overlay = undefined;

    resetScrollProgressDebugControlGroups();
    resetScrollProgressDebugRegistry();
    document.body.innerHTML = '';
});

describe('scroll progress debug overlay lifecycle', () => {
    it('mounts the styled overlay root in the document body', () => {
        overlay = createDebugOverlay();

        const element = document.querySelector('.scroll-progress-debug-overlay');
        const rootElement = element?.querySelector('.spdo-root');
        const styleElement = element?.querySelector('style');

        expect(element).toBeInstanceOf(HTMLDivElement);
        expect(element?.getAttribute('aria-hidden')).toBe('true');
        expect(rootElement).toBeInstanceOf(HTMLDivElement);
        expect(styleElement).toBeInstanceOf(HTMLStyleElement);
    });

    it('supports a custom mount target and class name', () => {
        const target = document.createElement('div');
        document.body.append(target);

        overlay = createDebugOverlay({
            target,
            className: 'playground-debug-overlay'
        });

        const element = target.querySelector('.scroll-progress-debug-overlay');

        expect(element).toBeInstanceOf(HTMLDivElement);
        expect(element?.classList.contains('playground-debug-overlay')).toBe(true);
        expect(document.body.querySelector('.playground-debug-overlay')).toBe(element);
    });

    it('applies a theme name without replacing custom classes', () => {
        overlay = createDebugOverlay({
            className: 'playground-debug-overlay',
            theme: 'tron'
        });

        const element = document.querySelector<HTMLElement>('.scroll-progress-debug-overlay');

        expect(element?.classList.contains('playground-debug-overlay')).toBe(true);
        expect(element?.dataset.scrollProgressDebugTheme).toBe('tron');
    });

    it('does not add a theme attribute by default', () => {
        overlay = createDebugOverlay();

        const element = document.querySelector<HTMLElement>('.scroll-progress-debug-overlay');

        expect(element?.hasAttribute('data-scroll-progress-debug-theme')).toBe(false);
    });

    it('removes the styled overlay root on destroy', () => {
        overlay = createDebugOverlay();

        expect(document.querySelector('.scroll-progress-debug-overlay')).toBeInstanceOf(
            HTMLDivElement
        );

        overlay.destroy();

        expect(document.querySelector('.scroll-progress-debug-overlay')).toBeNull();
    });

    it('unregisters overlay controls on destroy', () => {
        overlay = createDebugOverlay();

        expect(getScrollProgressDebugControlGroupsState().groups).toHaveLength(1);

        overlay.destroy();

        expect(getScrollProgressDebugControlGroupsState()).toEqual({
            groups: []
        });
    });

    it('ignores API calls after destroy', () => {
        const overlay = createDebugOverlay({
            visibleLayers: []
        });

        overlay.destroy();

        overlay.setLayerVisible('target', true);
        overlay.toggleLayerVisible('progress');

        expect(overlay.getLayerVisibilityState()).toEqual({
            target: false,
            progress: false,
            root: false,
            margin: false,
            intersection: false
        });

        expect(getScrollProgressDebugControlGroupsState()).toEqual({
            groups: []
        });
    });

    it('ignores repeated destroy calls', () => {
        overlay = createDebugOverlay();

        overlay.destroy();
        overlay.destroy();

        expect(getScrollProgressDebugControlGroupsState()).toEqual({
            groups: []
        });
    });
});
