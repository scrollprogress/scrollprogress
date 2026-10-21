export function runDebugCleanup(callbacks: readonly (() => void)[]): void {
    let hasError = false;
    let firstError: unknown;

    for (const callback of callbacks) {
        try {
            callback();
        } catch (error) {
            if (!hasError) {
                hasError = true;
                firstError = error;
            }
        }
    }

    if (hasError) {
        throw firstError;
    }
}
