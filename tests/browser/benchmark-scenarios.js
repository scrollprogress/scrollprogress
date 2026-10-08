// Browser benchmark fixtures only; these scenarios are not part of the library package.

const noDebug = Object.freeze({ bridge: false, palette: false, overlay: false });

const coreScenarios = [
    {
        id: 'core-1',
        label: '1 tracker',
        count: 1,
        subscribersPerTracker: 0,
        debug: noDebug
    },
    {
        id: 'core-100',
        label: '100 trackers',
        count: 100,
        subscribersPerTracker: 0,
        debug: noDebug
    },
    {
        id: 'core-300',
        label: '300 trackers',
        count: 300,
        subscribersPerTracker: 0,
        debug: noDebug
    },
    {
        id: 'core-1-subscribers-1000',
        label: '1 tracker + 1,000 subscribers',
        count: 1,
        subscribersPerTracker: 1000,
        debug: noDebug
    }
];

const debugScenarios = [
    {
        id: 'debug-reference-core-100',
        label: '100 trackers: core reference',
        count: 100,
        subscribersPerTracker: 0,
        debug: noDebug
    },
    {
        id: 'debug-bridge-100',
        label: '100 trackers: bridge',
        count: 100,
        subscribersPerTracker: 0,
        debug: { bridge: true, palette: false, overlay: false }
    },
    {
        id: 'debug-bridge-overlay-100',
        label: '100 trackers: bridge + overlay',
        count: 100,
        subscribersPerTracker: 0,
        debug: { bridge: true, palette: false, overlay: true }
    },
    {
        id: 'debug-bridge-palette-100',
        label: '100 trackers: bridge + palette',
        count: 100,
        subscribersPerTracker: 0,
        debug: { bridge: true, palette: true, overlay: false }
    },
    {
        id: 'debug-bridge-palette-overlay-25',
        label: '25 trackers: bridge + palette + overlay',
        count: 25,
        subscribersPerTracker: 0,
        debug: { bridge: true, palette: true, overlay: true }
    },
    {
        id: 'debug-bridge-palette-overlay-100',
        label: '100 trackers: bridge + palette + overlay',
        count: 100,
        subscribersPerTracker: 0,
        debug: { bridge: true, palette: true, overlay: true }
    }
];

export const benchmarkSuites = Object.freeze({
    core: Object.freeze(coreScenarios),
    debug: Object.freeze(debugScenarios)
});

export function assertValidBenchmarkScenario(scenario) {
    if (!scenario || typeof scenario !== 'object') {
        throw new TypeError('Benchmark scenario must be an object');
    }
    if (typeof scenario.id !== 'string' || !scenario.id) {
        throw new TypeError('Benchmark scenario requires an id');
    }
    if (typeof scenario.label !== 'string' || !scenario.label) {
        throw new TypeError(`Benchmark scenario ${scenario.id} requires a label`);
    }
    if (!Number.isInteger(scenario.count) || scenario.count <= 0) {
        throw new RangeError(`Benchmark scenario ${scenario.id} requires a positive count`);
    }
    if (!Number.isInteger(scenario.subscribersPerTracker) || scenario.subscribersPerTracker < 0) {
        throw new RangeError(
            `Benchmark scenario ${scenario.id} requires a non-negative subscriber count`
        );
    }
    for (const feature of ['bridge', 'palette', 'overlay']) {
        if (typeof scenario.debug?.[feature] !== 'boolean') {
            throw new TypeError(`Benchmark scenario ${scenario.id} requires debug.${feature}`);
        }
    }
    if ((scenario.debug.palette || scenario.debug.overlay) && !scenario.debug.bridge) {
        throw new Error(
            `Benchmark scenario ${scenario.id} requires the bridge for palette or overlay data`
        );
    }
    if (
        scenario.trackerOptions !== undefined &&
        (scenario.trackerOptions === null || typeof scenario.trackerOptions !== 'object')
    ) {
        throw new TypeError(`Benchmark scenario ${scenario.id} trackerOptions must be an object`);
    }
    for (const reservedOption of ['root', 'onUpdate']) {
        if (reservedOption in (scenario.trackerOptions ?? {})) {
            throw new Error(
                `Benchmark scenario ${scenario.id} cannot override trackerOptions.${reservedOption}`
            );
        }
    }
}

export function getBenchmarkScenarios(suiteId) {
    const scenarios =
        suiteId === 'all'
            ? [...benchmarkSuites.core, ...benchmarkSuites.debug]
            : benchmarkSuites[suiteId];

    if (!scenarios) {
        throw new Error(`Unknown benchmark suite: ${suiteId}`);
    }

    const ids = new Set();
    for (const scenario of scenarios) {
        assertValidBenchmarkScenario(scenario);
        if (ids.has(scenario.id)) {
            throw new Error(`Duplicate benchmark scenario id: ${scenario.id}`);
        }
        ids.add(scenario.id);
    }

    return [...scenarios];
}
