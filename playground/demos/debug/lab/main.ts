import './style.css';

import '@scrollprogress/scrollprogress/debug/themes/neon-grid.css';
import '@scrollprogress/scrollprogress/debug/themes/paper.css';

import { trackScrollProgress } from '@scrollprogress/scrollprogress';
import { debugScrollProgress } from '@scrollprogress/scrollprogress/debug';
import { createDebugConsoleLogger } from '@scrollprogress/scrollprogress/debug/console';
import { createDebugOverlay } from '@scrollprogress/scrollprogress/debug/overlay';
import {
    createDebugPalette,
    registerDebugPaletteControlGroup
} from '@scrollprogress/scrollprogress/debug/palette';

const targets = Array.from(document.querySelectorAll<HTMLElement>('[data-debug-target]'));
const debugObserverThresholds = [
    0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.95, 1
];

const trackers = targets.map((target, index) => {
    const trackerNumber = String(index + 1).padStart(2, '0');
    const label = target.querySelector('h2')?.textContent?.trim() ?? `Tracker ${trackerNumber}`;
    const root = target.closest<HTMLElement>('[data-debug-root]');
    const tracker = trackScrollProgress(target, {
        root,
        inverted: target.hasAttribute('data-debug-inverted'),
        once: target.hasAttribute('data-debug-once'),
        observerThreshold: target.hasAttribute('data-debug-thresholds')
            ? debugObserverThresholds
            : undefined
    });

    debugScrollProgress(tracker, {
        debugId: `debug-tracker-${trackerNumber}`,
        label: `${trackerNumber} · ${label}`
    });

    return tracker;
});

const consoleLogger = createDebugConsoleLogger();
const overlay = createDebugOverlay({ theme: 'paper' });
const snapshotControls = registerDebugPaletteControlGroup({
    label: 'Snapshot',
    controls: [
        {
            id: 'copy-current',
            type: 'button',
            label: 'Copy current snapshot',
            onActivate({ selectedItem }) {
                if (!selectedItem || !navigator.clipboard) {
                    return;
                }

                const snapshot = {
                    debugId: selectedItem.debugId,
                    label: selectedItem.label,
                    state: selectedItem.state,
                    start: selectedItem.start,
                    end: selectedItem.end,
                    axis: selectedItem.axis,
                    rootMargin: selectedItem.rootMargin,
                    inverted: selectedItem.inverted,
                    once: selectedItem.once,
                    completed: selectedItem.completed
                };

                void navigator.clipboard
                    .writeText(JSON.stringify(snapshot, null, 2))
                    .catch((error: unknown) => console.error('Unable to copy snapshot', error));
            }
        }
    ]
});
const palette = createDebugPalette({
    className: 'playground-debug-palette',
    theme: 'neon-grid'
});

if (import.meta.hot) {
    import.meta.hot.dispose(() => {
        palette.destroy();
        snapshotControls.destroy();
        overlay.destroy();
        consoleLogger.destroy();

        for (const tracker of trackers) {
            tracker.destroy();
        }
    });
}
