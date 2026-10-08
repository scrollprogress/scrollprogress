import { describe, expect, it } from 'vitest';

import {
    resolveScrollProgressDebugOverlayLabelPlacement,
    type ScrollProgressDebugOverlayLabelPlacements
} from '../../../lib/debug/overlay/label-placements';

describe('resolveScrollProgressDebugOverlayLabelPlacement', () => {
    it('resolves the default placement for every overlay label', () => {
        const cases = [
            {
                labelId: 'target',
                expectedPlacement: {
                    mode: 'internal',
                    vertical: 'top',
                    horizontal: 'left'
                }
            },
            {
                labelId: 'progress-start',
                expectedPlacement: {
                    mode: 'external',
                    vertical: 'top',
                    horizontal: 'left'
                }
            },
            {
                labelId: 'progress-end',
                expectedPlacement: {
                    mode: 'external',
                    vertical: 'bottom',
                    horizontal: 'right'
                }
            },
            {
                labelId: 'root',
                expectedPlacement: {
                    mode: 'internal',
                    vertical: 'top',
                    horizontal: 'right'
                }
            },
            {
                labelId: 'margin',
                expectedPlacement: {
                    mode: 'internal',
                    vertical: 'bottom',
                    horizontal: 'left'
                }
            },
            {
                labelId: 'intersection',
                expectedPlacement: {
                    mode: 'internal',
                    vertical: 'bottom',
                    horizontal: 'right'
                }
            }
        ] as const;

        for (const { labelId, expectedPlacement } of cases) {
            expect(resolveScrollProgressDebugOverlayLabelPlacement(labelId)).toEqual(
                expectedPlacement
            );
        }
    });

    it('merges individual placement overrides with their label defaults', () => {
        expect(
            resolveScrollProgressDebugOverlayLabelPlacement('target', {
                target: {
                    mode: 'external'
                }
            })
        ).toEqual({
            mode: 'external',
            vertical: 'top',
            horizontal: 'left'
        });

        expect(
            resolveScrollProgressDebugOverlayLabelPlacement('progress-start', {
                'progress-start': {
                    vertical: 'bottom'
                }
            })
        ).toEqual({
            mode: 'external',
            vertical: 'bottom',
            horizontal: 'left'
        });

        expect(
            resolveScrollProgressDebugOverlayLabelPlacement('margin', {
                margin: {
                    horizontal: 'right'
                }
            })
        ).toEqual({
            mode: 'internal',
            vertical: 'bottom',
            horizontal: 'right'
        });
    });

    it('resolves a complete placement override', () => {
        expect(
            resolveScrollProgressDebugOverlayLabelPlacement('intersection', {
                intersection: {
                    mode: 'external',
                    vertical: 'top',
                    horizontal: 'left'
                }
            })
        ).toEqual({
            mode: 'external',
            vertical: 'top',
            horizontal: 'left'
        });
    });

    it('preserves defaults for undefined placement properties', () => {
        const labelPlacements: ScrollProgressDebugOverlayLabelPlacements = {
            target: {
                mode: undefined,
                vertical: 'bottom',
                horizontal: undefined
            }
        };

        expect(resolveScrollProgressDebugOverlayLabelPlacement('target', labelPlacements)).toEqual({
            mode: 'internal',
            vertical: 'bottom',
            horizontal: 'left'
        });
    });

    it('falls back to defaults for invalid runtime placement values', () => {
        const runtimeLabelPlacements = {
            target: {
                mode: 'banana',
                vertical: 'center',
                horizontal: 'somewhere'
            }
        };

        expect(
            resolveScrollProgressDebugOverlayLabelPlacement(
                'target',
                runtimeLabelPlacements as unknown as ScrollProgressDebugOverlayLabelPlacements
            )
        ).toEqual({
            mode: 'internal',
            vertical: 'top',
            horizontal: 'left'
        });
    });

    it('returns a new placement without mutating the defaults', () => {
        const placement = resolveScrollProgressDebugOverlayLabelPlacement('target');

        placement.mode = 'external';
        placement.vertical = 'bottom';
        placement.horizontal = 'right';

        expect(resolveScrollProgressDebugOverlayLabelPlacement('target')).toEqual({
            mode: 'internal',
            vertical: 'top',
            horizontal: 'left'
        });
    });

    it('accepts center as a horizontal placement override', () => {
        expect(
            resolveScrollProgressDebugOverlayLabelPlacement('target', {
                target: {
                    horizontal: 'center'
                }
            })
        ).toEqual({
            mode: 'internal',
            vertical: 'top',
            horizontal: 'center'
        });
    });
});
