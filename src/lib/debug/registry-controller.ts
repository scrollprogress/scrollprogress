import {
    registerScrollProgressDebugItem as registerRegistryItem,
    unregisterScrollProgressDebugItem,
    updateScrollProgressDebugItem,
    type ScrollProgressDebugItemController,
    type ScrollProgressDebugItemRegistration
} from './registry.js';

export function registerScrollProgressDebugItem(
    registration: ScrollProgressDebugItemRegistration
): ScrollProgressDebugItemController {
    const id = registerRegistryItem(registration);
    let isDestroyed = false;

    return {
        id,
        update(update) {
            if (isDestroyed) {
                return;
            }

            updateScrollProgressDebugItem(id, update);
        },
        destroy() {
            if (isDestroyed) {
                return;
            }

            isDestroyed = true;
            unregisterScrollProgressDebugItem(id);
        }
    };
}
