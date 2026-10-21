import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { setTimeout as delay } from 'node:timers/promises';
import { candidateIdentity } from './candidate-identity.mjs';

export function themeCaptureArguments(
    { phase, run, base, endpoint, consumer },
    directory = process.cwd()
) {
    assert(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(phase ?? ''), 'Invalid themes phase');
    assert(/^\d+$/.test(run ?? ''), 'Invalid themes run');
    assert(consumer, 'Themes requires a sixth consumer-directory argument');
    for (const url of [base, endpoint]) {
        const parsed = new URL(url);
        assert(
            ['http:', 'https:'].includes(parsed.protocol) && !parsed.username && !parsed.password,
            'Expected an HTTP URL'
        );
    }
    const target = path.join(
        directory,
        'test-results',
        'reports',
        `themes-${phase}-run-${run}.json`
    );
    assert(!existsSync(target), `Report already exists: ${target}`);
    return { target, consumer: path.resolve(directory, consumer) };
}

export function assertAssetHash(bytes, expected, identity) {
    assert.match(expected, /^[a-f\d]{64}$/);
    assert.equal(
        createHash('sha256').update(bytes).digest('hex'),
        expected,
        `Served asset mismatch: ${identity}`
    );
}

export function assertThemeResult(result, theme) {
    assert.equal(result?.theme, theme, 'Wrong or missing theme result');
    assert.equal(result.passed, true, JSON.stringify(result));
    assert.equal(result.cleaned, true, 'Theme DOM cleanup failed');
}

export function themePageFailure(event, requests, required) {
    const { method, params } = event;
    if (method === 'Runtime.exceptionThrown') return { method, details: params.exceptionDetails };
    if (method === 'Network.requestWillBeSent') requests.set(params.requestId, params.request.url);
    if (method === 'Network.loadingFailed' && required.has(requests.get(params.requestId))) {
        return { method, url: requests.get(params.requestId), error: params.errorText };
    }
    if (
        method === 'Network.responseReceived' &&
        required.has(params.response.url) &&
        params.response.status >= 400
    ) {
        return { method, url: params.response.url, status: params.response.status };
    }
    return null;
}

export async function captureThemes(options, connect) {
    const { target, consumer } = themeCaptureArguments(options);
    const report = {
        kind: 'themes',
        status: 'failed',
        startedAt: new Date().toISOString(),
        phase: options.phase,
        run: options.run,
        base: options.base,
        os: `${os.type()} ${os.release()} ${os.arch()}`,
        headless: true,
        viewport: { width: 1280, height: 900, deviceScaleFactor: 1 },
        cpuThrottling: 4,
        candidate: candidateIdentity(),
        results: [],
        errors: []
    };
    let browser, page, tab;
    let rejectPage;
    let activeErrors = [];
    let required = new Set();
    let requests = new Map();
    const fetchChecked = async (url) => {
        const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
        assert.equal(response.status, 200, `HTTP ${response.status}: ${url}`);
        return response;
    };
    const send = async (connection, method, params = {}) => {
        report.operation = method;
        return connection.send(method, params);
    };
    try {
        const consumerReport = JSON.parse(readFileSync(path.join(consumer, 'report.json'), 'utf8'));
        report.artifact = {
            package: consumerReport.package,
            sha256: consumerReport.sha256,
            productionThemes: consumerReport.productionThemes
        };
        assert.deepEqual(
            consumerReport.candidate,
            report.candidate,
            'Consumer is stale: regenerate after the last source change'
        );
        // Validate the complete served build before opening any theme page.
        for (const theme of ['paper', 'neon-grid']) {
            const entry = consumerReport.productionThemes[theme];
            for (const [file, hash] of Object.entries(entry.assets)) {
                assert(
                    !file.split('/').includes('..') && !path.isAbsolute(file),
                    'Invalid asset path'
                );
                const url = `${options.base.replace(/\/$/, '')}/${theme}/${file}`;
                report.operation = `preflight ${url}`;
                const response = await fetchChecked(url);
                assertAssetHash(Buffer.from(await response.arrayBuffer()), hash, url);
            }
        }
        report.preflightPassed = true;
        const version = await (await fetchChecked(`${options.endpoint}/json/version`)).json();
        report.browser = version.Browser;
        browser = await connect(version.webSocketDebuggerUrl, { timeoutMs: 10000 });
        tab = await send(browser, 'Target.createTarget', { url: 'about:blank' });
        const targets = await (await fetchChecked(`${options.endpoint}/json/list`)).json();
        const targetInfo = targets.find((item) => item.id === tab.targetId);
        assert(targetInfo, 'Missing created Chrome target');
        page = await connect(targetInfo.webSocketDebuggerUrl, {
            timeoutMs: 10000,
            onEvent(event) {
                const error = themePageFailure(event, requests, required);
                if (error) {
                    activeErrors.push(error);
                    rejectPage?.(error);
                }
            }
        });
        await send(page, 'Page.enable');
        await send(page, 'Runtime.enable');
        await send(page, 'Network.enable');
        await send(page, 'Emulation.setDeviceMetricsOverride', {
            ...report.viewport,
            mobile: false
        });
        await send(page, 'Emulation.setCPUThrottlingRate', { rate: 4 });
        for (const theme of ['paper', 'neon-grid']) {
            report.theme = theme;
            const entry = consumerReport.productionThemes[theme];
            const url = `${options.base.replace(/\/$/, '')}/${theme}/index.html`;
            report.url = url;
            required = new Set(Object.keys(entry.assets).map((file) => new URL(file, url).href));
            requests = new Map();
            activeErrors = [];
            const failure = new Promise((resolve) => {
                rejectPage = resolve;
            });
            const pageFailure = failure.then((error) => {
                throw new Error(`Theme page failure: ${JSON.stringify(error)}`);
            });
            let pageTimer;
            const timeout = new Promise((_, reject) => {
                pageTimer = setTimeout(
                    () => reject(new Error(`Theme result timed out: ${theme} ${url}`)),
                    30000
                );
            });
            const checked = (operation) => Promise.race([operation, pageFailure, timeout]);
            try {
                const navigation = await checked(send(page, 'Page.navigate', { url }));
                assert(!navigation.errorText, navigation.errorText);
                report.navigated = true;
                let result;
                while (true) {
                    const evaluation = await checked(
                        send(page, 'Runtime.evaluate', {
                            expression: 'globalThis.scrollprogressThemeResult',
                            returnByValue: true
                        })
                    );
                    assert(
                        !evaluation.exceptionDetails,
                        JSON.stringify(evaluation.exceptionDetails)
                    );
                    result = evaluation.result.value;
                    if (result?.theme === theme) break;
                    await checked(delay(100));
                }
                assertThemeResult(result, theme);
                await checked(delay(100));
                report.results.push({ theme, url, result, errors: [...activeErrors] });
            } finally {
                clearTimeout(pageTimer);
            }
        }
        report.status = 'passed';
    } catch (error) {
        report.error = `${report.operation ?? 'prepare'}: ${error.message}`;
        report.errors.push(...activeErrors);
    } finally {
        if (page) page.socket.close();
        if (browser) {
            try {
                if (tab) await browser.send('Target.closeTarget', { targetId: tab.targetId }, 5000);
            } catch (error) {
                report.status = 'failed';
                report.cleanupError = error.message;
            } finally {
                browser.socket.close();
            }
        }
        report.finishedAt = new Date().toISOString();
        mkdirSync(path.dirname(target), { recursive: true });
        writeFileSync(target, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
    }
    console.log(JSON.stringify({ target, status: report.status, error: report.error }));
    assert.equal(report.status, 'passed', report.error ?? report.cleanupError);
}
