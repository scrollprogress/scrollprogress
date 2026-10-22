// Replays the current scroll-sync diagnostic analysis on saved reports. Read-only: the
// JSON files are never modified, and the original capture identity is printed unchanged.
// `evidence` says whether the capture itself is usable; each `analysis.outcome` only
// describes the recorded values. A capture warning such as a resize invalidates the
// analysis references even when the values show no issue.
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import {
    SCROLL_SYNC_ANALYSIS_VERSION,
    analyzeScrollSyncTrace
} from '../tests/browser/diagnostics/scroll-sync-trace-analysis.js';

/** Rebuilds analysis input from one traced result of a saved diagnostic report. */
export function analysisInputFromResult(report, result) {
    return {
        trace: result.trace,
        count: result.count,
        height: result.fixtureSize?.height,
        hostTop: result.hostTop,
        rootSize: result.rootSize,
        frames: report.frames,
        measuredDeliveries: result.deliveries
    };
}

/** Lists reasons why a saved capture cannot serve as evidence, independent of its values. */
export function captureEvidenceProblems(report, tracedResults) {
    const problems = [];
    if (report.status !== 'complete') problems.push(`capture-status: ${report.status}`);
    if (report.metadataError) problems.push(`metadata-error: ${report.metadataError}`);
    if (!report.artifact?.package || !/^[a-f\d]{64}$/.test(report.artifact?.sha256 ?? '')) {
        problems.push('missing-artifact-identity');
    }
    for (const warning of report.warnings ?? []) problems.push(`capture-warning: ${warning}`);
    if (tracedResults.length === 0) problems.push('no-traced-results');
    return problems;
}

export function replayScrollSyncReport(report, { examples = false } = {}) {
    const results = (report.results ?? []).filter((result) => result.trace);
    const problems = captureEvidenceProblems(report, results);
    return {
        capture: {
            kind: report.kind,
            status: report.status,
            startedAt: report.startedAt,
            savedAt: report.savedAt,
            package: report.artifact?.package,
            sha256: report.artifact?.sha256,
            // Integrated captures record diagnosticFixtureSha256; early ones a diagnostic object.
            diagnosticFixtureSha256:
                report.artifact?.diagnosticFixtureSha256 ??
                report.artifact?.diagnostic?.fixtureSha256 ??
                null,
            benchmarkFixtureSha256: report.artifact?.benchmarkFixtureSha256 ?? null,
            traceVersion: report.traceVersion ?? report.diagnosticVersion,
            environment: report.environment,
            warnings: report.warnings ?? [],
            metadataError: report.metadataError ?? null
        },
        evidence: { usable: problems.length === 0, problems },
        analysisVersion: SCROLL_SYNC_ANALYSIS_VERSION,
        results: results.map((result) => {
            const analysis = analyzeScrollSyncTrace(analysisInputFromResult(report, result));
            if (!examples) {
                for (const finding of Object.values(analysis.findings)) delete finding.examples;
            }
            return {
                id: result.id,
                recordedAnalysisVersion: result.analysis?.version ?? null,
                deliveries: result.deliveries,
                analysis
            };
        })
    };
}

function main() {
    const { values, positionals } = parseArgs({
        allowPositionals: true,
        options: { examples: { type: 'boolean', default: false } }
    });
    if (positionals.length === 0) {
        console.error(
            'Usage: node scripts/analyze-scroll-sync-trace.mjs [--examples] <report.json>…'
        );
        process.exitCode = 2;
        return;
    }
    const output = positionals.map((file) => ({
        file,
        ...replayScrollSyncReport(JSON.parse(readFileSync(file, 'utf8')), values)
    }));
    console.log(JSON.stringify(output.length === 1 ? output[0] : output, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    main();
}
