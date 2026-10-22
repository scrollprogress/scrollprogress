import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
    themeCaptureArguments,
    assertAssetHash,
    assertThemeResult,
    themePageFailure
} from '../../scripts/capture-themes.mjs';

import { candidateIdentity, consumerCandidateMetadata } from '../../scripts/candidate-identity.mjs';

const options = {
    phase: 'test',
    run: '01',
    base: 'http://127.0.0.1:4188',
    endpoint: 'http://127.0.0.1:9222',
    consumer: 'consumer'
};

test('theme arguments reject invalid paths, missing consumer and existing reports', (t) => {
    const directory = mkdtempSync(path.join(tmpdir(), 'scrollprogress-theme-args-'));
    t.after(() => rmSync(directory, { recursive: true, force: true }));
    const valid = themeCaptureArguments(options, directory);
    assert.equal(valid.consumer, path.join(directory, 'consumer'));
    for (const override of [
        { phase: '../bad' },
        { phase: '' },
        { run: '../bad' },
        { consumer: '' },
        { base: 'file:///tmp/example' },
        { endpoint: 'invalid' }
    ]) {
        assert.throws(() => themeCaptureArguments({ ...options, ...override }, directory));
    }
    mkdirSync(path.dirname(valid.target), { recursive: true });
    writeFileSync(valid.target, 'earlier evidence');
    assert.throws(() => themeCaptureArguments(options, directory), /already exists/);
    assert.equal(readFileSync(valid.target, 'utf8'), 'earlier evidence');
});

test('candidate identity includes new files, staged changes, deletions and unusual filenames', (t) => {
    const directory = mkdtempSync(path.join(tmpdir(), 'scrollprogress-theme-identity-'));
    t.after(() => rmSync(directory, { recursive: true, force: true }));
    const git = (args) => execFileSync('git', args, { cwd: directory, stdio: 'pipe' });
    git(['init', '--quiet']);
    writeFileSync(path.join(directory, 'tracked.txt'), 'initial');
    writeFileSync(path.join(directory, '.gitignore'), 'ignored/\n');
    git(['add', '.']);
    git([
        '-c',
        'user.name=Fixture',
        '-c',
        'user.email=fixture@example.invalid',
        '-c',
        'commit.gpgsign=false',
        'commit',
        '--quiet',
        '-m',
        'fixture'
    ]);
    assert.deepEqual(candidateIdentity(directory).files, {});
    writeFileSync(path.join(directory, 'tracked.txt'), 'staged');
    git(['add', 'tracked.txt']);
    const filename = 'new harness\nfile.mjs';
    writeFileSync(path.join(directory, filename), 'export const value = 1;');
    mkdirSync(path.join(directory, 'ignored'));
    writeFileSync(path.join(directory, 'ignored/report.json'), 'generated');
    const before = candidateIdentity(directory);
    assert.deepEqual(consumerCandidateMetadata({}, directory), { candidate: before });
    assert.equal(Object.keys(before.files).length, 2);
    assert(before.files[filename]);
    assert.match(before.diff, /staged/);
    writeFileSync(path.join(directory, filename), 'export const value = 2;');
    assert.notEqual(candidateIdentity(directory).files[filename], before.files[filename]);
    rmSync(path.join(directory, 'tracked.txt'));
    assert.equal(candidateIdentity(directory).files['tracked.txt'], null);
});

test('asset and result validation reject stale content and incomplete or wrong-theme results', () => {
    const bytes = Buffer.from('asset');
    const hash = createHash('sha256').update(bytes).digest('hex');
    assertAssetHash(bytes, hash, 'asset.js');
    assert.throws(() => assertAssetHash(Buffer.from('stale'), hash, 'asset.js'), /mismatch/);
    assertThemeResult({ theme: 'paper', passed: true, cleaned: true }, 'paper');
    for (const result of [
        null,
        {},
        { theme: 'neon-grid', passed: true, cleaned: true },
        { theme: 'paper', passed: false, cleaned: true },
        { theme: 'paper', passed: true, cleaned: false }
    ]) {
        assert.throws(() => assertThemeResult(result, 'paper'));
    }
});

test('page failures include exceptions and required assets while ignoring unrelated requests', () => {
    const required = new Set(['http://localhost/app.js']);
    const requests = new Map();
    assert.equal(
        themePageFailure(
            {
                method: 'Network.requestWillBeSent',
                params: { requestId: '1', request: { url: 'http://localhost/app.js' } }
            },
            requests,
            required
        ),
        null
    );
    assert.equal(
        themePageFailure(
            { method: 'Network.loadingFailed', params: { requestId: '1', errorText: 'failed' } },
            requests,
            required
        ).url,
        'http://localhost/app.js'
    );
    assert.equal(
        themePageFailure(
            {
                method: 'Network.responseReceived',
                params: { response: { url: 'http://localhost/app.js', status: 404 } }
            },
            requests,
            required
        ).status,
        404
    );
    assert.equal(
        themePageFailure(
            {
                method: 'Network.responseReceived',
                params: { response: { url: 'http://localhost/favicon.ico', status: 404 } }
            },
            requests,
            required
        ),
        null
    );
    assert.equal(
        themePageFailure(
            { method: 'Network.loadingFailed', params: { requestId: 'unknown' } },
            requests,
            required
        ),
        null
    );
    assert(
        themePageFailure(
            {
                method: 'Runtime.exceptionThrown',
                params: { exceptionDetails: { text: 'runtime failure' } }
            },
            requests,
            required
        )
    );
});

test('external consumer metadata needs neither Git nor an existing checkout', () => {
    assert.deepEqual(consumerCandidateMetadata({ external: true }, '/a/nonexistent/checkout'), {});
});
