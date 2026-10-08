import { describe, expect, it } from 'vitest';

import {
    getIntersectionRect,
    getRectClipInsets
} from '../../../lib/debug/overlay/utils/geometry-utils';

import { createTestRect } from './helpers';

describe('getIntersectionRect', () => {
    it('returns the overlapping area between two rects', () => {
        const firstRect = createTestRect(100, 100, 300, 200);
        const secondRect = createTestRect(200, 150, 300, 200);

        expect(getIntersectionRect(firstRect, secondRect)).toMatchObject({
            left: 200,
            top: 150,
            width: 200,
            height: 150,
            right: 400,
            bottom: 300,
            x: 200,
            y: 150
        });
    });

    it('returns the inner rect when one rect fully contains the other', () => {
        const outerRect = createTestRect(100, 100, 500, 400);
        const innerRect = createTestRect(200, 150, 100, 80);

        expect(getIntersectionRect(outerRect, innerRect)).toMatchObject({
            left: 200,
            top: 150,
            width: 100,
            height: 80,
            right: 300,
            bottom: 230,
            x: 200,
            y: 150
        });
    });

    it('returns null when rects do not overlap', () => {
        const firstRect = createTestRect(100, 100, 100, 100);
        const secondRect = createTestRect(250, 250, 100, 100);

        expect(getIntersectionRect(firstRect, secondRect)).toBeNull();
    });

    it('returns null when rects only touch horizontally', () => {
        const firstRect = createTestRect(100, 100, 100, 100);
        const secondRect = createTestRect(200, 100, 100, 100);

        expect(getIntersectionRect(firstRect, secondRect)).toBeNull();
    });

    it('returns null when rects only touch vertically', () => {
        const firstRect = createTestRect(100, 100, 100, 100);
        const secondRect = createTestRect(100, 200, 100, 100);

        expect(getIntersectionRect(firstRect, secondRect)).toBeNull();
    });
});

describe('getRectClipInsets', () => {
    it('returns the clipping rect offsets from every rect edge', () => {
        const rect = createTestRect(100, 100, 300, 200);
        const clippingRect = createTestRect(150, 120, 200, 100);

        expect(getRectClipInsets(rect, clippingRect)).toEqual({
            top: 20,
            right: 50,
            bottom: 80,
            left: 50
        });
    });

    it('returns negative insets when the clipping rect extends beyond the rect', () => {
        const rect = createTestRect(200, 150, 100, 80);
        const clippingRect = createTestRect(100, 100, 500, 400);

        expect(getRectClipInsets(rect, clippingRect)).toEqual({
            top: -50,
            right: -300,
            bottom: -270,
            left: -100
        });
    });

    it.each([
        [
            'top',
            createTestRect(150, 50, 100, 100),
            {
                top: 50,
                right: -50,
                bottom: -150,
                left: -50
            }
        ],
        [
            'right',
            createTestRect(250, 150, 100, 100),
            {
                top: -50,
                right: 50,
                bottom: -50,
                left: -150
            }
        ],
        [
            'bottom',
            createTestRect(150, 250, 100, 100),
            {
                top: -150,
                right: -50,
                bottom: 50,
                left: -50
            }
        ],
        [
            'left',
            createTestRect(50, 150, 100, 100),
            {
                top: -50,
                right: -150,
                bottom: -50,
                left: 50
            }
        ]
    ])(
        'returns clipping insets when the target partially crosses the %s edge',
        (_side, targetRect, expectedInsets) => {
            const rootRect = createTestRect(100, 100, 200, 200);

            expect(getRectClipInsets(targetRect, rootRect)).toEqual(expectedInsets);
        }
    );

    it.each([
        [
            'top',
            createTestRect(150, -50, 100, 100),
            {
                top: 150,
                right: -50,
                bottom: -250,
                left: -50
            }
        ],
        [
            'right',
            createTestRect(350, 150, 100, 100),
            {
                top: -50,
                right: 150,
                bottom: -50,
                left: -250
            }
        ],
        [
            'bottom',
            createTestRect(150, 350, 100, 100),
            {
                top: -250,
                right: -50,
                bottom: 150,
                left: -50
            }
        ],
        [
            'left',
            createTestRect(-50, 150, 100, 100),
            {
                top: -50,
                right: -250,
                bottom: -50,
                left: 150
            }
        ]
    ])(
        'returns clipping insets when the target is fully beyond the %s edge',
        (_side, targetRect, expectedInsets) => {
            const rootRect = createTestRect(100, 100, 200, 200);

            expect(getRectClipInsets(targetRect, rootRect)).toEqual(expectedInsets);
        }
    );
});
