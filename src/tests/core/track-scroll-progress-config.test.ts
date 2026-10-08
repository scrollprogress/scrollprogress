import { describe, expect, it } from 'vitest';

import {
    mergeTrackScrollProgressConfig,
    resolveTrackScrollProgressConfig
} from '../../../src/lib/track-scroll-progress-config';

describe('track scroll progress config', () => {
    it('owns observer threshold arrays during config resolution', () => {
        const observerThreshold = [0, 0.5, 1];
        const config = resolveTrackScrollProgressConfig({
            observerThreshold
        });

        observerThreshold[1] = 0.75;

        expect(config.observerThreshold).toEqual([0, 0.5, 1]);
    });

    it('owns observer threshold arrays received through config updates', () => {
        const currentConfig = resolveTrackScrollProgressConfig({
            observerThreshold: [0, 0.5, 1]
        });

        const observerThreshold = [0, 0.25, 1];
        const nextConfig = mergeTrackScrollProgressConfig(currentConfig, {
            observerThreshold
        });

        observerThreshold[1] = 0.75;

        expect(nextConfig.observerThreshold).toEqual([0, 0.25, 1]);
    });

    it('reuses the current observer threshold when update values are unchanged', () => {
        const currentConfig = resolveTrackScrollProgressConfig({
            observerThreshold: [0, 0.5, 1]
        });

        const nextConfig = mergeTrackScrollProgressConfig(currentConfig, {
            observerThreshold: [0, 0.5, 1]
        });

        expect(nextConfig.observerThreshold).toBe(currentConfig.observerThreshold);
    });

    it('keeps the current config values when update options are empty', () => {
        const currentConfig = resolveTrackScrollProgressConfig({
            start: 0.9,
            end: 0.2,
            axis: 'x',
            rootMargin: '10px',
            observerThreshold: [0, 0.5, 1],
            requireRootVisible: true,
            inverted: true,
            once: true,
            cssVar: '--progress'
        });

        expect(mergeTrackScrollProgressConfig(currentConfig, {})).toEqual(currentConfig);
    });

    it('merges provided config values over the current config', () => {
        const currentConfig = resolveTrackScrollProgressConfig({
            start: 0.8,
            end: 0.4,
            axis: 'y',
            rootMargin: '0px',
            observerThreshold: 0,
            requireRootVisible: false,
            inverted: false,
            once: false,
            cssVar: '--progress'
        });

        expect(
            mergeTrackScrollProgressConfig(currentConfig, {
                start: 0.7,
                end: 0.3,
                axis: 'x',
                rootMargin: '20px',
                observerThreshold: [0, 1],
                requireRootVisible: true,
                inverted: true,
                once: true,
                cssVar: '--next-progress'
            })
        ).toEqual(
            resolveTrackScrollProgressConfig({
                start: 0.7,
                end: 0.3,
                axis: 'x',
                rootMargin: '20px',
                observerThreshold: [0, 1],
                requireRootVisible: true,
                inverted: true,
                once: true,
                cssVar: '--next-progress'
            })
        );
    });

    it('allows root to be explicitly updated to null', () => {
        const root = {} as Element;

        const currentConfig = resolveTrackScrollProgressConfig({
            root
        });

        expect(
            mergeTrackScrollProgressConfig(currentConfig, {
                root: null
            }).root
        ).toBeNull();
    });

    it('allows cssVar to be explicitly updated to null', () => {
        const currentConfig = resolveTrackScrollProgressConfig({
            cssVar: '--progress'
        });

        expect(
            mergeTrackScrollProgressConfig(currentConfig, {
                cssVar: null
            }).cssVar
        ).toBeNull();
    });

    it('preserves explicit false boolean updates', () => {
        const currentConfig = resolveTrackScrollProgressConfig({
            requireRootVisible: true,
            inverted: true,
            once: true
        });

        const nextConfig = mergeTrackScrollProgressConfig(currentConfig, {
            requireRootVisible: false,
            inverted: false,
            once: false
        });

        expect(nextConfig.requireRootVisible).toBe(false);
        expect(nextConfig.inverted).toBe(false);
        expect(nextConfig.once).toBe(false);
    });
});
