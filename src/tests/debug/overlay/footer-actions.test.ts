import { afterEach, describe, expect, it, vi } from 'vitest';

import {
    activateScrollProgressDebugControl,
    getScrollProgressDebugControlGroupsState,
    resetScrollProgressDebugControlGroups,
    subscribeScrollProgressDebugControlGroups
} from '../../../lib/debug/controls/registry';
import type { ScrollProgressDebugOverlayResolvedColors } from '../../../lib/debug/overlay/colors';
import { createScrollProgressDebugOverlayControls } from '../../../lib/debug/overlay/controls';
import { createScrollProgressDebugOverlayLayerVisibilityController } from '../../../lib/debug/overlay/layers';

afterEach(() => {
    resetScrollProgressDebugControlGroups();
});

const resolvedColors = {
    target: '#facc15',
    'progress-start': '#22c55e',
    'progress-end': '#f97316',
    root: '#60a5fa',
    margin: '#a855f7',
    intersection: '#f87171'
} satisfies ScrollProgressDebugOverlayResolvedColors;

const unavailableTargetClippingControl = {
    state: {
        enabled: false,
        available: false
    },
    onToggle: () => {}
};

describe('scroll progress debug overlay footer actions', () => {
    it('turns all overlay layers on and off through the footer action', () => {
        const layerVisibility = createScrollProgressDebugOverlayLayerVisibilityController();

        const controls = createScrollProgressDebugOverlayControls(
            layerVisibility,
            resolvedColors,
            unavailableTargetClippingControl
        );

        const groupId = getScrollProgressDebugControlGroupsState().groups[0].id;

        activateScrollProgressDebugControl(groupId, 'toggle-all');

        expect(layerVisibility.getState()).toEqual({
            target: true,
            progress: true,
            root: true,
            margin: true,
            intersection: true
        });

        let group = getScrollProgressDebugControlGroupsState().groups[0];

        expect(group.controls.filter((control) => control.pressed).length).toBe(5);
        expect(group.footerActions?.[0]).toMatchObject({
            id: 'toggle-all',
            label: 'Turn all off',
            ariaLabel: 'Turn all overlay layers off',
            title: 'Turn all overlay layers off'
        });

        activateScrollProgressDebugControl(groupId, 'toggle-all');

        expect(layerVisibility.getState()).toEqual({
            target: false,
            progress: false,
            root: false,
            margin: false,
            intersection: false
        });

        group = getScrollProgressDebugControlGroupsState().groups[0];

        expect(group.controls.filter((control) => control.pressed).length).toBe(0);
        expect(group.footerActions?.[0]).toMatchObject({
            id: 'toggle-all',
            label: 'Turn all on',
            ariaLabel: 'Turn all overlay layers on',
            title: 'Turn all overlay layers on'
        });

        controls.destroy();
    });

    it('returns the footer action to turn all on after an individual layer is hidden', () => {
        const layerVisibility = createScrollProgressDebugOverlayLayerVisibilityController({
            target: true,
            progress: true,
            root: true,
            margin: true,
            intersection: true
        });

        const controls = createScrollProgressDebugOverlayControls(
            layerVisibility,
            resolvedColors,
            unavailableTargetClippingControl
        );

        const groupId = getScrollProgressDebugControlGroupsState().groups[0].id;

        expect(getScrollProgressDebugControlGroupsState().groups[0].footerActions?.[0].label).toBe(
            'Turn all off'
        );

        activateScrollProgressDebugControl(groupId, 'target');

        expect(getScrollProgressDebugControlGroupsState().groups[0].footerActions?.[0].label).toBe(
            'Turn all on'
        );

        activateScrollProgressDebugControl(groupId, 'toggle-all');

        expect(layerVisibility.getState()).toEqual({
            target: true,
            progress: true,
            root: true,
            margin: true,
            intersection: true
        });

        controls.destroy();
    });

    it('updates the target clipping footer action state', () => {
        const layerVisibility = createScrollProgressDebugOverlayLayerVisibilityController();
        const onToggle = vi.fn();

        const controls = createScrollProgressDebugOverlayControls(layerVisibility, resolvedColors, {
            state: {
                enabled: false,
                available: true
            },
            onToggle
        });

        const groupId = getScrollProgressDebugControlGroupsState().groups[0].id;

        expect(
            getScrollProgressDebugControlGroupsState().groups[0].footerActions?.[1]
        ).toMatchObject({
            id: 'toggle-target-clipping',
            label: 'Clip target to root',
            disabled: false,
            ariaLabel: 'Clip target overlay to custom root',
            title: 'Clip target overlay to custom root'
        });

        activateScrollProgressDebugControl(groupId, 'toggle-target-clipping');

        expect(onToggle).toHaveBeenCalledTimes(1);

        controls.updateTargetClippingState({
            enabled: true,
            available: true
        });

        expect(
            getScrollProgressDebugControlGroupsState().groups[0].footerActions?.[1]
        ).toMatchObject({
            label: 'Show full target',
            disabled: false,
            ariaLabel: 'Show full target overlay',
            title: 'Show full target overlay'
        });

        controls.updateTargetClippingState({
            enabled: true,
            available: false
        });

        activateScrollProgressDebugControl(groupId, 'toggle-target-clipping');

        expect(
            getScrollProgressDebugControlGroupsState().groups[0].footerActions?.[1].disabled
        ).toBe(true);

        expect(onToggle).toHaveBeenCalledTimes(1);

        controls.destroy();
    });

    it('does not update controls when target clipping state is unchanged', () => {
        const layerVisibility = createScrollProgressDebugOverlayLayerVisibilityController();

        const controls = createScrollProgressDebugOverlayControls(
            layerVisibility,
            resolvedColors,
            unavailableTargetClippingControl
        );

        const subscriber = vi.fn();

        const unsubscribe = subscribeScrollProgressDebugControlGroups(subscriber);

        subscriber.mockClear();

        controls.updateTargetClippingState({
            enabled: false,
            available: false
        });

        expect(subscriber).not.toHaveBeenCalled();

        unsubscribe();
        controls.destroy();
    });
});
