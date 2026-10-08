import { afterEach, describe, expect, it } from 'vitest';

import {
    activateScrollProgressDebugControl,
    getScrollProgressDebugControlGroupsState,
    resetScrollProgressDebugControlGroups
} from '../../../lib/debug/controls/registry';

import { createScrollProgressDebugOverlayControls } from '../../../lib/debug/overlay/controls';

import { createScrollProgressDebugOverlayLayerVisibilityController } from '../../../lib/debug/overlay/layers';

import type { ScrollProgressDebugOverlayResolvedColors } from '../../../lib/debug/overlay/colors';

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

describe('scroll progress debug overlay controls', () => {
    it('registers overlay layers as debug control toggles', () => {
        const layerVisibility = createScrollProgressDebugOverlayLayerVisibilityController();

        const controls = createScrollProgressDebugOverlayControls(
            layerVisibility,
            resolvedColors,
            unavailableTargetClippingControl
        );

        expect(getScrollProgressDebugControlGroupsState()).toEqual({
            groups: [
                {
                    id: expect.any(String),
                    label: 'Overlays',
                    controls: [
                        {
                            id: 'target',
                            type: 'toggle',
                            label: 'Target',
                            legendColors: ['#facc15'],
                            pressed: false,
                            ariaLabel: 'Toggle target overlay layer',
                            title: 'Toggle target overlay layer'
                        },
                        {
                            id: 'progress',
                            type: 'toggle',
                            label: 'Progress',
                            legendColors: ['#22c55e', '#f97316'],
                            pressed: false,
                            ariaLabel: 'Toggle progress overlay layer',
                            title: 'Toggle progress overlay layer'
                        },
                        {
                            id: 'root',
                            type: 'toggle',
                            label: 'Root',
                            legendColors: ['#60a5fa'],
                            pressed: false,
                            ariaLabel: 'Toggle root overlay layer',
                            title: 'Toggle root overlay layer'
                        },
                        {
                            id: 'margin',
                            type: 'toggle',
                            label: 'Margin',
                            legendColors: ['#a855f7'],
                            pressed: false,
                            ariaLabel: 'Toggle margin overlay layer',
                            title: 'Toggle margin overlay layer'
                        },
                        {
                            id: 'intersection',
                            type: 'toggle',
                            label: 'Intersection',
                            legendColors: ['#f87171'],
                            pressed: false,
                            ariaLabel: 'Toggle intersection overlay layer',
                            title: 'Toggle intersection overlay layer'
                        }
                    ],
                    footerActions: [
                        {
                            id: 'toggle-all',
                            label: 'Turn all on',
                            ariaLabel: 'Turn all overlay layers on',
                            title: 'Turn all overlay layers on'
                        },
                        {
                            id: 'toggle-target-clipping',
                            label: 'Clip target to root',
                            disabled: true,
                            ariaLabel: 'Clip target overlay to custom root',
                            title: 'Clip target overlay to custom root'
                        }
                    ]
                }
            ]
        });

        controls.destroy();
    });

    it('uses the layer visibility state as the pressed state', () => {
        const layerVisibility = createScrollProgressDebugOverlayLayerVisibilityController({
            target: true,
            progress: true
        });

        const controls = createScrollProgressDebugOverlayControls(
            layerVisibility,
            resolvedColors,
            unavailableTargetClippingControl
        );

        const group = getScrollProgressDebugControlGroupsState().groups[0];

        expect(group.controls.find((control) => control.id === 'target')).toMatchObject({
            pressed: true
        });

        expect(group.controls.find((control) => control.id === 'progress')).toMatchObject({
            pressed: true
        });

        expect(group.controls.find((control) => control.id === 'root')).toMatchObject({
            pressed: false
        });

        controls.destroy();
    });

    it('toggles overlay layer visibility when a registered control is activated', () => {
        const layerVisibility = createScrollProgressDebugOverlayLayerVisibilityController();

        const controls = createScrollProgressDebugOverlayControls(
            layerVisibility,
            resolvedColors,
            unavailableTargetClippingControl
        );

        const groupId = getScrollProgressDebugControlGroupsState().groups[0].id;

        activateScrollProgressDebugControl(groupId, 'target');

        expect(layerVisibility.getState().target).toBe(true);

        expect(
            getScrollProgressDebugControlGroupsState().groups[0].controls.find(
                (control) => control.id === 'target'
            )
        ).toMatchObject({
            pressed: true
        });

        activateScrollProgressDebugControl(groupId, 'target');

        expect(layerVisibility.getState().target).toBe(false);

        expect(
            getScrollProgressDebugControlGroupsState().groups[0].controls.find(
                (control) => control.id === 'target'
            )
        ).toMatchObject({
            pressed: false
        });

        controls.destroy();
    });

    it('updates registered controls when layer visibility changes programmatically', () => {
        const layerVisibility = createScrollProgressDebugOverlayLayerVisibilityController();

        const controls = createScrollProgressDebugOverlayControls(
            layerVisibility,
            resolvedColors,
            unavailableTargetClippingControl
        );

        layerVisibility.setLayerVisible('progress', true);

        expect(
            getScrollProgressDebugControlGroupsState().groups[0].controls.find(
                (control) => control.id === 'progress'
            )
        ).toMatchObject({
            legendColors: ['#22c55e', '#f97316'],
            pressed: true
        });

        controls.destroy();
    });

    it('unregisters overlay controls on destroy', () => {
        const layerVisibility = createScrollProgressDebugOverlayLayerVisibilityController();

        const controls = createScrollProgressDebugOverlayControls(
            layerVisibility,
            resolvedColors,
            unavailableTargetClippingControl
        );

        expect(getScrollProgressDebugControlGroupsState().groups).toHaveLength(1);

        controls.destroy();

        expect(getScrollProgressDebugControlGroupsState()).toEqual({
            groups: []
        });
    });

    it('does not update the registry after destroy', () => {
        const layerVisibility = createScrollProgressDebugOverlayLayerVisibilityController();

        const controls = createScrollProgressDebugOverlayControls(
            layerVisibility,
            resolvedColors,
            unavailableTargetClippingControl
        );

        controls.destroy();

        controls.updateTargetClippingState({
            enabled: true,
            available: true
        });

        layerVisibility.setLayerVisible('target', true);

        expect(getScrollProgressDebugControlGroupsState()).toEqual({
            groups: []
        });
    });

    it('ignores repeated destroy calls', () => {
        const layerVisibility = createScrollProgressDebugOverlayLayerVisibilityController();

        const controls = createScrollProgressDebugOverlayControls(
            layerVisibility,
            resolvedColors,
            unavailableTargetClippingControl
        );

        controls.destroy();
        controls.destroy();

        expect(getScrollProgressDebugControlGroupsState()).toEqual({
            groups: []
        });
    });
});
