import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

export const BENCHMARK_FIXTURE_FILES = Object.freeze([
    'benchmark.html',
    'benchmark.js',
    'benchmark-fixture.js',
    'benchmark-scenarios.js',
    'benchmark-metrics.js',
    'reporting.js'
]);
export const DIAGNOSTIC_FIXTURE_FILES = Object.freeze([
    'scroll-sync-diagnostic.html',
    'diagnostics/scroll-sync-trace.js',
    'diagnostics/scroll-sync-trace-analysis.js'
]);
// The diagnostic reuses the scroll-sync workload modules, so they are part of its identity.
export const DIAGNOSTIC_IDENTITY_FILES = Object.freeze([
    ...DIAGNOSTIC_FIXTURE_FILES,
    'benchmark-fixture.js',
    'benchmark-scenarios.js',
    'benchmark-metrics.js',
    'reporting.js'
]);
export const BROWSER_FIXTURE_FILES = Object.freeze([
    'index.html',
    'smoke.js',
    'manual.html',
    'manual.js',
    ...BENCHMARK_FIXTURE_FILES,
    ...DIAGNOSTIC_FIXTURE_FILES
]);
export function hashFixtureFiles(directory, files = BROWSER_FIXTURE_FILES) {
    const hash = createHash('sha256');
    for (const file of [...files].sort()) {
        hash.update(file)
            .update('\0')
            .update(readFileSync(path.join(directory, file)));
    }
    return hash.digest('hex');
}
export function copyFixtureFiles(source, destination, files = BROWSER_FIXTURE_FILES) {
    for (const file of files) {
        const target = path.join(destination, file);
        mkdirSync(path.dirname(target), { recursive: true });
        writeFileSync(target, readFileSync(path.join(source, file)));
    }
}
export function fixtureIdentity(directory) {
    return {
        fixtureSha256: hashFixtureFiles(directory),
        benchmarkFixtureSha256: hashFixtureFiles(directory, BENCHMARK_FIXTURE_FILES),
        diagnosticFixtureSha256: hashFixtureFiles(directory, DIAGNOSTIC_IDENTITY_FILES)
    };
}
