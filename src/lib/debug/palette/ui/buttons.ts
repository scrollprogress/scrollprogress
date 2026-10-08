import {
    escapeAttribute,
    escapeHtml,
    formatDebugProgress,
    formatDebugRatio
} from '../utils/render-utils.js';

import { renderDebugPaletteDragIcon } from './icons.js';

type DebugPaletteStandardButtonAction = 'toggle-collapse' | 'activate-control';

type DebugPaletteButtonInput = {
    id?: string;
    controlGroupId?: string;
    controlId?: string;
    action?: DebugPaletteStandardButtonAction;
    label?: string;
    icon?: string;
    className?: string;
    pressed?: boolean;
    disabled?: boolean;
    ariaLabel?: string;
    title?: string;
    expanded?: boolean;
};

type DebugPaletteHandleKind = 'drag' | 'resize';

type DebugPaletteButtonContentInput = {
    label?: string;
    icon?: string;
};

function renderDebugPaletteButtonClass(input: {
    label?: string;
    icon?: string;
    className?: string;
}): string {
    const hasIcon = Boolean(input.icon);
    const hasLabel = Boolean(input.label);

    return [
        'spdp-button',
        hasIcon && !hasLabel ? 'spdp-icon-button' : '',
        hasIcon && hasLabel ? 'spdp-button-with-icon' : '',
        input.className ?? ''
    ]
        .filter(Boolean)
        .join(' ');
}

function renderDebugPaletteButtonElement(input: {
    className: string;
    attributes: string;
    content: string;
}): string {
    return `
        <button
            class="${escapeAttribute(input.className)}"
            type="button"${input.attributes}>
            ${input.content}
        </button>
    `;
}

export function renderDebugPaletteButton(input: DebugPaletteButtonInput): string {
    const buttonClass = renderDebugPaletteButtonClass(input);

    const attributes = [
        input.id ? ` data-scroll-progress-debug-id="${escapeAttribute(input.id)}"` : '',
        input.controlGroupId
            ? ` data-scroll-progress-debug-control-group-id="${escapeAttribute(input.controlGroupId)}"`
            : '',
        input.controlId
            ? ` data-scroll-progress-debug-control-id="${escapeAttribute(input.controlId)}"`
            : '',
        input.action ? ` data-scroll-progress-debug-action="${escapeAttribute(input.action)}"` : '',
        typeof input.pressed === 'boolean' ? ` aria-pressed="${String(input.pressed)}"` : '',
        input.ariaLabel ? ` aria-label="${escapeAttribute(input.ariaLabel)}"` : '',
        input.title ? ` title="${escapeAttribute(input.title)}"` : '',
        typeof input.expanded === 'boolean' ? ` aria-expanded="${String(input.expanded)}"` : '',
        input.disabled ? ' disabled' : ''
    ].join('');

    return renderDebugPaletteButtonElement({
        className: buttonClass,
        attributes,
        content: renderDebugPaletteButtonContent(input)
    });
}

function renderDebugPaletteButtonContent(input: DebugPaletteButtonContentInput): string {
    if (input.icon && input.label) {
        return `
            ${input.icon}
            <span class="spdp-button-label">${escapeHtml(input.label)}</span>
        `;
    }

    if (input.icon) {
        return input.icon;
    }

    return escapeHtml(input.label ?? '');
}

function renderDebugPaletteHandleButton(input: {
    kind: DebugPaletteHandleKind;
    label?: string;
    icon?: string;
    ariaLabel?: string;
    title?: string;
    className?: string;
}): string {
    const buttonClass = renderDebugPaletteButtonClass({
        label: input.label,
        icon: input.icon,
        className: ['spdp-handle-button', `spdp-${input.kind}-handle`, input.className ?? '']
            .filter(Boolean)
            .join(' ')
    });

    const attributes = [
        ` data-scroll-progress-debug-handle="${escapeAttribute(input.kind)}"`,
        input.ariaLabel ? ` aria-label="${escapeAttribute(input.ariaLabel)}"` : '',
        input.title ? ` title="${escapeAttribute(input.title)}"` : ''
    ].join('');

    return renderDebugPaletteButtonElement({
        className: buttonClass,
        attributes,
        content: renderDebugPaletteButtonContent(input)
    });
}

export function renderDebugPaletteSelectButton(input: {
    id: string;
    title: string;
    debugId: string;
    selected: boolean;
    detailsOpen: boolean;
    detailsId: string;
    progress: number;
    intersectionRatio: number;
    inverted: boolean;
    tracking: boolean;
    completed: boolean;
}): string {
    const selectedAttribute = input.selected ? ' aria-current="true"' : '';
    const detailsExpanded = input.selected && input.detailsOpen;
    const selectLabel = input.selected
        ? `${detailsExpanded ? 'Hide' : 'Show'} ${input.title} debug item details`
        : `Select ${input.title} debug item and show details`;
    const status = input.completed ? 'completed' : input.tracking ? 'tracking' : 'idle';

    return `
        <button
            class="spdp-tracker-select"
            type="button"
            data-scroll-progress-debug-action="select"
            data-scroll-progress-debug-id="${escapeAttribute(input.id)}"
            aria-label="${escapeAttribute(selectLabel)}"
            aria-expanded="${String(detailsExpanded)}"
            aria-controls="${escapeAttribute(input.detailsId)}"${selectedAttribute}
        >
            <span class="spdp-tracker-content">
                <span class="spdp-tracker-row spdp-tracker-primary-row">
                    <span class="spdp-tracker-title">${escapeHtml(input.title)}</span>
                    <span class="spdp-tracker-badges">
                        ${input.inverted ? '<span class="spdp-badge spdp-inverted-badge">inverted</span>' : ''}
                        <span class="spdp-badge spdp-status-badge">${escapeHtml(status)}</span>
                    </span>
                </span>

                <span class="spdp-tracker-row spdp-tracker-secondary-row">
                    <span class="spdp-tracker-debug-id">${escapeHtml(input.debugId)}</span>
                    <span class="spdp-tracker-metrics">
                    ${renderDebugPaletteMetric('progress', formatDebugProgress(input.progress))}
                    ${renderDebugPaletteMetric('io ratio', formatDebugRatio(input.intersectionRatio))}
                    </span>
                </span>
            </span>
        </button>
    `;
}

export function renderDebugPaletteDragButton(): string {
    return renderDebugPaletteHandleButton({
        kind: 'drag',
        icon: renderDebugPaletteDragIcon(),
        ariaLabel: 'Move palette',
        title: 'Move palette'
    });
}

function renderDebugPaletteMetric(label: string, value: string): string {
    return `
        <span class="spdp-metric-row">
            <span class="spdp-metric-label">${escapeHtml(label)}</span>
            <span class="spdp-metric-value">${escapeHtml(value)}</span>
        </span>
    `;
}
