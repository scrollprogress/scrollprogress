import type { ScrollProgressTracker } from '../types.js';
import { createDebugBridge } from './bridge.js';

export interface ScrollProgressDebugBridgeOptions {
    debugId?: string;
    label?: string;
}

export interface ScrollProgressDebugBridgeController {
    destroy: () => void;
}

export function debugScrollProgress(
    tracker: ScrollProgressTracker,
    options: ScrollProgressDebugBridgeOptions = {}
): ScrollProgressDebugBridgeController {
    return createDebugBridge(tracker, options);
}
