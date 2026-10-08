// @vitest-environment happy-dom

import { afterEach, describe, expect, it } from 'vitest';

import {
    applyScrollProgressDebugOverlayColors,
    getScrollProgressDebugOverlayResolvedColors,
    scrollProgressDebugOverlayColorIds,
    type ScrollProgressDebugOverlayColorId,
    type ScrollProgressDebugOverlayColors
} from '../../../lib/debug/overlay/colors';

const configuredColors = {
    target: {
        color: '#facc15',
        labelTextColor: '#020617'
    },
    'progress-start': {
        color: '#22c55e',
        labelTextColor: '#052e16'
    },
    'progress-end': {
        color: '#f97316',
        labelTextColor: '#431407'
    },
    root: {
        color: '#60a5fa',
        labelTextColor: '#172554'
    },
    margin: {
        color: '#a855f7',
        labelTextColor: '#3b0764'
    },
    intersection: {
        color: '#f87171',
        labelTextColor: '#450a0a'
    }
} satisfies Required<ScrollProgressDebugOverlayColors>;

const defaultColors = {
    target: '#fde047',
    'progress-start': '#4ade80',
    'progress-end': '#fb923c',
    root: '#93c5fd',
    margin: '#c084fc',
    intersection: '#fca5a5'
} satisfies Record<ScrollProgressDebugOverlayColorId, string>;

afterEach(() => {
    document.body.innerHTML = '';
});

describe('scroll progress debug overlay colors', () => {
    it('applies color and label text properties for every color id', () => {
        const element = document.createElement('div');

        applyScrollProgressDebugOverlayColors(element, configuredColors);

        for (const colorId of scrollProgressDebugOverlayColorIds) {
            const color = configuredColors[colorId];

            expect(element.style.getPropertyValue(`--sp-debug-overlay-${colorId}-color`)).toBe(
                color.color
            );

            expect(element.style.getPropertyValue(`--sp-debug-overlay-${colorId}-label-text`)).toBe(
                color.labelTextColor
            );
        }
    });

    it('resolves the configured color for every color id', () => {
        const element = document.createElement('div');

        document.body.append(element);

        applyScrollProgressDebugOverlayColors(element, configuredColors);

        expect(getScrollProgressDebugOverlayResolvedColors(element)).toEqual({
            target: configuredColors.target.color,
            'progress-start': configuredColors['progress-start'].color,
            'progress-end': configuredColors['progress-end'].color,
            root: configuredColors.root.color,
            margin: configuredColors.margin.color,
            intersection: configuredColors.intersection.color
        });
    });

    it('resolves unconfigured color ids from public theme properties', () => {
        const element = document.createElement('div');

        document.body.append(element);

        for (const colorId of scrollProgressDebugOverlayColorIds) {
            element.style.setProperty(
                `--sp-debug-overlay-${colorId}-color`,
                defaultColors[colorId]
            );
        }

        applyScrollProgressDebugOverlayColors(element, {
            target: configuredColors.target
        });

        expect(getScrollProgressDebugOverlayResolvedColors(element)).toEqual({
            target: configuredColors.target.color,
            'progress-start': defaultColors['progress-start'],
            'progress-end': defaultColors['progress-end'],
            root: defaultColors.root,
            margin: defaultColors.margin,
            intersection: defaultColors.intersection
        });
    });
});
