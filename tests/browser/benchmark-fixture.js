// Explicit dependencies keep scenario isolation testable without browser globals.
export function scrollSyncOffset(index, frames, startOffset, travelDistance) {
    const peak = Math.floor((frames - 1) / 2);
    const fraction = index <= peak ? index / peak : (frames - 1 - index) / (frames - 1 - peak);
    return startOffset + travelDistance * fraction;
}

export async function withBenchmarkFixture(
    { content, createContent, setOffset, getOffset, startOffset, stabilize },
    measure
) {
    const resources = [];
    let measurementError;
    let result;
    const cleanupErrors = [];
    try {
        setOffset(startOffset);
        content.replaceChildren();
        createContent();
        setOffset(startOffset);
        await stabilize();
        const firstOffset = getOffset();
        if (Math.abs(firstOffset - startOffset) > 1) throw new Error('Invalid first scroll offset');
        result = await measure({ resources, firstOffset });
    } catch (error) {
        measurementError = error;
    } finally {
        for (const resource of resources.reverse()) {
            try {
                resource.destroy();
            } catch (error) {
                cleanupErrors.push(error);
            }
        }
        try {
            content.replaceChildren();
        } catch (error) {
            cleanupErrors.push(error);
        }
        try {
            setOffset(startOffset);
        } catch (error) {
            cleanupErrors.push(error);
        }
    }
    if (measurementError !== undefined) {
        if (cleanupErrors.length)
            throw new AggregateError(
                [measurementError, ...cleanupErrors],
                'Measurement and cleanup failed'
            );
        throw measurementError;
    }
    if (cleanupErrors.length) throw new AggregateError(cleanupErrors, 'Benchmark cleanup failed');
    return result;
}
