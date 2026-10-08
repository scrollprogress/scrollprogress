import { describe, expect, it } from 'vitest';

import {
    getRootMarginRect,
    parseRootMargin,
    resolveRootMargin
} from '../../../lib/debug/overlay/utils/root-margin-utils';
import { createTestRect } from './helpers';

describe('parseRootMargin', () => {
    it('parses a single px value for all sides', () => {
        expect(parseRootMargin('10px')).toEqual({
            top: 10,
            right: 10,
            bottom: 10,
            left: 10
        });
    });

    it('parses two px values as vertical and horizontal offsets', () => {
        expect(parseRootMargin('10px 20px')).toEqual({
            top: 10,
            right: 20,
            bottom: 10,
            left: 20
        });
    });

    it('parses three px values using CSS shorthand rules', () => {
        expect(parseRootMargin('10px 20px 30px')).toEqual({
            top: 10,
            right: 20,
            bottom: 30,
            left: 20
        });
    });

    it('parses four px values using CSS shorthand rules', () => {
        expect(parseRootMargin('10px 20px 30px 40px')).toEqual({
            top: 10,
            right: 20,
            bottom: 30,
            left: 40
        });
    });

    it('parses negative and decimal px values', () => {
        expect(parseRootMargin('-10px 1.5px')).toEqual({
            top: -10,
            right: 1.5,
            bottom: -10,
            left: 1.5
        });
    });

    it('returns null for percentage values without a percentage basis', () => {
        expect(parseRootMargin('10%')).toBeNull();
    });

    it('returns null for invalid shorthand length', () => {
        expect(parseRootMargin('1px 2px 3px 4px 5px')).toBeNull();
    });

    it('returns null for empty input', () => {
        expect(parseRootMargin('')).toBeNull();
        expect(parseRootMargin('   ')).toBeNull();
    });

    it('parses percentage values using the provided percentage basis', () => {
        expect(parseRootMargin('10% 20%', 1000)).toEqual({
            top: 100,
            right: 200,
            bottom: 100,
            left: 200
        });
    });

    it('returns null for unsupported relative or computed root margin values', () => {
        expect(parseRootMargin('1rem')).toBeNull();
        expect(parseRootMargin('calc(10px + 1px)')).toBeNull();
    });

    it('returns null for unsupported relative or computed units', () => {
        expect(parseRootMargin('1rem', 300)).toBeNull();
        expect(parseRootMargin('1em', 300)).toBeNull();
        expect(parseRootMargin('10vh', 300)).toBeNull();
        expect(parseRootMargin('calc(10px + 1px)', 300)).toBeNull();
    });

    it('parses mixed px and percentage values using the root width as percentage basis', () => {
        expect(parseRootMargin('10px 5% -20px 0px', 1000)).toEqual({
            top: 10,
            right: 50,
            bottom: -20,
            left: 0
        });
    });

    it('converts CSS absolute length units to pixel offsets', () => {
        const expectedOffsets = {
            top: 96,
            right: 96,
            bottom: 96,
            left: 96
        };

        expect(parseRootMargin('2.54cm')).toEqual(expectedOffsets);
        expect(parseRootMargin('25.4mm')).toEqual(expectedOffsets);
        expect(parseRootMargin('101.6Q')).toEqual(expectedOffsets);
        expect(parseRootMargin('1in')).toEqual(expectedOffsets);
        expect(parseRootMargin('72pt')).toEqual(expectedOffsets);
        expect(parseRootMargin('6pc')).toEqual(expectedOffsets);
    });
});

describe('getRootMarginRect', () => {
    it('expands the root rect with positive margins', () => {
        const rootRect = createTestRect(100, 200, 300, 400);

        expect(getRootMarginRect(rootRect, '10px 20px 30px 40px')).toMatchObject({
            left: 60,
            top: 190,
            width: 360,
            height: 440,
            right: 420,
            bottom: 630
        });
    });

    it('shrinks the root rect with negative margins', () => {
        const rootRect = createTestRect(100, 200, 300, 400);

        expect(getRootMarginRect(rootRect, '-10px -20px -30px -40px')).toMatchObject({
            left: 140,
            top: 210,
            width: 240,
            height: 360,
            right: 380,
            bottom: 570
        });
    });

    it('returns null when negative margins collapse the rect', () => {
        const rootRect = createTestRect(100, 200, 100, 100);

        expect(getRootMarginRect(rootRect, '-60px -60px -60px -60px')).toBeNull();
    });

    it('expands the root rect with percentage margins resolved against root width', () => {
        const rootRect = createTestRect(100, 200, 300, 400);

        expect(getRootMarginRect(rootRect, '10%')).toMatchObject({
            left: 70,
            top: 170,
            width: 360,
            height: 460,
            right: 430,
            bottom: 630
        });
    });

    it('expands the root rect with percentage margins resolved against root width', () => {
        const rootRect = createTestRect(100, 200, 1000, 400);

        expect(getRootMarginRect(rootRect, '10%')).toMatchObject({
            left: 0,
            top: 100,
            width: 1200,
            height: 600,
            right: 1200,
            bottom: 700
        });
    });

    it('applies mixed px and percentage margins to the root rect', () => {
        const rootRect = createTestRect(100, 200, 1000, 400);

        expect(getRootMarginRect(rootRect, '10px 5% -20px 0px')).toMatchObject({
            left: 100,
            top: 190,
            width: 1050,
            height: 390,
            right: 1150,
            bottom: 580
        });
    });

    it('expands the root rect using converted absolute length units', () => {
        const rootRect = createTestRect(100, 200, 300, 400);

        expect(getRootMarginRect(rootRect, '1in')).toMatchObject({
            left: 4,
            top: 104,
            width: 492,
            height: 592,
            right: 496,
            bottom: 696
        });
    });

    it('preserves expanded source tokens with the resolved offsets', () => {
        expect(resolveRootMargin('10% 20px', 1000)).toEqual({
            offsets: {
                top: 100,
                right: 20,
                bottom: 100,
                left: 20
            },
            tokens: {
                top: '10%',
                right: '20px',
                bottom: '10%',
                left: '20px'
            }
        });
    });
});
