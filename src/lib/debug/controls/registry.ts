export type ScrollProgressDebugControlType = 'button' | 'toggle';

export interface ScrollProgressDebugControl {
    id: string;
    type: ScrollProgressDebugControlType;
    label: string;
    legendColors?: readonly string[];
    pressed?: boolean;
    disabled?: boolean;
    ariaLabel?: string;
    title?: string;
}

export interface ScrollProgressDebugControlRegistration extends ScrollProgressDebugControl {
    onActivate: () => void;
}

export interface ScrollProgressDebugControlGroupFooterAction {
    id: string;
    label: string;
    disabled?: boolean;
    ariaLabel?: string;
    title?: string;
}

export interface ScrollProgressDebugControlGroupFooterActionRegistration extends ScrollProgressDebugControlGroupFooterAction {
    onActivate: () => void;
}

export interface ScrollProgressDebugControlGroup {
    id: string;
    label: string;
    controls: ScrollProgressDebugControl[];
    footerActions?: ScrollProgressDebugControlGroupFooterAction[];
}

export interface ScrollProgressDebugControlGroupRegistration {
    id?: string;
    label: string;
    controls: ScrollProgressDebugControlRegistration[];
    footerActions?: ScrollProgressDebugControlGroupFooterActionRegistration[];
}

export interface ScrollProgressDebugControlGroupsState {
    groups: ScrollProgressDebugControlGroup[];
}

export type ScrollProgressDebugControlGroupUpdate = Partial<
    Pick<ScrollProgressDebugControlGroupRegistration, 'label' | 'controls' | 'footerActions'>
>;

type ScrollProgressDebugControlGroupsSubscriber = (
    state: ScrollProgressDebugControlGroupsState
) => void;

type ScrollProgressDebugControlEntry = ScrollProgressDebugControl & {
    onActivate: () => void;
};

type ScrollProgressDebugControlGroupFooterActionEntry =
    ScrollProgressDebugControlGroupFooterAction & {
        onActivate: () => void;
    };

type ScrollProgressDebugControlGroupEntry = Omit<
    ScrollProgressDebugControlGroup,
    'controls' | 'footerActions'
> & {
    controls: ScrollProgressDebugControlEntry[];
    footerActions?: ScrollProgressDebugControlGroupFooterActionEntry[];
};

const subscribers = new Set<ScrollProgressDebugControlGroupsSubscriber>();
const groups = new Map<string, ScrollProgressDebugControlGroupEntry>();

let idCounter = 0;

function createDebugControlGroupId(): string {
    idCounter += 1;

    return `scroll-progress-debug-control-group-${idCounter}`;
}

function createDebugControlState(
    control: ScrollProgressDebugControlEntry
): ScrollProgressDebugControl {
    const state: ScrollProgressDebugControl = {
        id: control.id,
        type: control.type,
        label: control.label
    };

    if (control.legendColors !== undefined) {
        state.legendColors = [...control.legendColors];
    }

    if (control.pressed !== undefined) {
        state.pressed = control.pressed;
    }

    if (control.disabled !== undefined) {
        state.disabled = control.disabled;
    }

    if (control.ariaLabel !== undefined) {
        state.ariaLabel = control.ariaLabel;
    }

    if (control.title !== undefined) {
        state.title = control.title;
    }

    return state;
}

function createDebugControlEntry(
    control: ScrollProgressDebugControlRegistration
): ScrollProgressDebugControlEntry {
    const entry: ScrollProgressDebugControlEntry = {
        ...control
    };

    if (control.legendColors !== undefined) {
        entry.legendColors = [...control.legendColors];
    }

    return entry;
}

function createDebugControlGroupFooterActionState(
    action: ScrollProgressDebugControlGroupFooterActionEntry
): ScrollProgressDebugControlGroupFooterAction {
    const state: ScrollProgressDebugControlGroupFooterAction = {
        id: action.id,
        label: action.label
    };

    if (action.disabled !== undefined) {
        state.disabled = action.disabled;
    }

    if (action.ariaLabel !== undefined) {
        state.ariaLabel = action.ariaLabel;
    }

    if (action.title !== undefined) {
        state.title = action.title;
    }

    return state;
}

function createDebugControlGroupFooterActionEntry(
    action: ScrollProgressDebugControlGroupFooterActionRegistration
): ScrollProgressDebugControlGroupFooterActionEntry {
    return { ...action };
}

function createDebugControlGroupState(
    group: ScrollProgressDebugControlGroupEntry
): ScrollProgressDebugControlGroup {
    const state: ScrollProgressDebugControlGroup = {
        id: group.id,
        label: group.label,
        controls: group.controls.map(createDebugControlState)
    };

    if (group.footerActions !== undefined) {
        state.footerActions = group.footerActions.map(createDebugControlGroupFooterActionState);
    }

    return state;
}

export function getScrollProgressDebugControlGroupsState(): ScrollProgressDebugControlGroupsState {
    return {
        groups: Array.from(groups.values()).map(createDebugControlGroupState)
    };
}

export function registerScrollProgressDebugControlGroup(
    registration: ScrollProgressDebugControlGroupRegistration
): string {
    const id = registration.id ?? createDebugControlGroupId();

    groups.set(id, {
        id,
        label: registration.label,
        controls: registration.controls.map(createDebugControlEntry),
        footerActions: registration.footerActions?.map(createDebugControlGroupFooterActionEntry)
    });

    notifyScrollProgressDebugControlGroupsSubscribers();

    return id;
}

export function updateScrollProgressDebugControlGroup(
    id: string,
    update: ScrollProgressDebugControlGroupUpdate
): void {
    const group = groups.get(id);

    if (!group) {
        return;
    }

    groups.set(id, {
        ...group,
        ...update,
        controls: update.controls ? update.controls.map(createDebugControlEntry) : group.controls,
        footerActions:
            update.footerActions !== undefined
                ? update.footerActions.map(createDebugControlGroupFooterActionEntry)
                : group.footerActions
    });

    notifyScrollProgressDebugControlGroupsSubscribers();
}

export function unregisterScrollProgressDebugControlGroup(id: string): void {
    const deleted = groups.delete(id);

    if (!deleted) {
        return;
    }

    notifyScrollProgressDebugControlGroupsSubscribers();
}

export function activateScrollProgressDebugControl(groupId: string, controlId: string): void {
    const group = groups.get(groupId);

    if (!group) {
        return;
    }

    const control =
        group.controls.find((item) => item.id === controlId) ??
        group.footerActions?.find((item) => item.id === controlId);

    if (!control || control.disabled) {
        return;
    }

    control.onActivate();
}

export function resetScrollProgressDebugControlGroups(): void {
    idCounter = 0;
    groups.clear();
    subscribers.clear();
}

function notifyScrollProgressDebugControlGroupsSubscribers(): void {
    const state = getScrollProgressDebugControlGroupsState();

    for (const subscriber of subscribers) {
        subscriber(state);
    }
}

export function subscribeScrollProgressDebugControlGroups(
    subscriber: ScrollProgressDebugControlGroupsSubscriber
): () => void {
    subscribers.add(subscriber);
    subscriber(getScrollProgressDebugControlGroupsState());

    return () => {
        subscribers.delete(subscriber);
    };
}
