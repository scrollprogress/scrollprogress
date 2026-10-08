import {
    registerDebugPaletteControlGroup,
    type ScrollProgressDebugPaletteControlGroupFooterActionRegistration,
    type ScrollProgressDebugPaletteControlRegistration
} from '../palette/control-groups.js';

import {
    scrollProgressDebugOverlayLayers,
    type ScrollProgressDebugOverlayLayer,
    type ScrollProgressDebugOverlayLayerVisibilityController,
    type ScrollProgressDebugOverlayLayerVisibilityState
} from './layers.js';

import type {
    ScrollProgressDebugOverlayColorId,
    ScrollProgressDebugOverlayResolvedColors
} from './colors.js';

export interface ScrollProgressDebugOverlayTargetClippingState {
    enabled: boolean;
    available: boolean;
}

export interface ScrollProgressDebugOverlayTargetClippingControl {
    state: ScrollProgressDebugOverlayTargetClippingState;
    onToggle: () => void;
}

export interface ScrollProgressDebugOverlayControls {
    updateTargetClippingState: (state: ScrollProgressDebugOverlayTargetClippingState) => void;
    destroy: () => void;
}

const overlayLayerLabels: Record<ScrollProgressDebugOverlayLayer, string> = {
    target: 'Target',
    progress: 'Progress',
    root: 'Root',
    margin: 'Margin',
    intersection: 'Intersection'
};

const overlayLayerColorIds = {
    target: ['target'],
    progress: ['progress-start', 'progress-end'],
    root: ['root'],
    margin: ['margin'],
    intersection: ['intersection']
} as const satisfies Record<
    ScrollProgressDebugOverlayLayer,
    readonly ScrollProgressDebugOverlayColorId[]
>;

function createScrollProgressDebugOverlayControlLabel(
    layer: ScrollProgressDebugOverlayLayer
): string {
    return overlayLayerLabels[layer];
}

function createScrollProgressDebugOverlayControlAriaLabel(
    layer: ScrollProgressDebugOverlayLayer
): string {
    const label = createScrollProgressDebugOverlayControlLabel(layer);

    return `Toggle ${label.toLowerCase()} overlay layer`;
}

function createScrollProgressDebugOverlayLayerControls(
    state: ScrollProgressDebugOverlayLayerVisibilityState,
    controller: ScrollProgressDebugOverlayLayerVisibilityController,
    colors: ScrollProgressDebugOverlayResolvedColors
): ScrollProgressDebugPaletteControlRegistration[] {
    return scrollProgressDebugOverlayLayers.map((layer) => {
        const label = createScrollProgressDebugOverlayControlLabel(layer);

        return {
            id: layer,
            type: 'toggle',
            label,
            legendColors: createScrollProgressDebugOverlayControlLegendColors(layer, colors),
            pressed: state[layer],
            ariaLabel: createScrollProgressDebugOverlayControlAriaLabel(layer),
            title: createScrollProgressDebugOverlayControlAriaLabel(layer),
            onActivate: () => {
                controller.toggleLayerVisible(layer);
            }
        };
    });
}

function createScrollProgressDebugOverlayControlLegendColors(
    layer: ScrollProgressDebugOverlayLayer,
    colors: ScrollProgressDebugOverlayResolvedColors
): readonly string[] {
    return overlayLayerColorIds[layer].map((colorId) => colors[colorId]);
}

function areAllScrollProgressDebugOverlayLayersVisible(
    state: ScrollProgressDebugOverlayLayerVisibilityState
): boolean {
    return scrollProgressDebugOverlayLayers.every((layer) => state[layer]);
}

function createScrollProgressDebugOverlayFooterActions(
    state: ScrollProgressDebugOverlayLayerVisibilityState,
    controller: ScrollProgressDebugOverlayLayerVisibilityController,
    targetClippingState: ScrollProgressDebugOverlayTargetClippingState,
    onToggleTargetClipping: () => void
): ScrollProgressDebugPaletteControlGroupFooterActionRegistration[] {
    const nextVisible = !areAllScrollProgressDebugOverlayLayersVisible(state);
    const label = nextVisible ? 'Turn all on' : 'Turn all off';
    const ariaLabel = `Turn all overlay layers ${nextVisible ? 'on' : 'off'}`;

    const targetClippingLabel = targetClippingState.enabled
        ? 'Show full target'
        : 'Clip target to root';

    const targetClippingAriaLabel = targetClippingState.enabled
        ? 'Show full target overlay'
        : 'Clip target overlay to custom root';

    return [
        {
            id: 'toggle-all',
            label,
            ariaLabel,
            title: ariaLabel,
            onActivate: () => {
                controller.setAllLayersVisible(nextVisible);
            }
        },
        {
            id: 'toggle-target-clipping',
            label: targetClippingLabel,
            disabled: !targetClippingState.available,
            ariaLabel: targetClippingAriaLabel,
            title: targetClippingAriaLabel,
            onActivate: onToggleTargetClipping
        }
    ];
}

export function createScrollProgressDebugOverlayControls(
    controller: ScrollProgressDebugOverlayLayerVisibilityController,
    colors: ScrollProgressDebugOverlayResolvedColors,
    targetClippingControl: ScrollProgressDebugOverlayTargetClippingControl
): ScrollProgressDebugOverlayControls {
    const initialState = controller.getState();
    let targetClippingState = { ...targetClippingControl.state };

    const controlGroup = registerDebugPaletteControlGroup({
        label: 'Overlays',
        controls: createScrollProgressDebugOverlayLayerControls(initialState, controller, colors),
        footerActions: createScrollProgressDebugOverlayFooterActions(
            initialState,
            controller,
            targetClippingState,
            targetClippingControl.onToggle
        )
    });

    let isInitialNotification = true;
    let isDestroyed = false;

    const unsubscribe = controller.subscribe((state) => {
        if (isInitialNotification) {
            isInitialNotification = false;
            return;
        }

        controlGroup.update({
            controls: createScrollProgressDebugOverlayLayerControls(state, controller, colors),
            footerActions: createScrollProgressDebugOverlayFooterActions(
                state,
                controller,
                targetClippingState,
                targetClippingControl.onToggle
            )
        });
    });

    return {
        updateTargetClippingState(state) {
            if (
                isDestroyed ||
                (targetClippingState.enabled === state.enabled &&
                    targetClippingState.available === state.available)
            ) {
                return;
            }

            targetClippingState = { ...state };

            controlGroup.update({
                footerActions: createScrollProgressDebugOverlayFooterActions(
                    controller.getState(),
                    controller,
                    targetClippingState,
                    targetClippingControl.onToggle
                )
            });
        },
        destroy() {
            if (isDestroyed) {
                return;
            }

            isDestroyed = true;
            unsubscribe();
            controlGroup.destroy();
        }
    };
}
