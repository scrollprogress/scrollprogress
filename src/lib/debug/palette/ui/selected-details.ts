import type { ScrollProgressDebugRegistryItem } from '../../registry.js';

import {
    escapeAttribute,
    escapeHtml,
    formatDebugProgress,
    formatDebugRatio,
    formatDebugRoot,
    formatDebugThreshold
} from '../utils/render-utils.js';

type DebugPaletteDetailsRow = readonly [label: string, value: string];

export function renderDebugPaletteSelectedDetails(
    item: ScrollProgressDebugRegistryItem,
    detailsId: string
): string {
    const observationAreaLabel = item.state.isInObservationArea
        ? 'Inside observation area'
        : 'Outside observation area';

    const rootVisibilityLabel = item.state.isRootVisible ? 'Root visible' : 'Root hidden';

    const triggerRows: DebugPaletteDetailsRow[] = [['debug id', item.debugId]];

    const progressRows: DebugPaletteDetailsRow[] = [
        ['progress', formatDebugProgress(item.state.progress)],
        ['progress direction', item.state.progressDirection],
        ['scroll direction', item.state.scrollDirection],
        ['axis', item.axis],
        ['start / end', `${item.start} / ${item.end}`],
        ['inverted', String(item.inverted)]
    ];

    const observerRows: DebugPaletteDetailsRow[] = [
        ['observer ratio', formatDebugRatio(item.state.intersectionRatio)],
        ['tracking', String(item.state.isTracking)],
        ['in observation area', String(item.state.isInObservationArea)],
        ['root visible', String(item.state.isRootVisible)],
        ['root', formatDebugRoot(item.root)],
        ['root margin', item.rootMargin],
        ['require root visible', String(item.requireRootVisible)],
        ['observer threshold', formatDebugThreshold(item.observerThreshold)]
    ];

    const behaviorRows: DebugPaletteDetailsRow[] = [
        ['once', String(item.once)],
        ['completed', String(item.completed)],
        ['css var', item.cssVar ?? 'none']
    ];

    return `
        <section
            id="${escapeAttribute(detailsId)}"
            class="spdp-details-panel"
            data-scroll-progress-debug-palette-part="details"
            data-tracking="${String(item.state.isTracking)}"
            data-completed="${String(item.completed)}"
            aria-label="Selected scroll progress debug item"
        >
            <div class="spdp-details-readouts">
                ${renderDebugPaletteReadout({
                    label: 'Progress',
                    value: formatDebugProgress(item.state.progress),
                    meta: `progress ${item.state.progressDirection} · scroll ${item.state.scrollDirection}`,
                    bar: renderDebugPaletteProgressBar(item.state.progress)
                })}
                ${renderDebugPaletteReadout({
                    label: 'Observer ratio',
                    value: formatDebugRatio(item.state.intersectionRatio),
                    meta: `${observationAreaLabel} · ${rootVisibilityLabel}`,
                    bar: renderDebugPaletteRatioBar(item.state.intersectionRatio)
                })}
            </div>

            <div class="spdp-details-sections">
                ${renderDebugPaletteDetailsSection('Trigger', triggerRows)}
                ${renderDebugPaletteDetailsSection('Progress geometry', progressRows)}
                ${renderDebugPaletteDetailsSection(
                    'Observer tracking',
                    observerRows,
                    'Observer ratio comes from IntersectionObserver, not scroll progress geometry.'
                )}
                ${renderDebugPaletteDetailsSection('Output / behavior', behaviorRows)}
            </div>
        </section>
    `;
}

function renderDebugPaletteReadout(input: {
    label: string;
    value: string;
    meta: string;
    bar: string;
}): string {
    return `
        <div class="spdp-details-readout">
            <div class="spdp-details-readout-head">
                <div class="spdp-details-readout-label">${escapeHtml(input.label)}</div>
                <div class="spdp-details-readout-value">${escapeHtml(input.value)}</div>
            </div>
            ${input.bar}
            <div class="spdp-details-readout-meta">${escapeHtml(input.meta)}</div>
        </div>
    `;
}

function renderDebugPaletteDetailsSection(
    title: string,
    rows: DebugPaletteDetailsRow[],
    note?: string
): string {
    return `
        <section class="spdp-details-section">
            <div class="spdp-details-section-title">${escapeHtml(title)}</div>
            <div class="spdp-details-section-grid">
                ${rows.map(([label, value]) => renderDebugPaletteRow(label, value)).join('')}
            </div>
            ${note ? `<p class="spdp-details-section-note">${escapeHtml(note)}</p>` : ''}
        </section>
    `;
}

function renderDebugPaletteProgressBar(value: number): string {
    const clampedValue = clampUnitValue(value);
    const formattedPercent = (clampedValue * 100).toFixed(1);
    const width = `${formattedPercent}%`;

    return `
        <div
            class="spdp-value-bar spdp-progress-bar"
            role="progressbar"
            aria-label="Scroll progress"
            aria-valuemin="0"
            aria-valuemax="100"
            aria-valuenow="${escapeAttribute(formattedPercent)}"
        >
            <span
                class="spdp-value-bar-fill spdp-progress-bar-fill"
                style="width: ${escapeAttribute(width)}"
            ></span>
        </div>
    `;
}

function renderDebugPaletteRatioBar(value: number): string {
    const clampedValue = clampUnitValue(value);
    const formattedValue = formatDebugRatio(clampedValue);
    const width = `${(clampedValue * 100).toFixed(1)}%`;

    return `
        <div
            class="spdp-value-bar spdp-ratio-bar"
            role="progressbar"
            aria-label="Intersection ratio"
            aria-valuemin="0"
            aria-valuemax="1"
            aria-valuenow="${escapeAttribute(formattedValue)}"
        >
            <span
                class="spdp-value-bar-fill spdp-ratio-bar-fill"
                style="width: ${escapeAttribute(width)}"
            ></span>
        </div>
    `;
}

function renderDebugPaletteRow(label: string, value: string): string {
    return `
        <div class="spdp-details-row">
            <div class="spdp-details-row-label">${escapeHtml(label)}</div>
            <div class="spdp-details-row-value">${escapeHtml(value)}</div>
        </div>
    `;
}

function clampUnitValue(value: number): number {
    return Math.min(Math.max(value, 0), 1);
}
