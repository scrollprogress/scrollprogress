import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
    activateScrollProgressDebugControl,
    getScrollProgressDebugControlGroupsState,
    resetScrollProgressDebugControlGroups
} from '../../../lib/debug/controls/registry';
import { registerDebugPaletteControlGroup } from '../../../lib/debug/palette/control-groups';
import {
    registerScrollProgressDebugItem,
    resetScrollProgressDebugRegistry
} from '../../../lib/debug/registry';

beforeEach(() => {
    resetScrollProgressDebugControlGroups();
    resetScrollProgressDebugRegistry();
});

describe('public debug palette control groups', () => {
    it('provides the selected registry item to actions', () => {
        const itemId = registerScrollProgressDebugItem({
            element: {} as HTMLElement,
            label: 'Selected tracker'
        });
        const onActivate = vi.fn();
        const controller = registerDebugPaletteControlGroup({
            label: 'Snapshot',
            controls: [
                {
                    id: 'copy',
                    type: 'button',
                    label: 'Copy snapshot',
                    onActivate
                }
            ]
        });

        activateScrollProgressDebugControl(controller.id, 'copy');

        expect(onActivate).toHaveBeenCalledWith({
            registryState: expect.objectContaining({ selectedId: itemId }),
            selectedItem: expect.objectContaining({ id: itemId, label: 'Selected tracker' })
        });
    });

    it('updates and destroys its control group idempotently', () => {
        const controller = registerDebugPaletteControlGroup({
            label: 'Snapshot',
            controls: []
        });

        controller.update({ label: 'Snapshot tools' });

        expect(getScrollProgressDebugControlGroupsState().groups[0]).toMatchObject({
            id: controller.id,
            label: 'Snapshot tools'
        });

        controller.destroy();
        controller.destroy();
        controller.update({ label: 'Ignored update' });

        expect(getScrollProgressDebugControlGroupsState().groups).toEqual([]);
    });
});
