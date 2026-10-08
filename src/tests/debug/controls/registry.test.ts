import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
    activateScrollProgressDebugControl,
    getScrollProgressDebugControlGroupsState,
    registerScrollProgressDebugControlGroup,
    resetScrollProgressDebugControlGroups,
    subscribeScrollProgressDebugControlGroups,
    unregisterScrollProgressDebugControlGroup,
    updateScrollProgressDebugControlGroup,
    type ScrollProgressDebugControlGroupRegistration
} from '../../../lib/debug/controls/registry';

beforeEach(() => {
    resetScrollProgressDebugControlGroups();
});

function createControlGroupRegistration(
    patch: Partial<ScrollProgressDebugControlGroupRegistration> = {}
): ScrollProgressDebugControlGroupRegistration {
    return {
        label: 'Overlays',
        controls: [
            {
                id: 'target',
                type: 'toggle',
                label: 'Target',
                pressed: true,
                ariaLabel: 'Toggle target overlay',
                title: 'Show target overlay',
                onActivate: vi.fn()
            }
        ],
        ...patch
    };
}

describe('scroll progress debug control groups registry', () => {
    it('starts with an empty registry state', () => {
        expect(getScrollProgressDebugControlGroupsState()).toEqual({
            groups: []
        });
    });

    it('registers a control group', () => {
        const id = registerScrollProgressDebugControlGroup(createControlGroupRegistration());

        expect(getScrollProgressDebugControlGroupsState()).toEqual({
            groups: [
                {
                    id,
                    label: 'Overlays',
                    controls: [
                        {
                            id: 'target',
                            type: 'toggle',
                            label: 'Target',
                            pressed: true,
                            ariaLabel: 'Toggle target overlay',
                            title: 'Show target overlay'
                        }
                    ]
                }
            ]
        });

        expect(getScrollProgressDebugControlGroupsState().groups[0]).not.toHaveProperty(
            'footerActions'
        );
    });

    it('uses a custom control group id when provided', () => {
        const id = registerScrollProgressDebugControlGroup(
            createControlGroupRegistration({
                id: 'overlay-controls'
            })
        );

        expect(id).toBe('overlay-controls');
        expect(getScrollProgressDebugControlGroupsState().groups[0].id).toBe('overlay-controls');
    });

    it('does not expose control activation callbacks in state', () => {
        registerScrollProgressDebugControlGroup(createControlGroupRegistration());

        expect(getScrollProgressDebugControlGroupsState().groups[0].controls[0]).not.toHaveProperty(
            'onActivate'
        );
    });

    it('copies control legend colors when they enter and leave the registry', () => {
        const legendColors = ['#00ff88', '#ff6644'];

        registerScrollProgressDebugControlGroup(
            createControlGroupRegistration({
                controls: [
                    {
                        id: 'progress',
                        type: 'toggle',
                        label: 'Progress',
                        legendColors,
                        onActivate: vi.fn()
                    }
                ]
            })
        );

        legendColors.push('#facc15');

        const firstState = getScrollProgressDebugControlGroupsState();

        expect(firstState.groups[0].controls[0].legendColors).toEqual(['#00ff88', '#ff6644']);

        (firstState.groups[0].controls[0].legendColors as string[]).push('#22d3ee');

        expect(
            getScrollProgressDebugControlGroupsState().groups[0].controls[0].legendColors
        ).toEqual(['#00ff88', '#ff6644']);
    });

    it('updates a registered control group', () => {
        const id = registerScrollProgressDebugControlGroup(createControlGroupRegistration());

        updateScrollProgressDebugControlGroup(id, {
            label: 'Overlay layers',
            controls: [
                {
                    id: 'progress',
                    type: 'toggle',
                    label: 'Progress',
                    legendColors: ['#00ff88', '#ff6644'],
                    pressed: false,
                    disabled: true,
                    onActivate: vi.fn()
                }
            ]
        });

        expect(getScrollProgressDebugControlGroupsState()).toEqual({
            groups: [
                {
                    id,
                    label: 'Overlay layers',
                    controls: [
                        {
                            id: 'progress',
                            type: 'toggle',
                            label: 'Progress',
                            legendColors: ['#00ff88', '#ff6644'],
                            pressed: false,
                            disabled: true
                        }
                    ]
                }
            ]
        });
    });

    it('ignores update requests for unknown control groups', () => {
        registerScrollProgressDebugControlGroup(createControlGroupRegistration());

        updateScrollProgressDebugControlGroup('unknown-id', {
            label: 'Unknown'
        });

        expect(getScrollProgressDebugControlGroupsState().groups).toHaveLength(1);
    });

    it('unregisters a control group', () => {
        const id = registerScrollProgressDebugControlGroup(createControlGroupRegistration());

        unregisterScrollProgressDebugControlGroup(id);

        expect(getScrollProgressDebugControlGroupsState()).toEqual({
            groups: []
        });
    });

    it('ignores unregister requests for unknown control groups', () => {
        registerScrollProgressDebugControlGroup(createControlGroupRegistration());

        unregisterScrollProgressDebugControlGroup('unknown-id');

        expect(getScrollProgressDebugControlGroupsState().groups).toHaveLength(1);
    });

    it('notifies subscribers immediately and after registry changes', () => {
        const subscriber = vi.fn();

        const unsubscribe = subscribeScrollProgressDebugControlGroups(subscriber);

        expect(subscriber).toHaveBeenCalledTimes(1);
        expect(subscriber).toHaveBeenLastCalledWith({
            groups: []
        });

        const id = registerScrollProgressDebugControlGroup(createControlGroupRegistration());

        expect(subscriber).toHaveBeenCalledTimes(2);
        expect(subscriber).toHaveBeenLastCalledWith({
            groups: [
                expect.objectContaining({
                    id,
                    label: 'Overlays'
                })
            ]
        });

        unsubscribe();

        registerScrollProgressDebugControlGroup(
            createControlGroupRegistration({
                label: 'After unsubscribe'
            })
        );

        expect(subscriber).toHaveBeenCalledTimes(2);
    });

    it('activates a registered control', () => {
        const onActivate = vi.fn();
        const id = registerScrollProgressDebugControlGroup(
            createControlGroupRegistration({
                controls: [
                    {
                        id: 'target',
                        type: 'toggle',
                        label: 'Target',
                        onActivate
                    }
                ]
            })
        );

        activateScrollProgressDebugControl(id, 'target');

        expect(onActivate).toHaveBeenCalledTimes(1);
    });

    it('does not activate disabled controls', () => {
        const onActivate = vi.fn();
        const id = registerScrollProgressDebugControlGroup(
            createControlGroupRegistration({
                controls: [
                    {
                        id: 'target',
                        type: 'toggle',
                        label: 'Target',
                        disabled: true,
                        onActivate
                    }
                ]
            })
        );

        activateScrollProgressDebugControl(id, 'target');

        expect(onActivate).not.toHaveBeenCalled();
    });

    it('ignores activation requests for unknown controls', () => {
        const onActivate = vi.fn();
        const id = registerScrollProgressDebugControlGroup(
            createControlGroupRegistration({
                controls: [
                    {
                        id: 'target',
                        type: 'toggle',
                        label: 'Target',
                        onActivate
                    }
                ]
            })
        );

        activateScrollProgressDebugControl(id, 'unknown-control');
        activateScrollProgressDebugControl('unknown-group', 'target');

        expect(onActivate).not.toHaveBeenCalled();
    });

    it('registers control group footer actions', () => {
        const onActivate = vi.fn();
        const id = registerScrollProgressDebugControlGroup(
            createControlGroupRegistration({
                footerActions: [
                    {
                        id: 'toggle-all',
                        label: 'Turn all on',
                        ariaLabel: 'Turn all overlay layers on',
                        title: 'Show all overlay layers',
                        onActivate
                    }
                ]
            })
        );

        expect(getScrollProgressDebugControlGroupsState().groups[0]).toEqual({
            id,
            label: 'Overlays',
            controls: [
                {
                    id: 'target',
                    type: 'toggle',
                    label: 'Target',
                    pressed: true,
                    ariaLabel: 'Toggle target overlay',
                    title: 'Show target overlay'
                }
            ],
            footerActions: [
                {
                    id: 'toggle-all',
                    label: 'Turn all on',
                    ariaLabel: 'Turn all overlay layers on',
                    title: 'Show all overlay layers'
                }
            ]
        });

        expect(
            getScrollProgressDebugControlGroupsState().groups[0].footerActions?.[0]
        ).not.toHaveProperty('onActivate');
    });

    it('updates registered control group footer actions', () => {
        const id = registerScrollProgressDebugControlGroup(
            createControlGroupRegistration({
                footerActions: [
                    {
                        id: 'toggle-all',
                        label: 'Turn all on',
                        onActivate: vi.fn()
                    }
                ]
            })
        );

        updateScrollProgressDebugControlGroup(id, {
            footerActions: [
                {
                    id: 'toggle-all',
                    label: 'Turn all off',
                    disabled: true,
                    onActivate: vi.fn()
                }
            ]
        });

        expect(getScrollProgressDebugControlGroupsState().groups[0].footerActions).toEqual([
            {
                id: 'toggle-all',
                label: 'Turn all off',
                disabled: true
            }
        ]);

        updateScrollProgressDebugControlGroup(id, {
            footerActions: []
        });

        expect(getScrollProgressDebugControlGroupsState().groups[0].footerActions).toEqual([]);
    });

    it('activates a registered control group footer action', () => {
        const onActivate = vi.fn();
        const id = registerScrollProgressDebugControlGroup(
            createControlGroupRegistration({
                footerActions: [
                    {
                        id: 'toggle-all',
                        label: 'Turn all on',
                        onActivate
                    }
                ]
            })
        );

        activateScrollProgressDebugControl(id, 'toggle-all');

        expect(onActivate).toHaveBeenCalledTimes(1);
    });

    it('does not activate disabled control group footer actions', () => {
        const onActivate = vi.fn();
        const id = registerScrollProgressDebugControlGroup(
            createControlGroupRegistration({
                footerActions: [
                    {
                        id: 'toggle-all',
                        label: 'Turn all on',
                        disabled: true,
                        onActivate
                    }
                ]
            })
        );

        activateScrollProgressDebugControl(id, 'toggle-all');

        expect(onActivate).not.toHaveBeenCalled();
    });
});
