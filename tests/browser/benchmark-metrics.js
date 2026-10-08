// Browser fixtures only; this module is not part of the library package.
export function checkScrollOffset(actual, expected) {
    if (!Number.isFinite(actual) || Math.abs(actual - expected) > 1) {
        throw new Error(
            `Benchmark requires real 0/40px scroll offsets: expected ${expected}px, received ${actual}px (tolerance: 1 CSS pixel)`
        );
    }
    return actual !== expected;
}

export function medianOfSortedSamples(samples) {
    if (samples.length === 0) throw new Error('Cannot calculate a median without samples');
    const middle = Math.floor(samples.length / 2);
    return samples.length % 2 ? samples[middle] : (samples[middle - 1] + samples[middle]) / 2;
}

export function countMutationSubtreeNodes(nodes) {
    let count = 0;

    for (const node of nodes) {
        count += 1;
        if (typeof node.querySelectorAll === 'function') {
            count += node.querySelectorAll('*').length;
        }
    }

    return count;
}

export function accumulateDomMutationRecords(target, records) {
    for (const record of records) {
        target.records += 1;
        target.addedNodes += countMutationSubtreeNodes(record.addedNodes);
        target.removedNodes += countMutationSubtreeNodes(record.removedNodes);
    }
}
