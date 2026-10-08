export function writeCssVar(
    element: HTMLElement,
    name: string | null,
    value: string | number
): void {
    if (name === null) {
        return;
    }

    element.style.setProperty(name, String(value));
}

export function removeCssVar(element: HTMLElement, name: string | null): void {
    if (name === null) {
        return;
    }

    element.style.removeProperty(name);
}
