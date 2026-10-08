import { describe, expect, it, vi } from 'vitest';

import {
    createScrollProgressDebugOverlayLayerVisibilityController,
    scrollProgressDebugOverlayLayers
} from '../../../lib/debug/overlay/layers';

describe('scroll progress debug overlay layer visibility controller', () => {
    it('starts with all overlay layers hidden by default', () => {
        const controller = createScrollProgressDebugOverlayLayerVisibilityController();

        expect(controller.getState()).toEqual({
            target: false,
            progress: false,
            root: false,
            margin: false,
            intersection: false
        });
    });

    it('merges partial initial layer visibility state', () => {
        const controller = createScrollProgressDebugOverlayLayerVisibilityController({
            target: true,
            progress: true
        });

        expect(controller.getState()).toEqual({
            target: true,
            progress: true,
            root: false,
            margin: false,
            intersection: false
        });
    });

    it('sets and toggles layer visibility', () => {
        const controller = createScrollProgressDebugOverlayLayerVisibilityController();

        controller.setLayerVisible('target', true);

        expect(controller.getState().target).toBe(true);

        controller.toggleLayerVisible('target');

        expect(controller.getState().target).toBe(false);
    });

    it('sets all layer visibility with one subscriber notification', () => {
        const controller = createScrollProgressDebugOverlayLayerVisibilityController();
        const subscriber = vi.fn();

        controller.subscribe(subscriber);
        controller.setAllLayersVisible(true);

        expect(controller.getState()).toEqual({
            target: true,
            progress: true,
            root: true,
            margin: true,
            intersection: true
        });
        expect(subscriber).toHaveBeenCalledTimes(2);
        expect(subscriber).toHaveBeenLastCalledWith({
            target: true,
            progress: true,
            root: true,
            margin: true,
            intersection: true
        });

        controller.setAllLayersVisible(false);

        expect(controller.getState()).toEqual({
            target: false,
            progress: false,
            root: false,
            margin: false,
            intersection: false
        });
        expect(subscriber).toHaveBeenCalledTimes(3);
    });

    it('does not notify subscribers when all layers already have the requested visibility', () => {
        const controller = createScrollProgressDebugOverlayLayerVisibilityController();
        const subscriber = vi.fn();

        controller.subscribe(subscriber);
        controller.setAllLayersVisible(false);

        expect(subscriber).toHaveBeenCalledTimes(1);

        controller.setAllLayersVisible(true);
        controller.setAllLayersVisible(true);

        expect(subscriber).toHaveBeenCalledTimes(2);
    });

    it('notifies subscribers when layer visibility changes', () => {
        const controller = createScrollProgressDebugOverlayLayerVisibilityController();

        const subscriber = vi.fn();

        controller.subscribe(subscriber);

        expect(subscriber).toHaveBeenCalledTimes(1);
        expect(subscriber).toHaveBeenLastCalledWith({
            target: false,
            progress: false,
            root: false,
            margin: false,
            intersection: false
        });

        controller.setLayerVisible('target', true);

        expect(subscriber).toHaveBeenCalledTimes(2);
        expect(subscriber).toHaveBeenLastCalledWith({
            target: true,
            progress: false,
            root: false,
            margin: false,
            intersection: false
        });
    });

    it('does not notify subscribers when setting an unchanged layer visibility value', () => {
        const controller = createScrollProgressDebugOverlayLayerVisibilityController();

        const subscriber = vi.fn();

        controller.subscribe(subscriber);

        controller.setLayerVisible('target', false);

        expect(subscriber).toHaveBeenCalledTimes(1);
    });

    it('stops notifying unsubscribed subscribers', () => {
        const controller = createScrollProgressDebugOverlayLayerVisibilityController();

        const subscriber = vi.fn();
        const unsubscribe = controller.subscribe(subscriber);

        unsubscribe();

        controller.setLayerVisible('target', true);

        expect(subscriber).toHaveBeenCalledTimes(1);
    });

    it('exposes the supported overlay layer order', () => {
        expect(scrollProgressDebugOverlayLayers).toEqual([
            'target',
            'progress',
            'root',
            'margin',
            'intersection'
        ]);
    });
});
