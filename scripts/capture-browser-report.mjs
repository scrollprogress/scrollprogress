// Run against an existing Chrome headless DevTools endpoint and HTTP fixture server.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, renameSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { captureThemes } from './capture-themes.mjs';
import { getBenchmarkScenarios } from '../tests/browser/benchmark-scenarios.js';

const [
    phase,
    suite,
    run = '01',
    base = 'http://127.0.0.1:4175',
    endpoint = 'http://127.0.0.1:9222',
    consumer
] = process.argv.slice(2);
assert(
    phase && suite,
    'Usage: node scripts/capture-browser-report.mjs <phase> <suite: scroll-sync|core|debug|all|smoke|themes> [run] [base-url] [CDP endpoint] [consumer-directory: required for themes]'
);
async function connect(url, options = {}) {
    const socket = new WebSocket(url);
    const timeoutMs = options.timeoutMs ?? 0;
    let timer;
    try {
        await new Promise((resolve, reject) => {
            socket.onopen = resolve;
            socket.onerror = reject;
            if (timeoutMs)
                timer = setTimeout(
                    () => reject(new Error(`Chrome connection timed out: ${url}`)),
                    timeoutMs
                );
        });
    } catch (error) {
        socket.close();
        throw error;
    } finally {
        clearTimeout(timer);
    }
    let id = 0;
    const pending = new Map();
    socket.onmessage = ({ data }) => {
        const message = JSON.parse(data);
        if (message.id) {
            const pair = pending.get(message.id);
            pending.delete(message.id);
            if (pair) {
                clearTimeout(pair.timer);
                if (message.error) pair.reject(new Error(JSON.stringify(message.error)));
                else pair.resolve(message.result);
            }
        } else options.onEvent?.(message);
    };
    if (timeoutMs)
        socket.onclose = () => {
            for (const pair of pending.values()) {
                clearTimeout(pair.timer);
                pair.reject(new Error('Chrome connection closed'));
            }
            pending.clear();
        };
    return {
        socket,
        send(method, params = {}, requestTimeout = timeoutMs) {
            return new Promise((resolve, reject) => {
                const requestId = ++id;
                const pair = { resolve, reject };
                if (requestTimeout)
                    pair.timer = setTimeout(() => {
                        pending.delete(requestId);
                        reject(new Error(`Chrome request timed out: ${method}`));
                    }, requestTimeout);
                pending.set(requestId, pair);
                socket.send(JSON.stringify({ id: requestId, method, params }));
            });
        }
    };
}
if (suite === 'themes') {
    await captureThemes({ phase, run, base, endpoint, consumer }, connect);
    process.exit(0);
}
assert(['scroll-sync', 'core', 'debug', 'all', 'smoke'].includes(suite), 'Unknown capture suite');
const trackedStatus = execFileSync('git', ['status', '--porcelain', '--untracked-files=no'], {
    encoding: 'utf8'
}).trim();
if (suite !== 'smoke') assert.equal(trackedStatus, '', 'Measurements require clean tracked files');
const head = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const downloads = path.resolve('test-results/downloads');
const reports = path.resolve('test-results/reports');
mkdirSync(downloads, { recursive: true });
mkdirSync(reports, { recursive: true });
const version = await (await fetch(`${endpoint}/json/version`)).json();
const browser = await connect(version.webSocketDebuggerUrl);
let tab;
let page;
try {
    await browser.send('Browser.setDownloadBehavior', {
        behavior: 'allow',
        downloadPath: downloads,
        eventsEnabled: true
    });
    tab = await browser.send('Target.createTarget', { url: 'about:blank' });
    const targets = await (await fetch(`${endpoint}/json/list`)).json();
    page = await connect(targets.find((target) => target.id === tab.targetId).webSocketDebuggerUrl);
    await page.send('Page.enable');
    await page.send('Emulation.setDeviceMetricsOverride', {
        width: 1280,
        height: 900,
        deviceScaleFactor: 1,
        mobile: false
    });
    await page.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    const smoke = suite === 'smoke';
    await page.send('Page.navigate', { url: `${base}/${smoke ? 'index' : 'benchmark'}.html` });
    const evaluate = async (expression) => {
        const result = await page.send('Runtime.evaluate', {
            expression,
            returnByValue: true,
            awaitPromise: true
        });
        if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
        return result.result.value;
    };
    const until = async (fn, timeout = 180000) => {
        const deadline = Date.now() + timeout;
        while (Date.now() < deadline) {
            const value = await fn();
            if (value) return value;
            await delay(250);
        }
        throw new Error('Timed out waiting for browser report');
    };
    await until(() => evaluate('!!document.querySelector("[data-report-field=notes]")'));
    const metadata = {
        browser: version.Browser,
        os: `${os.type()} ${os.release()} ${os.arch()}`,
        device: 'Chrome headless; DevTools Protocol; 1280x900; DPR 1',
        notes: `phase=${phase}; suite=${suite}; head=${head}; headless=true; CPU throttling=4x; Performance trace=none; tracked working tree=${trackedStatus ? 'modified (development smoke)' : 'clean'}`
    };
    await evaluate(
        `for (const [key,value] of Object.entries(${JSON.stringify(metadata)})) { const input = document.querySelector('[data-report-field='+key+']'); input.value=value; input.dispatchEvent(new Event('input', {bubbles:true})); }`
    );
    if (smoke) await evaluate('document.querySelector("#run").click()');
    else await evaluate(`document.querySelector('[data-benchmark-suite="${suite}"]').click()`);
    const report = await until(() =>
        evaluate(
            `(() => { try { const r=JSON.parse(document.querySelector('#results').textContent); return ['complete','failed','passed'].includes(r.status) ? r : null; } catch { return null; } })()`
        )
    );
    assert.equal(report.status, smoke ? 'passed' : 'complete', JSON.stringify(report));
    assert.equal(report.schemaVersion, 1);
    if (!smoke) {
        assert.equal(report.benchmarkVersion, 4);
        assert.deepEqual(report.warnings, []);
        assert.deepEqual(
            report.scenarioIds,
            getBenchmarkScenarios(suite).map((scenario) => scenario.id)
        );
        for (const result of report.results)
            if (suite === 'scroll-sync') {
                assert.equal(result.scrollOffsets.length, 60);
                assert(Math.abs(result.firstOffset - result.startOffset) <= 1);
                assert(Math.abs(result.scrollOffsets[0] - result.startOffset) <= 1);
                result.scrollOffsets.forEach((offset, index) =>
                    assert(Math.abs(offset - result.plannedOffsets[index]) <= 1)
                );
            }
    }
    assert.match(report.artifact.benchmarkFixtureSha256, /^[a-f\d]{64}$/);
    const previous = new Set(readdirSync(downloads));
    await evaluate('document.querySelector("#save-report").click()');
    const filename = await until(() =>
        readdirSync(downloads).find((name) => !previous.has(name) && name.endsWith('.json'))
    );
    const source = path.join(downloads, filename);
    const saved = JSON.parse(readFileSync(source, 'utf8'));
    assert.equal(saved.status, report.status);
    assert.equal(saved.observations.notes, metadata.notes);
    assert.deepEqual(saved.results, report.results);
    const target = path.join(
        reports,
        smoke ? `smoke-${phase}.json` : `benchmark-${suite}-${phase}-run-${run}.json`
    );
    renameSync(source, target);
    console.log(
        JSON.stringify({
            target,
            head,
            browser: version.Browser,
            benchmarkFixtureSha256: saved.artifact.benchmarkFixtureSha256,
            status: saved.status
        })
    );
} finally {
    if (page) page.socket.close();
    if (tab) await browser.send('Target.closeTarget', { targetId: tab.targetId });
    browser.socket.close();
}
