import {
    registerScrollProgressDebugControlGroup,
    unregisterScrollProgressDebugControlGroup,
    updateScrollProgressDebugControlGroup,
    type ScrollProgressDebugControlGroupUpdate
} from '../controls/registry.js';

import {
    getScrollProgressDebugRegistryState,
    type ScrollProgressDebugRegistryItem,
    type ScrollProgressDebugRegistryState
} from '../registry.js';

export type ScrollProgressDebugPaletteControlType = 'button' | 'toggle';

export interface ScrollProgressDebugPaletteControlActionContext {
    readonly registryState: ScrollProgressDebugRegistryState;
    readonly selectedItem: ScrollProgressDebugRegistryItem | null;
}

export interface ScrollProgressDebugPaletteControlRegistration {
    id: string;
    type: ScrollProgressDebugPaletteControlType;
    label: string;
    legendColors?: readonly string[];
    pressed?: boolean;
    disabled?: boolean;
    ariaLabel?: string;
    title?: string;
    onActivate: (context: ScrollProgressDebugPaletteControlActionContext) => void;
}

export interface ScrollProgressDebugPaletteControlGroupFooterActionRegistration {
    id: string;
    label: string;
    disabled?: boolean;
    ariaLabel?: string;
    title?: string;
    onActivate: (context: ScrollProgressDebugPaletteControlActionContext) => void;
}

export interface ScrollProgressDebugPaletteControlGroupRegistration {
    label: string;
    controls: ScrollProgressDebugPaletteControlRegistration[];
    footerActions?: ScrollProgressDebugPaletteControlGroupFooterActionRegistration[];
}

export type ScrollProgressDebugPaletteControlGroupUpdate =
    Partial<ScrollProgressDebugPaletteControlGroupRegistration>;

export interface ScrollProgressDebugPaletteControlGroupController {
    readonly id: string;
    update: (update: ScrollProgressDebugPaletteControlGroupUpdate) => void;
    destroy: () => void;
}

function createActionContext(): ScrollProgressDebugPaletteControlActionContext {
    const registryState = getScrollProgressDebugRegistryState();

    return {
        registryState,
        selectedItem:
            registryState.items.find((item) => item.id === registryState.selectedId) ?? null
    };
}

function prepareControl(control: ScrollProgressDebugPaletteControlRegistration) {
    return {
        ...control,
        onActivate: () => control.onActivate(createActionContext())
    };
}

function prepareFooterAction(
    action: ScrollProgressDebugPaletteControlGroupFooterActionRegistration
) {
    return {
        ...action,
        onActivate: () => action.onActivate(createActionContext())
    };
}

function prepareUpdate(
    update: ScrollProgressDebugPaletteControlGroupUpdate
): ScrollProgressDebugControlGroupUpdate {
    return {
        ...update,
        controls: update.controls?.map(prepareControl),
        footerActions: update.footerActions?.map(prepareFooterAction)
    };
}

export function registerDebugPaletteControlGroup(
    registration: ScrollProgressDebugPaletteControlGroupRegistration
): ScrollProgressDebugPaletteControlGroupController {
    const id = registerScrollProgressDebugControlGroup({
        label: registration.label,
        controls: registration.controls.map(prepareControl),
        footerActions: registration.footerActions?.map(prepareFooterAction)
    });

    let isDestroyed = false;

    return {
        id,
        update(update) {
            if (isDestroyed) {
                return;
            }

            updateScrollProgressDebugControlGroup(id, prepareUpdate(update));
        },
        destroy() {
            if (isDestroyed) {
                return;
            }

            isDestroyed = true;
            unregisterScrollProgressDebugControlGroup(id);
        }
    };
}
