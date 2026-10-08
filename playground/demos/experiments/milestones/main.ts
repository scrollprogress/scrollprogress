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

const cleanup: ExperimentCleanup = (() => {
    const target = getExperimentElement<HTMLElement>('[data-experiment-target="milestones"]');
    const steps = Array.from(target.querySelectorAll<HTMLElement>('[data-milestone-step]'));
    const progressOutput = getExperimentElement<HTMLOutputElement>('[data-milestone-progress]');
    const thresholds = [0.15, 0.4, 0.65, 0.9];
    const tracker = trackScrollProgress(target, {
        onUpdate({ progress }) {
            progressOutput.value = progress.toFixed(3);
            steps.forEach((step, index) => {
                step.dataset.unlocked = String(progress >= thresholds[index]);
            });
        }
    });

    return () => tracker.destroy();
})();

if (import.meta.hot) import.meta.hot.dispose(cleanup);
