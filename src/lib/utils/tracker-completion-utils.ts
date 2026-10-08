import type { ScrollProgressTracker } from '../types.js';

const completedOnceTrackers = new WeakSet<ScrollProgressTracker>();

export function markScrollProgressTrackerOnceCompleted(tracker: ScrollProgressTracker): void {
    completedOnceTrackers.add(tracker);
}

export function hasScrollProgressTrackerCompletedOnce(tracker: ScrollProgressTracker): boolean {
    return completedOnceTrackers.has(tracker);
}
