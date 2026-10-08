import { expect, vi } from 'vitest';

import {
    registerScrollProgressDebugItem,
    type ScrollProgressDebugItemRegistration
} from '../../../lib/debug/registry';

type PaletteCoreAction = 'toggle-collapse' | 'select';

export function registerPaletteTestItem(
    overrides: Partial<ScrollProgressDebugItemRegistration> = {}
): string {
    const {
        debugId = 'demo',
        label = 'Demo',
        element = document.createElement('div'),
        ...rest
    } = overrides;

    return registerScrollProgressDebugItem({
        debugId,
        label,
        element,
        ...rest
    });
}

export function getPaletteActionButton(
    action: PaletteCoreAction,
    id?: string
): HTMLButtonElement | null {
    const actionSelector = `[data-scroll-progress-debug-action="${action}"]`;
    const idSelector = id ? `[data-scroll-progress-debug-id="${id}"]` : '';

    return document.querySelector<HTMLButtonElement>(`${idSelector}${actionSelector}`);
}

export function getPaletteControlGroupToggleButton(groupId: string): HTMLButtonElement | null {
    return document.querySelector<HTMLButtonElement>(
        `[data-scroll-progress-debug-action="toggle-control-group"]` +
            `[data-scroll-progress-debug-control-group-id="${groupId}"]`
    );
}

export function getPaletteElement(parent: Document | Element = document): HTMLElement | null {
    return parent.querySelector<HTMLElement>('[data-scroll-progress-debug-palette="true"]');
}

export function getPaletteContentElement(
    parent: Document | Element = document
): HTMLElement | null {
    return parent.querySelector<HTMLElement>('[data-scroll-progress-debug-palette-content="true"]');
}

export function getPaletteDragHandle(
    parent: Document | Element = document
): HTMLButtonElement | null {
    return parent.querySelector<HTMLButtonElement>('[data-scroll-progress-debug-handle="drag"]');
}

export function getPaletteTrackerCard(id: string): HTMLElement | null {
    return document.querySelector<HTMLElement>(`.spdp-tracker-card[data-track-id="${id}"]`);
}

export function getPaletteDetailsPanel(): HTMLElement | null {
    return document.querySelector<HTMLElement>('.spdp-details-panel');
}

export function getDetailsRowValue(label: string): string | null {
    const rows = Array.from(document.querySelectorAll('.spdp-details-row'));

    const row = rows.find((row) => {
        const rowLabel = row
            .querySelector('.spdp-details-row-label')
            ?.textContent?.trim()
            .replace(/:$/, '');

        return rowLabel === label;
    });

    return row?.querySelector('.spdp-details-row-value')?.textContent?.trim() ?? null;
}

export function expectDetailsRowValue(label: string, expectedValue: string): void {
    expect(getDetailsRowValue(label)).toBe(expectedValue);
}

export function createPointerTestEvent(
    type: string,
    options: MouseEventInit & {
        pointerId?: number;
        pointerType?: string;
    } = {}
): PointerEvent {
    const event = new MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        ...options
    }) as PointerEvent;

    Object.defineProperties(event, {
        pointerId: {
            value: options.pointerId ?? 1
        },
        pointerType: {
            value: options.pointerType ?? 'mouse'
        }
    });

    return event;
}

export function mockElementRect(element: HTMLElement, rect: Partial<DOMRect>): void {
    vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
        x: rect.x ?? rect.left ?? 0,
        y: rect.y ?? rect.top ?? 0,
        left: rect.left ?? 0,
        top: rect.top ?? 0,
        right: rect.right ?? 0,
        bottom: rect.bottom ?? 0,
        width: rect.width ?? 0,
        height: rect.height ?? 0,
        toJSON: () => ({})
    } as DOMRect);
}

export function getPaletteControlButton(
    groupId: string,
    controlId: string
): HTMLButtonElement | null {
    return document.querySelector<HTMLButtonElement>(
        `[data-scroll-progress-debug-action="activate-control"][data-scroll-progress-debug-control-group-id="${groupId}"][data-scroll-progress-debug-control-id="${controlId}"]`
    );
}

export function getPaletteControlGroupFooterActionButton(
    groupId: string,
    actionId: string
): HTMLButtonElement | null {
    return document.querySelector<HTMLButtonElement>(
        `.spdp-control-group-footer ` +
            `[data-scroll-progress-debug-action="activate-control"]` +
            `[data-scroll-progress-debug-control-group-id="${groupId}"]` +
            `[data-scroll-progress-debug-control-id="${actionId}"]`
    );
}
