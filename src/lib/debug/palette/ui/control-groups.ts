import type {
    ScrollProgressDebugControl,
    ScrollProgressDebugControlGroup,
    ScrollProgressDebugControlGroupFooterAction,
    ScrollProgressDebugControlGroupsState
} from '../../controls/registry.js';

import type { DebugPaletteUiState } from '../ui-state.js';

import { escapeAttribute, escapeHtml } from '../utils/render-utils.js';

import { renderDebugPaletteButton } from './buttons.js';

export function renderDebugPaletteControlGroups(
    controlGroupsState: ScrollProgressDebugControlGroupsState,
    uiState: DebugPaletteUiState
): string {
    if (controlGroupsState.groups.length === 0) {
        return '';
    }

    return `
        <div class="spdp-control-groups">
            ${controlGroupsState.groups
                .map((group) => renderDebugPaletteRegisteredControlGroup(group, uiState))
                .join('')}
        </div>
    `;
}

function renderDebugPaletteRegisteredControlGroup(
    group: ScrollProgressDebugControlGroup,
    uiState: DebugPaletteUiState
): string {
    const isCollapsed = isDebugPaletteControlGroupCollapsed(uiState, group.id);

    return renderDebugPaletteControlGroupPanel({
        id: group.id,
        label: group.label,
        summary: createDebugPaletteControlGroupSummary(group),
        ariaLabel: `${group.label} debug controls`,
        isCollapsed,
        body: `
            <div class="spdp-control-group-list">
                ${group.controls
                    .map((control) => renderDebugPaletteRegisteredControl(group.id, control))
                    .join('')}
            </div>
            ${renderDebugPaletteRegisteredControlGroupFooter(group.id, group.footerActions)}
        `
    });
}

function renderDebugPaletteRegisteredControl(
    groupId: string,
    control: ScrollProgressDebugControl
): string {
    if (control.type === 'toggle') {
        return renderDebugPaletteRegisteredToggleControl(groupId, control);
    }

    return renderDebugPaletteRegisteredButtonControl(groupId, control);
}

function renderDebugPaletteRegisteredToggleControl(
    groupId: string,
    control: ScrollProgressDebugControl
): string {
    const isPressed = control.pressed ?? false;

    return `
        <div
            class="spdp-control-row"
            data-control-type="toggle">
            <span class="spdp-control-row-label">
                ${renderDebugPaletteControlLegend(control.legendColors)}
                <span class="spdp-control-row-label-text">
                    ${escapeHtml(control.label)}
                </span>
            </span>
            ${renderDebugPaletteRegisteredControlButton(groupId, control, {
                label: isPressed ? 'On' : 'Off',
                className: 'spdp-control-toggle spdp-control-switch',
                pressed: isPressed
            })}
        </div>
    `;
}

function renderDebugPaletteControlLegend(legendColors: readonly string[] | undefined): string {
    if (!legendColors || legendColors.length === 0) {
        return '';
    }

    return `
        <span
            class="spdp-control-legend"
            aria-hidden="true">
            ${legendColors
                .map(
                    (color) => `
                        <span
                            class="spdp-control-legend-swatch"
                            style="--sp-debug-palette-control-legend-color: ${escapeAttribute(color)};">
                        </span>
                    `
                )
                .join('')}
        </span>
    `;
}

function renderDebugPaletteRegisteredButtonControl(
    groupId: string,
    control: ScrollProgressDebugControl
): string {
    return `
        <div
            class="spdp-control-row spdp-control-row-action"
            data-control-type="button">
            ${renderDebugPaletteRegisteredControlButton(groupId, control, {
                label: control.label,
                className: 'spdp-control-button'
            })}
        </div>
    `;
}

function renderDebugPaletteRegisteredControlButton(
    groupId: string,
    control: ScrollProgressDebugControl,
    options: {
        label: string;
        className: string;
        pressed?: boolean;
    }
): string {
    return renderDebugPaletteButton({
        action: 'activate-control',
        controlGroupId: groupId,
        controlId: control.id,
        label: options.label,
        className: options.className,
        pressed: options.pressed,
        disabled: control.disabled,
        ariaLabel:
            control.ariaLabel ??
            (control.type === 'toggle' ? `Toggle ${control.label}` : control.label),
        title: control.title
    });
}

function isDebugPaletteControlGroupCollapsed(
    uiState: DebugPaletteUiState,
    groupId: string
): boolean {
    return uiState.collapsedControlGroupIds[groupId] === true;
}

function createDebugPaletteControlGroupSummary(group: ScrollProgressDebugControlGroup): string {
    const toggleControls = group.controls.filter((control) => {
        return control.type === 'toggle';
    });

    if (toggleControls.length === 0) {
        const controlLabel = group.controls.length === 1 ? 'control' : 'controls';

        return `${group.controls.length} ${controlLabel}`;
    }

    const activeCount = toggleControls.filter((control) => {
        return control.pressed === true;
    }).length;

    return `${activeCount}/${toggleControls.length} active`;
}

function renderDebugPaletteControlGroupPanel(input: {
    id: string;
    label: string;
    summary: string;
    ariaLabel: string;
    isCollapsed: boolean;
    body: string;
}): string {
    return `
        <div
            class="spdp-control-group spdp-control-group-panel"
            data-control-group-id="${escapeAttribute(input.id)}"
            data-collapsed="${String(input.isCollapsed)}"
            role="group"
            aria-label="${escapeAttribute(input.ariaLabel)}">
            ${renderDebugPaletteControlGroupHeader(input)}
            ${
                input.isCollapsed
                    ? ''
                    : `
                                <div class="spdp-control-group-body">
                                    ${input.body}
                                </div>
                            `
            }
        </div>
    `;
}

function renderDebugPaletteControlGroupHeader(input: {
    id: string;
    label: string;
    summary: string;
    ariaLabel: string;
    isCollapsed: boolean;
}): string {
    const actionLabel = input.isCollapsed ? 'Expand' : 'Collapse';

    return `
        <button
            class="spdp-control-group-header"
            type="button"
            data-scroll-progress-debug-action="toggle-control-group"
            data-scroll-progress-debug-control-group-id="${escapeAttribute(input.id)}"
            aria-expanded="${String(!input.isCollapsed)}"
            aria-label="${escapeAttribute(`${actionLabel} ${input.ariaLabel}`)}">
            <span
                class="spdp-control-group-caret"
                aria-hidden="true">
                ${input.isCollapsed ? '▸' : '▾'}
            </span>
            <span class="spdp-control-group-label">
                ${escapeHtml(input.label)}
            </span>
            <span class="spdp-control-group-summary">
                ${escapeHtml(input.summary)}
            </span>
        </button>
    `;
}

function renderDebugPaletteRegisteredControlGroupFooter(
    groupId: string,
    footerActions: ScrollProgressDebugControlGroupFooterAction[] = []
): string {
    if (footerActions.length === 0) {
        return '';
    }

    return `
        <div class="spdp-control-group-footer">
            ${footerActions
                .map((action) => renderDebugPaletteRegisteredFooterAction(groupId, action))
                .join('')}
        </div>
    `;
}

function renderDebugPaletteRegisteredFooterAction(
    groupId: string,
    action: ScrollProgressDebugControlGroupFooterAction
): string {
    return renderDebugPaletteButton({
        action: 'activate-control',
        controlGroupId: groupId,
        controlId: action.id,
        label: action.label,
        className: 'spdp-control-button spdp-control-group-footer-action',
        disabled: action.disabled,
        ariaLabel: action.ariaLabel ?? action.label,
        title: action.title
    });
}
