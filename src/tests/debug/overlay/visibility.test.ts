// @vitest-environment happy-dom

import { afterEach, describe, expect, it } from 'vitest';

import {
    activateScrollProgressDebugControl,
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

describe('scroll progress debug overlay visibility', () => {
    it('creates an overlay with target and progress visible by default', () => {
        overlay = createDebugOverlay();

        expect(overlay.getLayerVisibilityState()).toEqual({
            target: true,
            progress: true,
            root: false,
            margin: false,
            intersection: false
        });
    });

    it('uses the configured initial visible layers instead of the defaults', () => {
        overlay = createDebugOverlay({
            visibleLayers: ['root', 'intersection']
        });

        expect(overlay.getLayerVisibilityState()).toEqual({
            target: false,
            progress: false,
            root: true,
            margin: false,
            intersection: true
        });
    });

    it('supports creating an overlay with all layers initially hidden', () => {
        overlay = createDebugOverlay({
            visibleLayers: []
        });

        expect(overlay.getLayerVisibilityState()).toEqual({
            target: false,
            progress: false,
            root: false,
            margin: false,
            intersection: false
        });
    });

    it('updates layer visibility through the overlay API', () => {
        overlay = createDebugOverlay({
            visibleLayers: []
        });

        overlay.setLayerVisible('target', true);

        expect(overlay.getLayerVisibilityState().target).toBe(true);

        overlay.toggleLayerVisible('target');

        expect(overlay.getLayerVisibilityState().target).toBe(false);
    });

    it('registers overlay controls when created', () => {
        overlay = createDebugOverlay();

        expect(getScrollProgressDebugControlGroupsState().groups).toHaveLength(1);

        expect(getScrollProgressDebugControlGroupsState().groups[0]).toMatchObject({
            label: 'Overlays'
        });
    });

    it('keeps registered overlay controls in sync with the overlay API', () => {
        overlay = createDebugOverlay({
            visibleLayers: []
        });

        overlay.setLayerVisible('progress', true);

        expect(
            getScrollProgressDebugControlGroupsState().groups[0].controls.find(
                (control) => control.id === 'progress'
            )
        ).toMatchObject({
            pressed: true
        });
    });

    it('updates overlay state when registered controls are activated', () => {
        overlay = createDebugOverlay({
            visibleLayers: []
        });

        const groupId = getScrollProgressDebugControlGroupsState().groups[0].id;

        activateScrollProgressDebugControl(groupId, 'target');

        expect(overlay.getLayerVisibilityState().target).toBe(true);

        activateScrollProgressDebugControl(groupId, 'target');

        expect(overlay.getLayerVisibilityState().target).toBe(false);
    });
});
