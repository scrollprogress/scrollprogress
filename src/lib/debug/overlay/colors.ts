export const scrollProgressDebugOverlayColorIds = [
    'target',
    'progress-start',
    'progress-end',
    'root',
    'margin',
    'intersection'
] as const;

export type ScrollProgressDebugOverlayColorId = (typeof scrollProgressDebugOverlayColorIds)[number];

export interface ScrollProgressDebugOverlayColor {
    color?: string;
    labelTextColor?: string;
}

export type ScrollProgressDebugOverlayColors = Partial<
    Record<ScrollProgressDebugOverlayColorId, ScrollProgressDebugOverlayColor>
>;

export type ScrollProgressDebugOverlayResolvedColors = Readonly<
    Record<ScrollProgressDebugOverlayColorId, string>
>;

function getScrollProgressDebugOverlayColorCustomPropertyName(
    colorId: ScrollProgressDebugOverlayColorId,
    property: 'color' | 'label-text'
): string {
    return `--sp-debug-overlay-${colorId}-${property}`;
}

export function applyScrollProgressDebugOverlayColors(
    element: HTMLElement,
    colors: ScrollProgressDebugOverlayColors
): void {
    for (const colorId of scrollProgressDebugOverlayColorIds) {
        const color = colors[colorId];

        if (!color) {
            continue;
        }

        if (color.color !== undefined) {
            element.style.setProperty(
                getScrollProgressDebugOverlayColorCustomPropertyName(colorId, 'color'),
                color.color
            );
        }

        if (color.labelTextColor !== undefined) {
            element.style.setProperty(
                getScrollProgressDebugOverlayColorCustomPropertyName(colorId, 'label-text'),
                color.labelTextColor
            );
        }
    }
}

export function getScrollProgressDebugOverlayResolvedColors(
    element: HTMLElement
): ScrollProgressDebugOverlayResolvedColors {
    const computedStyle = window.getComputedStyle(element);

    const colors = {} as Record<ScrollProgressDebugOverlayColorId, string>;

    for (const colorId of scrollProgressDebugOverlayColorIds) {
        colors[colorId] = computedStyle
            .getPropertyValue(
                getScrollProgressDebugOverlayColorCustomPropertyName(colorId, 'color')
            )
            .trim();
    }

    return colors;
}
