import { afterEach, expect, it, vi } from 'vitest';

import { debugScrollProgress } from '../../lib/debug/debug-scroll-progress';
import { createDebugBridge } from '../../lib/debug/bridge';
import * as registryController from '../../lib/debug/registry-controller';
import {
    getScrollProgressDebugRegistryState,
    resetScrollProgressDebugRegistry
} from '../../lib/debug/registry';
import { createDebugTrackerMock } from '../helpers/debug-tracker-test-utils';

afterEach(() => {
    vi.restoreAllMocks();
    resetScrollProgressDebugRegistry();
});

it('keeps the public controller shape and releases late terminal handles', () => {
    const mock = createDebugTrackerMock();
    mock.tracker.destroy();
    const bridge = debugScrollProgress(mock.tracker);

    expect(Reflect.ownKeys(bridge)).toEqual(['destroy']);
    expect(mock.stateUnsubscribe).toHaveBeenCalledOnce();
    expect(mock.destroyUnsubscribe).toHaveBeenCalledOnce();
    bridge.destroy();
    expect(mock.destroyUnsubscribe).toHaveBeenCalledOnce();
    expect(getScrollProgressDebugRegistryState().items).toEqual([]);
});

it('rolls back its registry item when subscription construction fails', () => {
    const mock = createDebugTrackerMock();
    const error = new Error('subscribe failed');
    mock.tracker.subscribe.mockImplementationOnce(() => {
        throw error;
    });
    expect(() => debugScrollProgress(mock.tracker)).toThrow(error);
    expect(getScrollProgressDebugRegistryState().items).toEqual([]);
});

it('rolls back acquired state subscription when onDestroy registration fails', () => {
    const mock = createDebugTrackerMock();
    const error = new Error('onDestroy failed');
    mock.tracker.onDestroy.mockImplementationOnce(() => {
        throw error;
    });
    expect(() => debugScrollProgress(mock.tracker)).toThrow(error);
    expect(mock.stateUnsubscribe).toHaveBeenCalledOnce();
    expect(getScrollProgressDebugRegistryState().items).toEqual([]);
});

it('attempts every cleanup and removes the item when an unsubscribe throws', () => {
    const mock = createDebugTrackerMock();
    const bridge = debugScrollProgress(mock.tracker);
    const error = new Error('state unsubscribe failed');
    mock.stateUnsubscribe.mockImplementationOnce(() => {
        throw error;
    });
    mock.destroyUnsubscribe.mockImplementationOnce(() => {
        throw new Error('destroy unsubscribe failed');
    });
    expect(() => bridge.destroy()).toThrow(error);
    expect(mock.destroyUnsubscribe).toHaveBeenCalledOnce();
    expect(getScrollProgressDebugRegistryState().items).toEqual([]);
    expect(() => bridge.destroy()).not.toThrow();
    expect(mock.stateUnsubscribe).toHaveBeenCalledOnce();
});

it.each([false, true])(
    'ignores stale emissions after once completion (inverted=%s)',
    (inverted) => {
        const mock = createDebugTrackerMock();
        const bridge = debugScrollProgress(mock.tracker);
        const staleSubscriber = [...mock.subscribers][0];
        mock.completeOnce(inverted);
        const snapshot = getScrollProgressDebugRegistryState().items[0];
        expect(snapshot).toMatchObject({ completed: true, state: { progress: inverted ? 0 : 1 } });
        mock.tracker.getConfig.mockClear();
        staleSubscriber({ ...mock.state, progress: 0.25 });
        expect(mock.tracker.getConfig).not.toHaveBeenCalled();
        expect(getScrollProgressDebugRegistryState().items[0]).toEqual(snapshot);
        expect(mock.stateUnsubscribe).toHaveBeenCalledOnce();
        expect(mock.destroyUnsubscribe).toHaveBeenCalledOnce();
        bridge.destroy();
        expect(getScrollProgressDebugRegistryState().items).toEqual([]);
    }
);

it('releases terminal subscriptions even when final snapshot reading fails', () => {
    const mock = createDebugTrackerMock();
    const bridge = debugScrollProgress(mock.tracker);
    const error = new Error('final config failed');
    mock.tracker.getConfig.mockImplementationOnce(() => {
        throw error;
    });
    expect(() => mock.completeOnce()).toThrow(error);
    expect(mock.stateUnsubscribe).toHaveBeenCalledOnce();
    expect(mock.destroyUnsubscribe).toHaveBeenCalledOnce();
    bridge.destroy();
    expect(getScrollProgressDebugRegistryState().items).toEqual([]);
});

it('releases subscriptions when final publication fails before committing', () => {
    const register = registryController.registerScrollProgressDebugItem;
    const error = new Error('final publication failed');
    vi.spyOn(registryController, 'registerScrollProgressDebugItem').mockImplementation(
        (options) => {
            const item = register(options);
            return {
                ...item,
                update: () => {
                    throw error;
                }
            };
        }
    );
    const mock = createDebugTrackerMock();
    const bridge = debugScrollProgress(mock.tracker);
    expect(() => mock.completeOnce()).toThrow(error);
    expect(mock.stateUnsubscribe).toHaveBeenCalledOnce();
    expect(mock.destroyUnsubscribe).toHaveBeenCalledOnce();
    bridge.destroy();
    expect(getScrollProgressDebugRegistryState().items).toEqual([]);
});

it('does not retain a snapshot for once configured but explicitly destroyed trackers', () => {
    const mock = createDebugTrackerMock();
    mock.config.once = true;
    const bridge = debugScrollProgress(mock.tracker);
    mock.tracker.destroy();
    expect(getScrollProgressDebugRegistryState().items).toEqual([]);
    bridge.destroy();
});

it.each([false, true])(
    'notifies its owner once after attempted terminal cleanup (once=%s)',
    (once) => {
        const mock = createDebugTrackerMock();
        const error = new Error('unsubscribe failed');
        const notification = vi.fn(() => {
            expect(mock.destroyUnsubscribe).toHaveBeenCalledOnce();
            throw new Error('notification failed');
        });
        const bridge = createDebugBridge(mock.tracker, {}, notification);
        const staleDestroy = [...mock.destroyCallbacks][0];
        mock.stateUnsubscribe.mockImplementationOnce(() => {
            throw error;
        });
        expect(() => (once ? mock.completeOnce() : mock.tracker.destroy())).toThrow(error);
        expect(notification).toHaveBeenCalledExactlyOnceWith(once ? 'once' : 'ordinary');
        staleDestroy();
        bridge.destroy();
        expect(notification).toHaveBeenCalledOnce();
        expect(getScrollProgressDebugRegistryState().items).toEqual([]);
    }
);

it('does not notify termination after explicit bridge destruction or rollback', () => {
    const mock = createDebugTrackerMock();
    const notification = vi.fn();
    const bridge = createDebugBridge(mock.tracker, {}, notification);
    const staleDestroy = [...mock.destroyCallbacks][0];
    bridge.destroy();
    staleDestroy();
    mock.tracker.destroy();
    expect(notification).not.toHaveBeenCalled();

    const failed = createDebugTrackerMock();
    failed.tracker.onDestroy.mockImplementationOnce(() => {
        throw new Error('registration failed');
    });
    failed.stateUnsubscribe.mockImplementationOnce(() => {
        throw new Error('rollback failed');
    });
    expect(() => createDebugBridge(failed.tracker, {}, notification)).toThrow(
        'registration failed'
    );
    expect(notification).not.toHaveBeenCalled();
    expect(getScrollProgressDebugRegistryState().items).toEqual([]);
});

it('reports synchronous once termination and releases the late handle before returning', () => {
    const mock = createDebugTrackerMock();
    mock.completeOnce(true);
    const notification = vi.fn();
    const bridge = createDebugBridge(mock.tracker, {}, notification);
    expect(notification).toHaveBeenCalledExactlyOnceWith('once');
    expect(mock.destroyUnsubscribe).toHaveBeenCalledOnce();
    expect(getScrollProgressDebugRegistryState().items[0]).toMatchObject({
        completed: true,
        state: { progress: 0 }
    });
    bridge.destroy();
});
