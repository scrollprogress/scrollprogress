import './style.css';

import { trackScrollProgress, type ScrollProgressTracker } from '@scrollprogress/scrollprogress';

type ExperimentCleanup = () => void;
function getExperimentElement<TElement extends Element>(
    selector: string,
    parent: ParentNode = document
): TElement {
    const element = parent.querySelector<TElement>(selector);
    if (!element) throw new Error(`Missing demo element: ${selector}`);
    return element;
}

type LoadState = 'idle' | 'loading' | 'ready';

const cleanup: ExperimentCleanup = (() => {
    const root = getExperimentElement<HTMLElement>('[data-experiment-root="preload"]');
    const target = getExperimentElement<HTMLElement>('[data-experiment-target="preload"]', root);
    const status = getExperimentElement<HTMLElement>('[data-preload-status]');
    const content = getExperimentElement<HTMLElement>('[data-preload-content]', target);
    const progressOutput = getExperimentElement<HTMLOutputElement>('[data-preload-progress]');
    const resetButton = getExperimentElement<HTMLButtonElement>('[data-preload-reset]');
    let tracker: ScrollProgressTracker | null = null;
    let unsubscribe: (() => void) | null = null;
    let loadTimer: number | null = null;
    let loadStarted = false;
    let ready = false;
    let lastProgress = 0;

    function renderLoadState(state: LoadState): void {
        status.textContent = state;
        target.dataset.loadState = state;
        content.setAttribute('aria-hidden', String(state !== 'ready'));
    }

    function renderReveal(progress: number): void {
        progressOutput.value = progress.toFixed(3);
        content.style.opacity = String(ready ? progress : 0);
        content.style.transform = `translateY(${20 * (1 - progress)}px)`;
    }

    function startFakeLoad(): void {
        if (loadStarted) return;

        loadStarted = true;
        renderLoadState('loading');
        loadTimer = window.setTimeout(() => {
            loadTimer = null;
            ready = true;
            renderLoadState('ready');
            renderReveal(lastProgress);
        }, 1000);
    }

    function destroyTracker(): void {
        unsubscribe?.();
        unsubscribe = null;
        tracker?.destroy();
        tracker = null;
    }

    function createTracker(): void {
        tracker = trackScrollProgress(target, {
            root,
            rootMargin: '0px 0px 160px 0px',
            requireRootVisible: true,
            start: 0.9,
            end: 0.35,
            onUpdate({ progress }) {
                lastProgress = progress;
                renderReveal(progress);
            }
        });
        unsubscribe = tracker.subscribe((state) => {
            if (state.isInObservationArea) startFakeLoad();
        });
    }

    function resetDemo(): void {
        destroyTracker();
        if (loadTimer !== null) window.clearTimeout(loadTimer);
        loadTimer = null;
        loadStarted = false;
        ready = false;
        lastProgress = 0;
        root.scrollTop = 0;
        renderLoadState('idle');
        renderReveal(0);
        createTracker();
    }

    resetButton.addEventListener('click', resetDemo);
    renderLoadState('idle');
    renderReveal(0);
    createTracker();

    return () => {
        resetButton.removeEventListener('click', resetDemo);
        destroyTracker();
        if (loadTimer !== null) window.clearTimeout(loadTimer);
    };
})();

if (import.meta.hot) import.meta.hot.dispose(cleanup);
