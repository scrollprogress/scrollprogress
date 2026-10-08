import {
    subscribeScrollProgressDebugRegistry,
    type ScrollProgressDebugRegistryItem
} from '../registry.js';

export interface ScrollProgressDebugConsoleLoggerOptions {
    readonly throttleMs?: number;
}

export interface ScrollProgressDebugConsoleLoggerController {
    destroy: () => void;
}

export function createDebugConsoleLogger(
    options: ScrollProgressDebugConsoleLoggerOptions = {}
): ScrollProgressDebugConsoleLoggerController {
    const throttleMs = options.throttleMs ?? 0;
    if (!Number.isFinite(throttleMs) || throttleMs < 0) {
        throw new RangeError(
            'scrollprogress debug console throttleMs must be finite and non-negative'
        );
    }
    let isDestroyed = false;

    let timeout: ReturnType<typeof setTimeout> | undefined;
    let pendingItem: ReturnType<typeof formatDebugConsoleItem> | undefined;
    let lastLogTimestamp: number | undefined;

    function scheduleDebugConsoleItem(item: ReturnType<typeof formatDebugConsoleItem>): void {
        if (throttleMs === 0) {
            logDebugConsoleItem(item);
            return;
        }

        const now = Date.now();
        const elapsed = lastLogTimestamp === undefined ? throttleMs : now - lastLogTimestamp;

        if (elapsed >= throttleMs) {
            if (timeout !== undefined) {
                clearTimeout(timeout);
                timeout = undefined;
            }

            pendingItem = undefined;
            lastLogTimestamp = now;
            logDebugConsoleItem(item);
            return;
        }

        pendingItem = item;

        if (timeout !== undefined) {
            return;
        }

        timeout = setTimeout(() => {
            timeout = undefined;

            if (isDestroyed || pendingItem === undefined) {
                return;
            }

            const itemToLog = pendingItem;
            pendingItem = undefined;
            lastLogTimestamp = Date.now();

            logDebugConsoleItem(itemToLog);
        }, throttleMs - elapsed);
    }

    const unsubscribe = subscribeScrollProgressDebugRegistry((state) => {
        const selectedItem = state.items.find((item) => item.selected);

        if (!selectedItem) {
            return;
        }

        scheduleDebugConsoleItem(formatDebugConsoleItem(selectedItem));
    });

    return {
        destroy() {
            if (isDestroyed) {
                return;
            }

            isDestroyed = true;

            if (timeout !== undefined) {
                clearTimeout(timeout);
                timeout = undefined;
            }

            pendingItem = undefined;
            unsubscribe();
        }
    };
}

function logDebugConsoleItem(item: ReturnType<typeof formatDebugConsoleItem>): void {
    console.table([item]);
}

function formatDebugConsoleItem(item: ScrollProgressDebugRegistryItem) {
    return {
        id: item.debugId,
        label: item.label,
        progress: item.state.progress.toFixed(3),
        progressDirection: item.state.progressDirection,
        scrollDirection: item.state.scrollDirection,
        tracking: item.state.isTracking,
        isInObservationArea: item.state.isInObservationArea,
        rootVisible: item.state.isRootVisible,
        intersectionRatio: item.state.intersectionRatio.toFixed(3),
        axis: item.axis,
        start: item.start,
        end: item.end,
        completed: item.completed,
        selected: item.selected
    };
}
