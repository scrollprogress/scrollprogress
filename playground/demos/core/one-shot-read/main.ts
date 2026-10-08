import './style.css';

import { readScrollProgress } from '@scrollprogress/scrollprogress';

function required<TElement extends Element>(selector: string): TElement {
    const element = document.querySelector<TElement>(selector);

    if (!element) throw new Error(`Missing one-shot read demo element: ${selector}`);
    return element;
}

const target = required<HTMLElement>('[data-core-target="one-shot-read"]');
const button = required<HTMLButtonElement>('[data-one-shot-read]');
const output = required<HTMLOutputElement>('[data-one-shot-progress]');

function readCurrentProgress(): void {
    const progress = readScrollProgress(target, {
        start: 0.8,
        end: 0.2,
        axis: 'y',
        root: null
    });

    output.value = progress.toFixed(3);
}

button.addEventListener('click', readCurrentProgress);
readCurrentProgress();

if (import.meta.hot) {
    import.meta.hot.dispose(() => button.removeEventListener('click', readCurrentProgress));
}
