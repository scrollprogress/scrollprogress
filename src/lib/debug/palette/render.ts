import { type ScrollProgressDebugRegistryState } from '../registry.js';

import type { ScrollProgressDebugControlGroupsState } from '../controls/registry.js';

import { renderDebugPaletteHeader } from './ui/header.js';
import { renderDebugPaletteItems } from './ui/item-list.js';
import type { DebugPaletteUiState } from './ui-state.js';
import { renderDebugPaletteControlGroups } from './ui/control-groups.js';

export function renderDebugPalette(
    state: ScrollProgressDebugRegistryState,
    uiState: DebugPaletteUiState,
    controlGroupsState: ScrollProgressDebugControlGroupsState,
    detailsIdPrefix: string
): string {
    return `
        ${renderDebugPaletteHeader(state, uiState)}
        ${
            uiState.isCollapsed
                ? ''
                : `
                    ${renderDebugPaletteControlGroups(controlGroupsState, uiState)}
                    ${renderDebugPaletteItems(state, uiState.isDetailsOpen, detailsIdPrefix)}
                `
        }
    `;
}
