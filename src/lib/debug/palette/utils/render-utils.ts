import type { ScrollProgressDebugRegistryItem } from '../../registry.js';

export function formatDebugProgress(progress: number): string {
    return `${(progress * 100).toFixed(1)}%`;
}

export function formatDebugRatio(value: number): string {
    return value.toFixed(3);
}

export function formatDebugRoot(root: ScrollProgressDebugRegistryItem['root']): string {
    if (!root) {
        return 'viewport';
    }

    if ('nodeType' in root && root.nodeType === 9) {
        return 'document';
    }

    if ('tagName' in root) {
        const element = root as Element;

        if (element.id) {
            return `#${element.id}`;
        }

        return element.tagName.toLowerCase();
    }

    return 'custom root';
}

export function formatDebugThreshold(
    threshold: ScrollProgressDebugRegistryItem['observerThreshold']
): string {
    if (Array.isArray(threshold)) {
        return threshold.join(', ');
    }

    return String(threshold);
}

export function escapeHtml(value: string): string {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

export function escapeAttribute(value: string): string {
    return escapeHtml(value);
}

export function getDebugPaletteDetailsId(prefix: string, id: string): string {
    return `${prefix}-${id}-details`;
}
