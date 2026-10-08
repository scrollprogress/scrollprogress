export interface AnimationFrameScheduler {
    request(): void;
    cancel(): void;
}

export function createAnimationFrameScheduler(
    callback: () => void,
    shouldSkip?: () => boolean
): AnimationFrameScheduler {
    let frameId: number | null = null;

    return {
        request() {
            if (shouldSkip?.()) {
                return;
            }

            if (frameId !== null) {
                return;
            }

            frameId = window.requestAnimationFrame(() => {
                frameId = null;
                callback();
            });
        },

        cancel() {
            if (frameId === null) {
                return;
            }

            window.cancelAnimationFrame(frameId);
            frameId = null;
        }
    };
}
