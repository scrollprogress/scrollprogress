import assert from 'node:assert/strict';
import test from 'node:test';
import { Window } from 'happy-dom';
import { createBrowserReport } from '../../tests/browser/reporting.js';

function page(
    t,
    metadata = { package: 'example@1.0.0-rc.1', sha256: 'a'.repeat(64), mode: 'project-local' }
) {
    const window = new Window();
    window.document.body.innerHTML =
        '<button id="save-report" disabled>Save</button><p id="report-status"></p><fieldset id="report-controls"></fieldset><pre id="results"></pre>';
    const replacements = {
        window,
        document: window.document,
        navigator: window.navigator,
        fetch: async () => ({ ok: true, json: async () => metadata })
    };
    for (const [key, value] of Object.entries(replacements)) {
        const descriptor = Object.getOwnPropertyDescriptor(globalThis, key);
        Object.defineProperty(globalThis, key, { configurable: true, value, writable: true });
        t.after(() =>
            descriptor ? Object.defineProperty(globalThis, key, descriptor) : delete globalThis[key]
        );
    }
    t.after(() => window.happyDOM.abort());
    t.mock.timers.enable({ apis: ['setTimeout'] });
    let blob, download;
    t.mock.method(URL, 'createObjectURL', (value) => {
        blob = value;
        return 'blob:report';
    });
    const revoke = t.mock.method(URL, 'revokeObjectURL', () => {});
    t.mock.method(window.HTMLAnchorElement.prototype, 'click', function () {
        download = this.download;
    });
    return {
        window,
        output: window.document.querySelector('#results'),
        save: window.document.querySelector('#save-report'),
        payload: async () => JSON.parse(await blob.text()),
        filename: () => download,
        revoke
    };
}

test('downloads identified smoke results and current notes without mutating completed test data', async (t) => {
    const ui = page(t);
    const reporting = await createBrowserReport('smoke', ui.output);
    assert(ui.save.disabled);
    reporting.start();
    const results = [{ name: 'Example', result: 'PASS' }];
    reporting.publish('passed', { results, passed: true });
    results[0].result = 'FAIL';
    ui.window.document.querySelector('[name="notes"]').value = 'A manually recorded observation';
    ui.save.click();
    const saved = await ui.payload();
    assert.equal(saved.results[0].result, 'PASS');
    assert.equal(saved.observations.notes, 'A manually recorded observation');
    assert.equal(saved.artifact.sha256, 'a'.repeat(64));
    assert.equal(saved.status, 'passed');
    assert(saved.savedAt && saved.startedAt && saved.environment.viewport);
    assert.match(ui.filename(), /^scrollprogress-smoke-.*\.json$/);
    assert.equal(ui.window.document.querySelectorAll('a').length, 0);
    t.mock.timers.tick(1000);
    assert.equal(ui.revoke.mock.callCount(), 1);
    reporting.start();
    assert(ui.save.disabled, 'rerun must not download the previous completed result');
    reporting.publish('running', { results: [] });
    ui.save.click();
    assert.equal((await ui.payload()).status, 'running');
    assert.deepEqual((await ui.payload()).results, []);
});

test('failed and partial benchmark runs remain downloadable', async (t) => {
    const ui = page(t);
    const reporting = await createBrowserReport('benchmark', ui.output);
    reporting.start();
    reporting.publish('failed', {
        results: [{ count: 1 }],
        error: 'Deliberate failure',
        warnings: ['Hidden tab']
    });
    ui.save.click();
    const saved = await ui.payload();
    assert.equal(saved.status, 'failed');
    assert.equal(saved.error, 'Deliberate failure');
    assert.equal(saved.results.length, 1);
});

test('manual download samples the current diagnostic state and preserves untested checklist items', async (t) => {
    const ui = page(t);
    const field = ui.window.document.createElement('select');
    field.dataset.reportField = 'viewport-x';
    field.innerHTML = '<option>not-tested</option><option>pass</option>';
    ui.window.document.querySelector('#report-controls').append(field);
    let progress = 0;
    const reporting = await createBrowserReport('manual', ui.output, () => ({
        currentSnapshot: { progress }
    }));
    reporting.start();
    reporting.publish('manual-session');
    progress = 0.5;
    ui.save.click();
    const saved = await ui.payload();
    assert.equal(saved.currentSnapshot.progress, 0.5);
    assert.equal(saved.observations['viewport-x'], 'not-tested');
    assert.equal(saved.status, 'manual-session');
    assert.equal(saved.passed, undefined);
});

test('missing package identity is explicitly recorded instead of claiming a verified artifact', async (t) => {
    const ui = page(t, {});
    const reporting = await createBrowserReport('smoke', ui.output);
    reporting.start();
    reporting.publish('failed', { results: [] });
    ui.save.click();
    const saved = await ui.payload();
    assert.equal(saved.artifact, null);
    assert.match(saved.metadataError, /Invalid package metadata/);
    assert.match(
        ui.window.document.querySelector('#report-status').textContent,
        /identity unavailable/
    );
});

test('download failure leaves a readable report and a recovery instruction', async (t) => {
    const ui = page(t);
    const reporting = await createBrowserReport('smoke', ui.output);
    reporting.start();
    reporting.publish('failed', { results: [] });
    t.mock.method(URL, 'createObjectURL', () => {
        throw new Error('Download unavailable');
    });
    ui.save.click();
    assert.equal(JSON.parse(ui.output.textContent).status, 'failed');
    assert.match(
        ui.window.document.querySelector('#report-status').textContent,
        /Copy the displayed JSON/
    );
});
