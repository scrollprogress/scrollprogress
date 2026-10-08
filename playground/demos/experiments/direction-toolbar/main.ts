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

function setupDirectionalToolbarExperiment(): ExperimentCleanup {
    const target = getExperimentElement<HTMLElement>('[data-experiment-target="direction"]');
    const physical = getExperimentElement<HTMLElement>('[data-direction-physical]');
    const progressDirection = getExperimentElement<HTMLElement>('[data-direction-progress]');
    const exposedProgress = getExperimentElement<HTMLElement>('[data-direction-value]');
    const progressFill = getExperimentElement<HTMLElement>('[data-direction-fill]');
    const toolbarAction = getExperimentElement<HTMLElement>('[data-direction-toolbar-action]');
    const progressAction = getExperimentElement<HTMLElement>('[data-direction-progress-action]');
    const mode = getExperimentElement<HTMLElement>('[data-direction-mode]');
    const invertedToggle = getExperimentElement<HTMLInputElement>('[data-direction-inverted]');
    const expectationRows = Array.from(
        document.querySelectorAll<HTMLElement>('[data-direction-expectation]')
    );
    let lastScrollDirection = 'none';
    const tracker = trackScrollProgress(target, {
        inverted: invertedToggle.checked,
        onUpdate(state) {
            lastScrollDirection = state.scrollDirection;
            physical.textContent = state.scrollDirection;
            progressDirection.textContent = state.progressDirection;
            exposedProgress.textContent = `${Math.round(state.progress * 100)}%`;
            progressFill.style.transform = `scaleX(${state.progress})`;
            target.dataset.toolbarVisible = String(state.scrollDirection !== 'forward');
            toolbarAction.textContent = getToolbarAction(state.scrollDirection);
            progressAction.textContent = getProgressAction(state.progressDirection);
            updateExpectedDirection(expectationRows, invertedToggle.checked, state.scrollDirection);
        }
    });

    function updateMode(): void {
        const inverted = invertedToggle.checked;

        mode.textContent = inverted
            ? 'Inverted · 1 − geometric progress'
            : 'Normal · geometric progress';
        updateExpectedDirection(expectationRows, inverted, lastScrollDirection);
        tracker.update({ inverted });
    }

    invertedToggle.addEventListener('change', updateMode);
    updateMode();

    return () => {
        invertedToggle.removeEventListener('change', updateMode);
        tracker.destroy();
    };
}

function updateExpectedDirection(
    rows: HTMLElement[],
    inverted: boolean,
    scrollDirection: string
): void {
    const movement = scrollDirection === 'backward' ? 'backward' : 'forward';
    const activeExpectation = `${inverted ? 'inverted' : 'normal'}-${movement}`;

    for (const row of rows) {
        row.dataset.active = String(row.dataset.directionExpectation === activeExpectation);
    }
}

function getToolbarAction(direction: string): string {
    if (direction === 'forward') return 'hide controls';
    if (direction === 'backward') return 'show controls';
    return 'keep controls visible';
}

function getProgressAction(direction: string): string {
    if (direction === 'forward') return 'exposed value is increasing';
    if (direction === 'backward') return 'exposed value is decreasing';
    return 'exposed value is unchanged';
}

const cleanup: ExperimentCleanup = setupDirectionalToolbarExperiment();
if (import.meta.hot) import.meta.hot.dispose(cleanup);
