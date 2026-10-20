import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';

export const BENCHMARK_FIXTURE_FILES = Object.freeze([
    'benchmark.html',
    'benchmark.js',
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
    ...BENCHMARK_FIXTURE_FILES
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
