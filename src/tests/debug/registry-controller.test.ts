import { beforeEach, describe, expect, it } from 'vitest';

import { registerScrollProgressDebugItem } from '../../lib/debug/registry-controller';
import {
    getScrollProgressDebugRegistryState,
    resetScrollProgressDebugRegistry
} from '../../lib/debug/registry';

beforeEach(() => {
    resetScrollProgressDebugRegistry();
});

describe('scroll progress debug item controller', () => {
    it('owns update and destruction for its registered item', () => {
        const controller = registerScrollProgressDebugItem({
            element: {} as HTMLElement,
            label: 'External tracker'
        });

        expect(getScrollProgressDebugRegistryState().items[0]).toMatchObject({
            id: controller.id,
            label: 'External tracker'
        });

        controller.update({ label: 'Updated tracker' });

        expect(getScrollProgressDebugRegistryState().items[0].label).toBe('Updated tracker');

        controller.destroy();
        controller.destroy();
        controller.update({ label: 'Ignored update' });

        expect(getScrollProgressDebugRegistryState().items).toEqual([]);
    });
});
