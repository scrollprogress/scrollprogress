export function renderDebugPaletteDragIcon(): string {
    return `
        <svg
            class="spdp-icon"
            viewBox="0 0 24 24"
            aria-hidden="true"
            focusable="false"
        >
            <circle cx="9" cy="5" r="1.5" />
            <circle cx="15" cy="5" r="1.5" />
            <circle cx="9" cy="12" r="1.5" />
            <circle cx="15" cy="12" r="1.5" />
            <circle cx="9" cy="19" r="1.5" />
            <circle cx="15" cy="19" r="1.5" />
        </svg>
    `;
}

export function renderDebugPaletteMinimizeIcon(): string {
    return `
        <svg
            class="spdp-icon"
            viewBox="0 0 24 24"
            aria-hidden="true"
            focusable="false"
        >
            <path d="M5 12h14" />
        </svg>
    `;
}

export function renderDebugPaletteExpandIcon(): string {
    return `
        <svg
            class="spdp-icon"
            viewBox="0 0 24 24"
            aria-hidden="true"
            focusable="false"
        >
            <rect x="5" y="5" width="14" height="14" rx="2" />
        </svg>
    `;
}
