export function clampPalettePosition(
    value: number,
    size: number,
    viewportSize: number,
    viewportSpacing: number
): number {
    const max = Math.max(viewportSpacing, viewportSize - size - viewportSpacing);

    return Math.min(Math.max(value, viewportSpacing), max);
}

export function clampPaletteIntoViewport(element: HTMLElement): void {
    const rect = element.getBoundingClientRect();
    const viewportSpacing = readPaletteViewportSpacing(element);

    const nextLeft = clampPalettePosition(
        rect.left,
        rect.width,
        window.innerWidth,
        viewportSpacing
    );

    const nextTop = clampPalettePosition(
        rect.top,
        rect.height,
        window.innerHeight,
        viewportSpacing
    );

    element.style.left = `${nextLeft}px`;
    element.style.top = `${nextTop}px`;
    element.style.right = 'auto';
    element.style.bottom = 'auto';
}

export function readPaletteViewportSpacing(element: HTMLElement): number {
    const rawValue = getComputedStyle(element)
        .getPropertyValue('--sp-debug-palette-token-viewport-spacing')
        .trim();

    const parsedValue = Number.parseFloat(rawValue);

    return Number.isFinite(parsedValue) ? parsedValue : 16;
}
