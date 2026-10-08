import { getScrollProgressDebugRegistryState } from '../../registry.js';

export function getSelectedDebugItem() {
    const state = getScrollProgressDebugRegistryState();

    return state.items.find((item) => item.selected) ?? null;
}
