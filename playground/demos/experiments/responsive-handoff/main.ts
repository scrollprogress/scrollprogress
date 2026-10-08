import './style.css';

import { trackScrollProgress } from '@scrollprogress/scrollprogress';

type ExperimentCleanup = () => void;
function getExperimentElement<TElement extends Element>(
    selector: string,
    parent: ParentNode = document
): TElement {
    const element = parent.querySelector<TElement>(selector);
    if (!element) throw new Error(`Missing demo element: ${selector}`);
    return element;
}

type RequestedMode = 'auto' | 'wide' | 'compact';
type LayoutMode = Exclude<RequestedMode, 'auto'>;

const WIDE_QUERY = '(min-width: 64rem)';

const cleanup: ExperimentCleanup = (() => {
    const demo = getExperimentElement<HTMLElement>('[data-responsive-demo]');
    const root = getExperimentElement<HTMLElement>('[data-responsive-root]', demo);
    const target = getExperimentElement<HTMLElement>('[data-responsive-target]', root);
    const buttons = Array.from(demo.querySelectorAll<HTMLButtonElement>('[data-responsive-mode]'));
    const requestedOutput = getExperimentElement<HTMLElement>('[data-responsive-requested]', demo);
    const layoutOutput = getExperimentElement<HTMLElement>('[data-responsive-layout]', demo);
    const rootOutput = getExperimentElement<HTMLElement>('[data-responsive-root-output]', demo);
    const axisOutput = getExperimentElement<HTMLElement>('[data-responsive-axis]', demo);
    const progressOutput = getExperimentElement<HTMLElement>('[data-responsive-progress]', demo);
    const scrollDirectionOutput = getExperimentElement<HTMLElement>(
        '[data-responsive-scroll-direction]',
        demo
    );
    const progressDirectionOutput = getExperimentElement<HTMLElement>(
        '[data-responsive-progress-direction]',
        demo
    );
    const timeline = getExperimentElement<HTMLOListElement>('[data-responsive-timeline]', demo);
    const mediaQuery = window.matchMedia(WIDE_QUERY);
    const events: string[] = [];
    let requestedMode: RequestedMode = 'auto';
    let effectiveMode: LayoutMode = mediaQuery.matches ? 'wide' : 'compact';

    function resolveMode(): LayoutMode {
        return requestedMode === 'auto' ? (mediaQuery.matches ? 'wide' : 'compact') : requestedMode;
    }

    function renderTimeline(message: string): void {
        events.unshift(message);
        events.splice(4);
        timeline.replaceChildren(
            ...events.map((event) => {
                const item = document.createElement('li');
                item.textContent = event;
                item.className = 'border-l border-violet-300/30 pl-3';
                return item;
            })
        );
    }

    function renderControls(): void {
        requestedOutput.textContent = requestedMode;
        layoutOutput.textContent = effectiveMode;
        rootOutput.textContent = effectiveMode === 'wide' ? 'gallery element' : 'document';
        axisOutput.textContent = effectiveMode === 'wide' ? 'x' : 'y';
        demo.dataset.layout = effectiveMode;
        root.dataset.layout = effectiveMode;

        for (const button of buttons) {
            button.setAttribute(
                'aria-pressed',
                String(button.dataset.responsiveMode === requestedMode)
            );
        }
    }

    renderControls();

    const tracker = trackScrollProgress(target, {
        root: effectiveMode === 'wide' ? root : null,
        axis: effectiveMode === 'wide' ? 'x' : 'y',
        requireRootVisible: effectiveMode === 'wide',
        onUpdate(state) {
            progressOutput.textContent = state.progress.toFixed(3);
            scrollDirectionOutput.textContent = state.scrollDirection;
            progressDirectionOutput.textContent = state.progressDirection;
            target.style.setProperty('--handoff-progress', String(state.progress));
        }
    });

    function applyRequestedMode(nextMode: RequestedMode, source: string): void {
        requestedMode = nextMode;
        const nextEffectiveMode = resolveMode();
        const changed = nextEffectiveMode !== effectiveMode;

        effectiveMode = nextEffectiveMode;
        renderControls();

        if (changed) {
            if (effectiveMode === 'compact') root.scrollLeft = 0;
            tracker.update({
                root: effectiveMode === 'wide' ? root : null,
                axis: effectiveMode === 'wide' ? 'x' : 'y',
                requireRootVisible: effectiveMode === 'wide'
            });
            renderTimeline(`${source}: update() → ${effectiveMode} root and axis`);
        } else {
            renderTimeline(`${source}: ${effectiveMode} geometry already active`);
        }
    }

    function selectMode(event: Event): void {
        const button = event.currentTarget as HTMLButtonElement;
        const mode = button.dataset.responsiveMode as RequestedMode;
        applyRequestedMode(mode, `control/${mode}`);
    }

    function handleBreakpointChange(): void {
        if (requestedMode === 'auto') applyRequestedMode('auto', 'matchMedia');
    }

    for (const button of buttons) button.addEventListener('click', selectMode);
    mediaQuery.addEventListener('change', handleBreakpointChange);
    renderTimeline(`created once in ${effectiveMode} mode`);

    return () => {
        for (const button of buttons) button.removeEventListener('click', selectMode);
        mediaQuery.removeEventListener('change', handleBreakpointChange);
        tracker.destroy();
        target.style.removeProperty('--handoff-progress');
        delete demo.dataset.layout;
        delete root.dataset.layout;
    };
})();

if (import.meta.hot) import.meta.hot.dispose(cleanup);
