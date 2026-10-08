import { escapeAttribute, getDebugPaletteDetailsId } from '../utils/render-utils.js';
import type { ScrollProgressDebugRegistryItem } from '../../registry.js';
import { renderDebugPaletteSelectButton } from './buttons.js';
import { renderDebugPaletteSelectedDetails } from './selected-details.js';

export function renderDebugPaletteItem(
    item: ScrollProgressDebugRegistryItem,
    detailsOpen: boolean,
    detailsIdPrefix: string
): string {
    const title = item.label || item.debugId || item.id;
    const detailsId = getDebugPaletteDetailsId(detailsIdPrefix, item.id);

    return `
        <li
            class="spdp-tracker-list-item">
            <div
                class="spdp-tracker-card"
                data-track-id="${escapeAttribute(item.id)}"
                data-selected="${String(item.selected)}"
                data-tracking="${String(item.state.isTracking)}"
                data-completed="${String(item.completed)}"
            >
               ${renderDebugPaletteSelectButton({
                   id: item.id,
                   title,
                   debugId: item.debugId,
                   selected: item.selected,
                   detailsOpen,
                   detailsId,
                   progress: item.state.progress,
                   intersectionRatio: item.state.intersectionRatio,
                   inverted: item.inverted,
                   tracking: item.state.isTracking,
                   completed: item.completed
               })}
               ${item.selected && detailsOpen ? renderDebugPaletteSelectedDetails(item, detailsId) : ''}
            </div>
        </li>
    `;
}
