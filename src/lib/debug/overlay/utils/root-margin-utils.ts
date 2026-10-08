export type RootMarginOffsets = {
    top: number;
    right: number;
    bottom: number;
    left: number;
};

export type RootMarginTokens = {
    top: string;
    right: string;
    bottom: string;
    left: string;
};

export type ResolvedRootMargin = {
    offsets: RootMarginOffsets;
    tokens: RootMarginTokens;
};

export type RootMarginGeometry = ResolvedRootMargin & {
    rect: DOMRect;
};

const rootMarginAbsoluteLengthPixelFactors = {
    px: 1,
    cm: 96 / 2.54,
    mm: 96 / 25.4,
    q: 96 / 101.6,
    in: 96,
    pt: 96 / 72,
    pc: 16
} as const;

type RootMarginAbsoluteLengthUnit = keyof typeof rootMarginAbsoluteLengthPixelFactors;

export function parseRootMargin(value: string, percentageBasis?: number): RootMarginOffsets | null {
    return resolveRootMargin(value, percentageBasis)?.offsets ?? null;
}

export function resolveRootMargin(
    value: string,
    percentageBasis?: number
): ResolvedRootMargin | null {
    const parts = value.trim().split(/\s+/).filter(Boolean);

    if (parts.length < 1 || parts.length > 4) {
        return null;
    }

    const parsedParts = parts.map((part) => {
        return parseRootMarginPart(part, percentageBasis);
    });

    if (parsedParts.some((part) => part === null)) {
        return null;
    }

    const [top, right = top, bottom = top, left = right] = parsedParts as [
        number,
        number?,
        number?,
        number?
    ];

    const [topToken, rightToken = topToken, bottomToken = topToken, leftToken = rightToken] = parts;

    return {
        offsets: {
            top,
            right,
            bottom,
            left
        },
        tokens: {
            top: topToken,
            right: rightToken,
            bottom: bottomToken,
            left: leftToken
        }
    };
}

function parseRootMarginPart(value: string, percentageBasis?: number): number | null {
    const absoluteLengthMatch = value.match(/^(-?\d+(?:\.\d+)?)(px|cm|mm|q|in|pt|pc)$/i);

    if (absoluteLengthMatch) {
        const numericValue = Number(absoluteLengthMatch[1]);

        const unit = absoluteLengthMatch[2].toLowerCase() as RootMarginAbsoluteLengthUnit;

        return numericValue * rootMarginAbsoluteLengthPixelFactors[unit];
    }

    const percentageMatch = value.match(/^(-?\d+(?:\.\d+)?)%$/);

    if (!percentageMatch || percentageBasis === undefined) {
        return null;
    }

    return (Number(percentageMatch[1]) / 100) * percentageBasis;
}

export function getRootMarginRect(rootRect: DOMRect, rootMargin: string): DOMRect | null {
    return getRootMarginGeometry(rootRect, rootMargin)?.rect ?? null;
}

export function getRootMarginGeometry(
    rootRect: DOMRect,
    rootMargin: string
): RootMarginGeometry | null {
    const resolvedRootMargin = resolveRootMargin(rootMargin, rootRect.width);

    if (!resolvedRootMargin) {
        return null;
    }

    const { offsets } = resolvedRootMargin;
    const left = rootRect.left - offsets.left;
    const top = rootRect.top - offsets.top;
    const width = rootRect.width + offsets.left + offsets.right;
    const height = rootRect.height + offsets.top + offsets.bottom;

    if (width <= 0 || height <= 0) {
        return null;
    }

    return {
        ...resolvedRootMargin,
        rect: {
            left,
            top,
            width,
            height,
            right: left + width,
            bottom: top + height,
            x: left,
            y: top,
            toJSON: () => ({})
        } as DOMRect
    };
}
