// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { trackScrollProgress, type ScrollProgressTracker } from '@scrollprogress/scrollprogress';
import { getScrollProgressDebugRegistryState } from '@scrollprogress/scrollprogress/debug/registry';
import { createScrollProgressDebugger } from '@scrollprogress/scrollprogress/debug/session';

import {
    createElementWithRect,
    resetScrollProgressTestMocks,
    setupScrollProgressTestMocks
} from '../../src/tests/helpers/scroll-progress-test-utils';

let tracker: ScrollProgressTracker | undefined;
let debug: ReturnType<typeof createScrollProgressDebugger> | undefined;

describe('built debug session package entry', () => {
    beforeEach(() => {
        setupScrollProgressTestMocks();
    });

    afterEach(() => {
        debug?.destroy();
        tracker?.destroy();
        debug = undefined;
        tracker = undefined;

        resetScrollProgressTestMocks();
        document.body.innerHTML = '';
    });

    it('composes the built bridge and tool entries through one session', () => {
        tracker = trackScrollProgress(createElementWithRect());
        debug = createScrollProgressDebugger(tracker, {
            label: 'Installed session',
            palette: true,
            overlay: true,
            console: false
        });

        expect(getScrollProgressDebugRegistryState().items[0]).toMatchObject({
            label: 'Installed session'
        });
        expect(
            document.querySelector('[data-scroll-progress-debug-palette="true"]')
        ).not.toBeNull();
        expect(document.querySelector('.scroll-progress-debug-overlay')).not.toBeNull();

        debug.destroy();

        expect(getScrollProgressDebugRegistryState().items).toEqual([]);
        expect(document.querySelector('[data-scroll-progress-debug-palette="true"]')).toBeNull();
        expect(document.querySelector('.scroll-progress-debug-overlay')).toBeNull();
    });
});
