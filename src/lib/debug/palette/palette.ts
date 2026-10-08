import {
    activateScrollProgressDebugControl,
    getScrollProgressDebugControlGroupsState,
    subscribeScrollProgressDebugControlGroups
} from '../controls/registry.js';

import {
    getScrollProgressDebugRegistryState,
    selectScrollProgressDebugItem,
    subscribeScrollProgressDebugRegistry
} from '../registry.js';

import { createDebugPaletteDragController } from './drag.js';
import { renderDebugPalette } from './render.js';
import { scrollProgressDebugPaletteStyles } from './styles.js';
import type { DebugPaletteUiState } from './ui-state.js';

export interface ScrollProgressDebugPaletteOptions {
    target?: HTMLElement;
    className?: string;
    theme?: string;
}

export interface ScrollProgressDebugPaletteController {
    destroy: () => void;
}

type DebugPaletteFocusTarget = {
    action: string | undefined;
    id: string | undefined;
    controlGroupId: string | undefined;
    controlId: string | undefined;
    handle: string | undefined;
};

const debugPaletteFocusTargetSelector = [
    '[data-scroll-progress-debug-action]',
    '[data-scroll-progress-debug-handle]'
].join(', ');

let debugPaletteInstanceCounter = 0;

function getDebugPaletteFocusTarget(contentElement: HTMLElement): DebugPaletteFocusTarget | null {
    const activeElement = contentElement.ownerDocument.activeElement;

    if (
        !(activeElement instanceof HTMLButtonElement) ||
        !contentElement.contains(activeElement) ||
        !activeElement.matches(debugPaletteFocusTargetSelector)
    ) {
        return null;
    }

    return {
        action: activeElement.dataset.scrollProgressDebugAction,
        id: activeElement.dataset.scrollProgressDebugId,
        controlGroupId: activeElement.dataset.scrollProgressDebugControlGroupId,
        controlId: activeElement.dataset.scrollProgressDebugControlId,
        handle: activeElement.dataset.scrollProgressDebugHandle
    };
}

function matchesDebugPaletteFocusTarget(
    button: HTMLButtonElement,
    focusTarget: DebugPaletteFocusTarget
): boolean {
    return (
        button.dataset.scrollProgressDebugAction === focusTarget.action &&
        button.dataset.scrollProgressDebugId === focusTarget.id &&
        button.dataset.scrollProgressDebugControlGroupId === focusTarget.controlGroupId &&
        button.dataset.scrollProgressDebugControlId === focusTarget.controlId &&
        button.dataset.scrollProgressDebugHandle === focusTarget.handle
    );
}

function isDebugPaletteFocusTargetVisible(
    contentElement: HTMLElement,
    button: HTMLButtonElement
): boolean {
    let currentElement: HTMLElement | null = button;

    while (currentElement && contentElement.contains(currentElement)) {
        const computedStyle =
            currentElement.ownerDocument.defaultView?.getComputedStyle(currentElement);

        if (computedStyle?.display === 'none' || computedStyle?.visibility === 'hidden') {
            return false;
        }

        currentElement = currentElement.parentElement;
    }

    return true;
}

function restoreDebugPaletteFocus(
    contentElement: HTMLElement,
    focusTarget: DebugPaletteFocusTarget | null
): void {
    if (!focusTarget) {
        return;
    }

    const nextButton = Array.from(
        contentElement.querySelectorAll<HTMLButtonElement>(debugPaletteFocusTargetSelector)
    ).find((button) => matchesDebugPaletteFocusTarget(button, focusTarget));

    if (
        nextButton &&
        !nextButton.disabled &&
        isDebugPaletteFocusTargetVisible(contentElement, nextButton)
    ) {
        nextButton.focus();
    }
}

function revealDebugPaletteDetails(
    element: HTMLElement,
    contentElement: HTMLElement,
    id: string
): void {
    const selectedButton = Array.from(
        contentElement.querySelectorAll<HTMLButtonElement>(
            '[data-scroll-progress-debug-action="select"]'
        )
    ).find((button) => button.dataset.scrollProgressDebugId === id);

    const firstDetailsReadout = selectedButton
        ?.closest<HTMLElement>('.spdp-tracker-card')
        ?.querySelector<HTMLElement>('.spdp-details-readout');

    const header = contentElement.querySelector<HTMLElement>('.spdp-header');

    if (!selectedButton || !firstDetailsReadout) {
        return;
    }

    const elementRect = element.getBoundingClientRect();
    const headerRect = header?.getBoundingClientRect();
    const selectedButtonRect = selectedButton.getBoundingClientRect();
    const firstDetailsReadoutRect = firstDetailsReadout.getBoundingClientRect();

    const visibleTop = Math.max(elementRect.top, headerRect?.bottom ?? elementRect.top);
    const visibleBottom = elementRect.bottom;

    if (visibleBottom <= visibleTop) {
        return;
    }

    if (selectedButtonRect.top < visibleTop) {
        element.scrollTop += selectedButtonRect.top - visibleTop;
        return;
    }

    if (firstDetailsReadoutRect.bottom <= visibleBottom) {
        return;
    }

    const requiredScroll = firstDetailsReadoutRect.bottom - visibleBottom;
    const availableScroll = selectedButtonRect.top - visibleTop;

    element.scrollTop += Math.min(requiredScroll, availableScroll);
}

export function createDebugPalette(
    options: ScrollProgressDebugPaletteOptions = {}
): ScrollProgressDebugPaletteController {
    const target = options.target ?? document.body;
    const detailsIdPrefix = `scroll-progress-debug-palette-${++debugPaletteInstanceCounter}`;

    const element = document.createElement('aside');
    const styleElement = document.createElement('style');
    const contentElement = document.createElement('div');

    element.dataset.scrollProgressDebugPalette = 'true';
    element.setAttribute('aria-label', 'Scroll progress debug palette');

    element.classList.add('scroll-progress-debug-palette');

    if (options.className) {
        element.classList.add(...options.className.split(' ').filter(Boolean));
    }

    if (options.theme !== undefined) {
        element.dataset.scrollProgressDebugTheme = options.theme;
    }

    styleElement.textContent = scrollProgressDebugPaletteStyles;
    contentElement.dataset.scrollProgressDebugPaletteContent = 'true';

    element.append(styleElement, contentElement);

    let uiState: DebugPaletteUiState = {
        isCollapsed: false,
        isDetailsOpen: false,
        collapsedControlGroupIds: {}
    };

    let frameId: number | null = null;
    let isDestroyed = false;
    let shouldPreserveScrollOnRender = false;
    let hasPendingUiRender = false;
    let detailsToRevealId: string | null = null;

    function requestRender(
        options: { preserveScroll?: boolean; revealDetailsForId?: string } = {}
    ): void {
        if (options.revealDetailsForId) {
            detailsToRevealId = options.revealDetailsForId;
        }

        if (options.preserveScroll) {
            if (!hasPendingUiRender) {
                shouldPreserveScrollOnRender = true;
            }
        } else {
            hasPendingUiRender = true;
            shouldPreserveScrollOnRender = false;
        }

        if (frameId !== null) {
            return;
        }

        frameId = requestAnimationFrame(() => {
            frameId = null;

            if (isDestroyed) {
                return;
            }

            const preserveScroll = shouldPreserveScrollOnRender;
            const revealDetailsForId = detailsToRevealId;

            shouldPreserveScrollOnRender = false;
            hasPendingUiRender = false;
            detailsToRevealId = null;

            render(preserveScroll, revealDetailsForId);
        });
    }

    function render(preserveScroll: boolean, revealDetailsForId: string | null): void {
        const focusTarget = getDebugPaletteFocusTarget(contentElement);
        const state = getScrollProgressDebugRegistryState();
        const controlGroupsState = getScrollProgressDebugControlGroupsState();
        const scrollPosition = preserveScroll
            ? {
                  left: element.scrollLeft,
                  top: element.scrollTop
              }
            : null;

        contentElement.innerHTML = renderDebugPalette(
            state,
            uiState,
            controlGroupsState,
            detailsIdPrefix
        );

        element.classList.toggle('spdp-is-collapsed', uiState.isCollapsed);
        element.classList.toggle(
            'spdp-has-open-details',
            contentElement.querySelector('[data-scroll-progress-debug-palette-part="details"]') !==
                null
        );

        restoreDebugPaletteFocus(contentElement, focusTarget);

        if (scrollPosition) {
            element.scrollLeft = scrollPosition.left;
            element.scrollTop = scrollPosition.top;
        }

        if (revealDetailsForId) {
            revealDebugPaletteDetails(element, contentElement, revealDetailsForId);
        }
    }

    function handleClick(event: MouseEvent): void {
        const target = event.target;

        if (!(target instanceof Element)) {
            return;
        }

        const button = target.closest<HTMLElement>('[data-scroll-progress-debug-action]');

        if (!button) {
            return;
        }

        const action = button.dataset.scrollProgressDebugAction;
        const id = button.dataset.scrollProgressDebugId;
        const controlGroupId = button.dataset.scrollProgressDebugControlGroupId;
        const controlId = button.dataset.scrollProgressDebugControlId;

        if (action === 'toggle-collapse') {
            uiState = {
                ...uiState,
                isCollapsed: !uiState.isCollapsed
            };

            requestRender();
            return;
        }

        if (action === 'toggle-control-group') {
            if (!controlGroupId) {
                return;
            }

            const isCollapsed = uiState.collapsedControlGroupIds[controlGroupId] === true;

            uiState = {
                ...uiState,
                collapsedControlGroupIds: {
                    ...uiState.collapsedControlGroupIds,
                    [controlGroupId]: !isCollapsed
                }
            };

            requestRender();
            return;
        }

        if (action === 'activate-control') {
            if (!controlGroupId || !controlId) {
                return;
            }

            activateScrollProgressDebugControl(controlGroupId, controlId);

            return;
        }

        if (!id) {
            return;
        }

        if (action === 'select') {
            const selectedId = getScrollProgressDebugRegistryState().selectedId;
            const isDetailsOpen = selectedId === id ? !uiState.isDetailsOpen : true;

            uiState = {
                ...uiState,
                isDetailsOpen
            };

            selectScrollProgressDebugItem(id);
            requestRender({ revealDetailsForId: isDetailsOpen ? id : undefined });
        }
    }

    element.addEventListener('click', handleClick);

    const dragController = createDebugPaletteDragController(element);

    target.appendChild(element);

    const unsubscribeDebugRegistry = subscribeScrollProgressDebugRegistry((state) => {
        if (state.items.length === 0 && uiState.isDetailsOpen) {
            uiState = {
                ...uiState,
                isDetailsOpen: false
            };
        }

        requestRender({ preserveScroll: true });
    });

    const unsubscribeControlGroups = subscribeScrollProgressDebugControlGroups(() => {
        requestRender({ preserveScroll: true });
    });

    return {
        destroy() {
            if (isDestroyed) {
                return;
            }

            isDestroyed = true;

            if (frameId !== null) {
                cancelAnimationFrame(frameId);
                frameId = null;
            }

            dragController.destroy();

            unsubscribeDebugRegistry();
            unsubscribeControlGroups();

            element.removeEventListener('click', handleClick);
            element.remove();
        }
    };
}
