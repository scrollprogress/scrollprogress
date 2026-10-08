import type { ScrollProgressDebugRegistryState } from '../../registry.js';
import { renderDebugPaletteItem } from './item.js';

export function renderDebugPaletteItems(
    state: ScrollProgressDebugRegistryState,
    detailsOpen: boolean,
    detailsIdPrefix: string
): string {
    if (state.items.length === 0) {
        return `
            <div
                class="spdp-empty-state"
                data-scroll-progress-debug-palette-part="empty-state">
                <p class="spdp-empty-message">No debug items.</p>
            </div>
        `;
    }

    return `
        <ul
            class="spdp-tracker-list"
            role="list"
            data-scroll-progress-debug-palette-part="tracker-list"
        >
            ${state.items
                .map((item) => renderDebugPaletteItem(item, detailsOpen, detailsIdPrefix))
                .join('')}
        </ul>
    `;
}
