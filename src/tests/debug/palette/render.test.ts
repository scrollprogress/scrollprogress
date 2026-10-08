// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createDebugPalette } from '../../../lib/debug/palette';

import { resetScrollProgressDebugRegistry } from '../../../lib/debug/registry';

import {
    resetScrollProgressTestMocks,
    runAnimationFrame,
    setupScrollProgressTestMocks
} from '../../helpers/scroll-progress-test-utils';

import {
    expectDetailsRowValue,
    getPaletteActionButton,
    getPaletteDetailsPanel,
    getPaletteTrackerCard,
    registerPaletteTestItem
} from './helpers';

describe('createDebugPalette render', () => {
    beforeEach(() => {
        setupScrollProgressTestMocks();
    });

    afterEach(() => {
        resetScrollProgressDebugRegistry();
        resetScrollProgressTestMocks();
        document.body.innerHTML = '';
    });

    it('renders the registry state', () => {
        const palette = createDebugPalette();

        runAnimationFrame();

        expect(document.body.textContent).toContain('Scroll Progress');
        expect(document.body.textContent).toContain('0 registered');
        expect(document.body.textContent).toContain('No debug items.');
        expect(document.querySelector('.spdp-control-groups')).toBeNull();

        palette.destroy();
    });

    it('renders registered debug items', () => {
        const palette = createDebugPalette();

        const id = registerPaletteTestItem({
            debugId: 'css-vars-demo',
            label: 'Css vars demo',
            state: {
                progress: 0.5,
                progressDirection: 'forward',
                scrollDirection: 'forward',
                isInObservationArea: true,
                isRootVisible: true,
                isTracking: true,
                intersectionRatio: 1
            },
            start: 0.75,
            end: 0.35,
            cssVar: '--scroll-progress'
        });

        runAnimationFrame();

        const selectButton = getPaletteActionButton('select', id);
        const trackerCard = getPaletteTrackerCard(id);

        expect(selectButton).toBeInstanceOf(HTMLButtonElement);
        expect(trackerCard).toBeInstanceOf(HTMLElement);

        expect(selectButton?.textContent).toContain('50.0%');
        expect(selectButton?.textContent).toContain('progress');
        expect(selectButton?.textContent).toContain('io ratio');
        expect(selectButton?.textContent).not.toContain('state');
        expect(selectButton?.textContent).toContain('tracking');

        expect(trackerCard?.textContent).toContain('tracking');
        expect(trackerCard?.querySelectorAll('.spdp-tracker-row')).toHaveLength(2);
        expect(trackerCard?.querySelector('.spdp-tracker-side')).toBeNull();

        expect(document.body.textContent).toContain('Css vars demo');
        expect(document.body.textContent).toContain('css-vars-demo');
        expect(document.body.textContent).toContain('50.0%');
        expect(document.body.textContent).toContain('tracking');
        expect(document.body.textContent).toContain('io ratio');

        expect(selectButton?.getAttribute('aria-expanded')).toBe('false');
        expect(getPaletteDetailsPanel()).toBeNull();

        palette.destroy();
    });

    it('renders completed once trackers as retained snapshots', () => {
        const palette = createDebugPalette();

        const id = registerPaletteTestItem({
            debugId: 'completed-demo',
            label: 'Completed demo',
            once: true,
            completed: true,
            state: {
                progress: 1,
                progressDirection: 'forward',
                scrollDirection: 'forward',
                isInObservationArea: true,
                isRootVisible: true,
                isTracking: true,
                intersectionRatio: 1
            }
        });

        runAnimationFrame();

        const item = getPaletteTrackerCard(id);

        expect(item?.getAttribute('data-completed')).toBe('true');
        expect(item?.querySelector('.spdp-status-badge')?.textContent?.trim()).toBe('completed');

        getPaletteActionButton('select', id)?.click();
        runAnimationFrame();

        const details = getPaletteDetailsPanel();

        expect(details?.getAttribute('data-completed')).toBe('true');
        expect(details?.querySelector('.spdp-status-badge')).toBeNull();
        expectDetailsRowValue('once', 'true');
        expectDetailsRowValue('completed', 'true');

        palette.destroy();
    });

    it('renders details for the selected debug item', () => {
        const palette = createDebugPalette();
        const root = document.createElement('section');

        root.id = 'demo-root';

        const id = registerPaletteTestItem({
            debugId: 'details-demo',
            label: 'Details demo',
            state: {
                progress: 0.625,
                progressDirection: 'forward',
                scrollDirection: 'backward',
                isInObservationArea: true,
                isRootVisible: false,
                isTracking: false,
                intersectionRatio: 0.375
            },
            start: 0.8,
            end: 0.2,
            axis: 'x',
            root,
            rootMargin: '10px',
            observerThreshold: [0, 0.5, 1],
            inverted: true,
            once: true,
            cssVar: '--demo-progress',
            requireRootVisible: true
        });

        runAnimationFrame();

        const item = getPaletteTrackerCard(id);
        const selectButton = getPaletteActionButton('select', id);
        const badges = Array.from(
            item?.querySelectorAll<HTMLElement>('.spdp-tracker-badges .spdp-badge') ?? []
        ).map((badge) => badge.textContent?.trim());

        expect(item?.textContent).toContain('inverted');
        expect(badges).toEqual(['inverted', 'idle']);
        expect(selectButton?.getAttribute('aria-expanded')).toBe('false');
        expect(getPaletteDetailsPanel()).toBeNull();

        selectButton?.click();
        runAnimationFrame();

        const details = getPaletteDetailsPanel();
        const expandedSelectButton = getPaletteActionButton('select', id);

        expect(details).toBeInstanceOf(HTMLElement);
        expect(details?.parentElement).toBe(getPaletteTrackerCard(id));
        expect(expandedSelectButton?.getAttribute('aria-expanded')).toBe('true');
        expect(expandedSelectButton?.getAttribute('aria-controls')).toBe(details?.id);
        expect(details?.getAttribute('aria-label')).toBe('Selected scroll progress debug item');
        expect(details?.getAttribute('data-tracking')).toBe('false');
        expect(details?.textContent).not.toContain('Selected trigger');
        expect(details?.textContent).not.toContain('Details demo');
        expect(details?.querySelector('.spdp-status-badge')).toBeNull();
        expectDetailsRowValue('debug id', 'details-demo');
        expectDetailsRowValue('progress', '62.5%');
        expectDetailsRowValue('observer ratio', '0.375');
        expectDetailsRowValue('progress direction', 'forward');
        expectDetailsRowValue('scroll direction', 'backward');
        expectDetailsRowValue('tracking', 'false');
        expectDetailsRowValue('in observation area', 'true');
        expectDetailsRowValue('root visible', 'false');
        expectDetailsRowValue('axis', 'x');
        expectDetailsRowValue('start / end', '0.8 / 0.2');
        expectDetailsRowValue('root', '#demo-root');
        expectDetailsRowValue('root margin', '10px');
        expectDetailsRowValue('observer threshold', '0, 0.5, 1');
        expectDetailsRowValue('require root visible', 'true');
        expectDetailsRowValue('inverted', 'true');
        expectDetailsRowValue('once', 'true');
        expectDetailsRowValue('completed', 'false');
        expectDetailsRowValue('css var', '--demo-progress');

        const progressBar = details?.querySelector('.spdp-progress-bar');
        const ratioBar = details?.querySelector('.spdp-ratio-bar');
        expect(progressBar).toBeInstanceOf(HTMLElement);
        expect(progressBar?.getAttribute('aria-label')).toBe('Scroll progress');
        expect(progressBar?.getAttribute('aria-valuenow')).toBe('62.5');

        expect(ratioBar).toBeInstanceOf(HTMLElement);
        expect(ratioBar?.getAttribute('aria-label')).toBe('Intersection ratio');
        expect(ratioBar?.getAttribute('aria-valuenow')).toBe('0.375');

        palette.destroy();
    });

    it('renders accessible item states', () => {
        const palette = createDebugPalette();

        const id = registerPaletteTestItem({
            debugId: 'accessible-demo',
            label: 'Accessible demo'
        });

        runAnimationFrame();

        const selectButton = getPaletteActionButton('select', id);
        const item = getPaletteTrackerCard(id);

        expect(selectButton).toBeInstanceOf(HTMLButtonElement);
        expect(selectButton?.type).toBe('button');
        expect(item).toBeInstanceOf(HTMLElement);

        expect(selectButton?.getAttribute('aria-label')).toBe(
            'Show Accessible demo debug item details'
        );
        expect(selectButton?.getAttribute('aria-current')).toBe('true');
        expect(selectButton?.getAttribute('aria-expanded')).toBe('false');
        expect(selectButton?.getAttribute('aria-controls')).toContain(id);

        expect(item?.getAttribute('data-tracking')).toBe('false');

        expect(item?.textContent).toContain('progress');
        expect(item?.textContent).toContain('io ratio');
        expect(item?.textContent).not.toContain('state');
        expect(item?.textContent).toContain('idle');

        selectButton?.click();
        runAnimationFrame();

        const expandedSelectButton = getPaletteActionButton('select', id);

        expect(expandedSelectButton?.getAttribute('aria-label')).toBe(
            'Hide Accessible demo debug item details'
        );
        expect(expandedSelectButton?.getAttribute('aria-expanded')).toBe('true');
        expect(getPaletteDetailsPanel()).toBeInstanceOf(HTMLElement);

        expandedSelectButton?.click();
        runAnimationFrame();

        expect(getPaletteActionButton('select', id)?.getAttribute('aria-expanded')).toBe('false');
        expect(getPaletteDetailsPanel()).toBeNull();

        palette.destroy();
    });
});
