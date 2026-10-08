import type { ScrollProgressDebugRegistryState } from '../../registry.js';
import { renderDebugPaletteButton, renderDebugPaletteDragButton } from './buttons.js';

import type { DebugPaletteUiState } from '../ui-state.js';

import { renderDebugPaletteExpandIcon, renderDebugPaletteMinimizeIcon } from './icons.js';

export function renderDebugPaletteHeader(
    state: ScrollProgressDebugRegistryState,
    uiState: DebugPaletteUiState
): string {
    return `
        <div
            class="spdp-header"
            data-scroll-progress-debug-palette-part="header"
        >
            <div class="spdp-header-top">
                <div class="spdp-header-main">
                    <div class="spdp-title">Scroll Progress</div>
                    <div class="spdp-meta">
                        ${state.items.length} registered
                    </div>
                </div>

                <div class="spdp-header-actions">
                    ${renderDebugPaletteDragButton()}
                    ${renderDebugPaletteButton({
                        action: 'toggle-collapse',
                        icon: uiState.isCollapsed
                            ? renderDebugPaletteExpandIcon()
                            : renderDebugPaletteMinimizeIcon(),
                        ariaLabel: uiState.isCollapsed
                            ? 'Expand debug palette'
                            : 'Collapse debug palette',
                        title: uiState.isCollapsed ? 'Expand palette' : 'Minimize palette',
                        expanded: !uiState.isCollapsed
                    })}
                </div>
            </div>
        </div>
    `;
}
