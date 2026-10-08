export type ScrollProgressDebugOverlayLabelId =
    'target' | 'progress-start' | 'progress-end' | 'root' | 'margin' | 'intersection';

export interface ScrollProgressDebugOverlayLabelPlacement {
    mode: 'internal' | 'external';
    vertical: 'top' | 'bottom';
    horizontal: 'left' | 'center' | 'right';
}

export type ScrollProgressDebugOverlayLabelPlacements = Partial<
    Record<ScrollProgressDebugOverlayLabelId, Partial<ScrollProgressDebugOverlayLabelPlacement>>
>;

const defaultScrollProgressDebugOverlayLabelPlacements: Record<
    ScrollProgressDebugOverlayLabelId,
    ScrollProgressDebugOverlayLabelPlacement
> = {
    target: {
        mode: 'internal',
        vertical: 'top',
        horizontal: 'left'
    },
    'progress-start': {
        mode: 'external',
        vertical: 'top',
        horizontal: 'left'
    },
    'progress-end': {
        mode: 'external',
        vertical: 'bottom',
        horizontal: 'right'
    },
    root: {
        mode: 'internal',
        vertical: 'top',
        horizontal: 'right'
    },
    margin: {
        mode: 'internal',
        vertical: 'bottom',
        horizontal: 'left'
    },
    intersection: {
        mode: 'internal',
        vertical: 'bottom',
        horizontal: 'right'
    }
};

function isValidMode(value: unknown): value is ScrollProgressDebugOverlayLabelPlacement['mode'] {
    return value === 'internal' || value === 'external';
}

function isValidVertical(
    value: unknown
): value is ScrollProgressDebugOverlayLabelPlacement['vertical'] {
    return value === 'top' || value === 'bottom';
}

function isValidHorizontal(
    value: unknown
): value is ScrollProgressDebugOverlayLabelPlacement['horizontal'] {
    return value === 'left' || value === 'center' || value === 'right';
}

export function resolveScrollProgressDebugOverlayLabelPlacement(
    labelId: ScrollProgressDebugOverlayLabelId,
    labelPlacements: ScrollProgressDebugOverlayLabelPlacements = {}
): ScrollProgressDebugOverlayLabelPlacement {
    const defaultPlacement = defaultScrollProgressDebugOverlayLabelPlacements[labelId];

    const override = labelPlacements[labelId];

    return {
        mode: isValidMode(override?.mode) ? override.mode : defaultPlacement.mode,
        vertical: isValidVertical(override?.vertical)
            ? override.vertical
            : defaultPlacement.vertical,
        horizontal: isValidHorizontal(override?.horizontal)
            ? override.horizontal
            : defaultPlacement.horizontal
    };
}
