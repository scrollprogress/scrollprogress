import { createBrowserReport } from './reporting.js';
import { readScrollProgress, trackScrollProgress } from '@scrollprogress/scrollprogress';
import { debugScrollProgress } from '@scrollprogress/scrollprogress/debug';
import {
    getScrollProgressDebugRegistryState,
    registerScrollProgressDebugItem,
    subscribeScrollProgressDebugRegistry
} from '@scrollprogress/scrollprogress/debug/registry';
import { createDebugPalette } from '@scrollprogress/scrollprogress/debug/palette';
import { createDebugOverlay } from '@scrollprogress/scrollprogress/debug/overlay';
import { createDebugConsoleLogger } from '@scrollprogress/scrollprogress/debug/console';

const output = document.querySelector('#results');
const fixture = document.querySelector('#fixtures');
const button = document.querySelector('#run');
const reporting = await createBrowserReport('smoke', output);
const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));
async function settle() {
    await frame();
    await frame();
    await frame();
}
async function until(condition) {
    const deadline = performance.now() + 3000;
    while (!condition()) {
        if (performance.now() > deadline)
            throw new Error('Timed out waiting for native observation');
        await frame();
    }
}
function assert(value, message) {
    if (!value) throw new Error(message);
}
function near(a, b) {
    assert(Math.abs(a - b) < 0.00001, `${a} != ${b}`);
}

async function run() {
    button.disabled = true;
    reporting.start();
    const results = [];
    const resources = [];
    let attemptedTests = 0;
    async function test(name, check) {
        attemptedTests += 1;

        try {
            await check();
            results.push({ name, result: 'PASS' });
        } catch (error) {
            results.push({ name, result: 'FAIL', message: String(error) });
        }
        reporting.publish('running', { results });
    }
    try {
        fixture.innerHTML =
            '<div id="root" style="width:300px;height:200px;border:10px solid #496d78;overflow:auto;position:relative"><div style="width:1000px;height:1200px"><div id="target" style="position:relative;top:160px;left:160px;width:100px;height:100px;background:#68c6bb"></div></div></div>';
        const root = fixture.querySelector('#root');
        const target = fixture.querySelector('#target');
        const keep = (value) => {
            resources.push(value);
            return value;
        };
        let tracker;
        await test('Native IO, bordered custom root y, CSS and immediate subscriber', async () => {
            tracker = keep(
                trackScrollProgress(target, {
                    root,
                    start: 0.8,
                    end: 0.2,
                    cssVar: '--progress',
                    observerThreshold: [0, 0.5, 1]
                })
            );
            await until(() => tracker.getState().isTracking);
            root.scrollTop = 70;
            await settle();
            near(
                tracker.getState().progress,
                readScrollProgress(target, { ...tracker.getConfig(), axis: 'y', root })
            );
            near(Number(target.style.getPropertyValue('--progress')), tracker.getState().progress);
            let called = 0;
            const unsubscribe = tracker.subscribe(() => called++);
            assert(called === 1, 'Immediate subscription');
            unsubscribe();
        });
        await test('Measured non-positive range warning and step fallback', async () => {
            const host = document.createElement('div');
            const localTrackers = [];
            const expectedTargets = new Set();
            const warnings = [];
            const unexpected = [];
            const originalWarn = console.warn;
            console.warn = (...args) => {
                if (
                    String(args[0]).includes('[scroll-progress]') &&
                    String(args[0]).includes('D <= 0') &&
                    expectedTargets.has(args[1])
                ) {
                    warnings.push(args);
                } else {
                    unexpected.push(args);
                    originalWarn.apply(console, args);
                }
            };
            const create = (element, options) => {
                expectedTargets.add(element);
                const local = keep(trackScrollProgress(element, options));
                localTrackers.push(local);
                return local;
            };
            const count = (element) => warnings.filter((args) => args[1] === element).length;
            try {
                document.body.append(host);
                const story = document.createElement('div');
                story.style.cssText = `position:fixed;top:-10px;left:0;width:50px;height:${window.innerHeight + 100}px`;
                host.append(story);
                const reading = create(story, { start: 0, end: 1 });
                await settle();
                assert(count(story) === 0, 'Tall reading-progress target stays silent');
                story.style.height = '50px';
                reading.update({});
                await settle();
                assert(count(story) === 1, 'Short reading-progress target warns once');
                near(reading.getState().progress, 1);
                assert(
                    warnings.find((args) => args[1] === story)[3] === 50 - window.innerHeight,
                    'Logged distance uses measured viewport height'
                );

                const panel = document.createElement('div');
                panel.style.cssText =
                    'position:fixed;top:0;left:0;width:200px;height:100px;border:10px solid;overflow:auto';
                panel.innerHTML =
                    '<div style="width:1000px;height:100px;position:relative"><div style="position:relative;left:-10px;width:100px;height:20px"></div><div style="display:none;position:relative;left:-10px;width:50px;height:20px"></div></div>';
                host.append(panel);
                const [horizontal, hidden] = panel.firstElementChild.children;
                const x = create(horizontal, { root: panel, axis: 'x', start: 0, end: 1 });
                const revealed = create(hidden, { root: panel, axis: 'x', start: 0, end: 1 });
                assert(count(horizontal) === 1, 'Bordered horizontal root warns at creation');
                near(x.getState().progress, 1);
                assert(count(hidden) === 0, 'Boxless target stays silent');
                hidden.style.display = 'block';
                revealed.update({});
                await settle();
                assert(count(hidden) === 1, 'Revealed measurable target warns');
                near(revealed.getState().progress, 1);
                for (const local of localTrackers) local.update({});
                panel.scrollLeft = 20;
                await settle();
                assert(warnings.length === 3, 'Repeated measurements do not repeat warnings');
                assert(unexpected.length === 0, 'No unexpected diagnostics');
            } finally {
                try {
                    for (const local of localTrackers) local.destroy();
                } finally {
                    console.warn = originalWarn;
                    host.remove();
                }
            }
        });
        await test('Hidden, detached and boxless targets preserve progress and once', async () => {
            const sample = document.createElement('div');
            sample.style.cssText = 'width:50px;height:50px';
            root.firstElementChild.append(sample);
            const local = keep(
                trackScrollProgress(sample, { root, once: true, cssVar: '--box-progress' })
            );
            await until(() => local.getState().isTracking);
            const progress = local.getState().progress;
            for (const display of ['none', 'contents']) {
                sample.style.display = display;
                local.update({});
                await settle();
                near(local.getState().progress, progress);
                near(Number(sample.style.getPropertyValue('--box-progress')), progress);
                assert(local.getState().progressDirection === 'none', 'No measurement direction');
                assert(
                    readScrollProgress(sample, local.getConfig()) === null,
                    'Boxless direct read'
                );
            }
            sample.style.display = 'block';
            sample.parentElement.style.display = 'none';
            local.update({});
            await settle();
            near(local.getState().progress, progress);
            assert(readScrollProgress(sample, local.getConfig()) === null, 'Hidden ancestor read');
            sample.parentElement.style.display = '';
            sample.remove();
            local.update({});
            await settle();
            assert(readScrollProgress(sample, local.getConfig()) === null, 'Detached read');
            root.firstElementChild.append(sample);
            sample.style.display = 'block';
            sample.style.visibility = 'hidden';
            sample.style.height = '0';
            local.update({});
            await settle();
            assert(
                typeof readScrollProgress(sample, local.getConfig()) === 'number',
                'Zero-height visibility-hidden box'
            );
            assert(local.getState().isTracking, 'Tracker survived hidden and detached updates');
            local.destroy();
            sample.remove();
            const hidden = document.createElement('div');
            hidden.style.display = 'none';
            root.append(hidden);
            const initial = keep(trackScrollProgress(hidden, { root, inverted: true, once: true }));
            near(initial.getState().progress, 1);
            initial.destroy();
            hidden.remove();
        });
        await test('Viewport aliases preserve state, lifecycle and configured root identity', async () => {
            const events = [];
            const local = keep(
                trackScrollProgress(target, {
                    onEnter: () => events.push('enter'),
                    onLeave: () => events.push('leave'),
                    requireRootVisible: true
                })
            );
            const bridge = keep(debugScrollProgress(local));
            const overlay = keep(createDebugOverlay({ visibleLayers: ['root'] }));
            await settle();
            const before = local.getState();
            const eventCount = events.length;
            for (const alias of [document, document.documentElement, null]) {
                local.update({ root: alias });
                assert(local.getState() !== null, 'Alias state retained');
                await settle();
                assert(local.getConfig().root === alias, 'Configured identity');
                near(local.getState().progress, before.progress);
                near(
                    local.getState().progress,
                    readScrollProgress(target, { ...local.getConfig(), root: null })
                );
                assert(local.getState().isRootVisible, 'Viewport visibility');
                assert(
                    getScrollProgressDebugRegistryState().items[0].root === alias,
                    'Bridge preserves configured alias'
                );
                const layer = document.querySelector('[data-layer="root"]');
                assert(
                    layer.style.width === `${window.innerWidth}px` &&
                        layer.style.height === `${window.innerHeight}px`,
                    'Overlay uses viewport geometry'
                );
            }
            assert(events.length === eventCount, 'No alias lifecycle transitions');
            overlay.destroy();
            bridge.destroy();
            local.destroy();
        });
        await test('Effective root and visibility reconfiguration balance native lifecycle', async () => {
            root.scrollIntoView({ block: 'center' });
            await settle();
            const events = [];
            const local = keep(
                trackScrollProgress(target, {
                    root,
                    onEnter: () => events.push('enter'),
                    onLeave: () => events.push('leave')
                })
            );
            await until(() => local.getState().isTracking);
            local.update({ root: null });
            assert(local.getState() === null, 'Effective root state temporarily null');
            await until(() => events.length >= 3);
            assert(events.join(',') === 'enter,leave,enter', 'Balanced root lifecycle');
            local.update({ requireRootVisible: true });
            assert(local.getState() === null, 'Visibility reconfiguration state temporarily null');
            await settle();
            assert(events.length === 3, 'Visible viewport causes no extra transition');
            local.destroy();
        });
        await test('Expected pending-root-leave error preserves state and allows the next enter', async () => {
            root.scrollIntoView({ block: 'center' });
            await settle();
            const expected = new Error('scrollprogress expected pending-root-leave smoke failure');
            const events = [];
            let caught = 0;
            let local;
            const onError = (event) => {
                if (event.error === expected) {
                    caught++;
                    event.preventDefault();
                }
            };
            window.addEventListener('error', onError);
            try {
                local = keep(
                    trackScrollProgress(target, {
                        root,
                        cssVar: '--pending-leave-progress',
                        onEnter: () => events.push('enter'),
                        onLeave: () => {
                            events.push('leave');
                            const state = local.getState();
                            assert(state !== null, 'State committed before pending leave');
                            near(
                                Number(target.style.getPropertyValue('--pending-leave-progress')),
                                state.progress
                            );
                            throw expected;
                        }
                    })
                );
                await until(() => events.length === 1);
                local.update({ root: null });
                await until(() => caught === 1);
                assert(local.getState() !== null, 'State survives expected callback error');
                local.update({});
                await until(() => events.length >= 3);
                await settle();
                assert(events.join(',') === 'enter,leave,enter', 'No duplicate lifecycle delivery');
                assert(caught === 1, 'Only the intentional error reached window');
            } finally {
                local?.destroy();
                window.removeEventListener('error', onError);
                target.style.removeProperty('--pending-leave-progress');
            }
        });
        await test('Native nested scrolling and jumps synchronize outside observation on both roots', async () => {
            for (const custom of [false, true]) {
                const shell = document.createElement('div');
                shell.style.cssText = 'height:200px;width:300px;overflow:auto;position:relative';
                shell.innerHTML =
                    '<main style="height:180px;overflow:auto;position:relative"><div style="height:1800px;position:relative"><div style="position:absolute;top:500px;height:60px;width:60px"></div></div></main>';
                fixture.append(shell);
                shell.scrollIntoView({ block: 'center' });
                await settle();
                const middle = shell.firstElementChild;
                const sample = middle.firstElementChild.firstElementChild;
                const events = [];
                const local = keep(
                    trackScrollProgress(sample, {
                        root: custom ? shell : null,
                        onEnter: () => events.push('enter')
                    })
                );
                await settle();
                middle.scrollTop = 1400;
                await settle();
                near(local.getState().progress, readScrollProgress(sample, local.getConfig()));
                near(local.getState().progress, 1);
                assert(events.length === 0, 'Jump does not synthesize enter');
                local.destroy();
                shell.remove();
            }
        });
        await test('Extended once range completes outside observation after a native entry', async () => {
            const shell = document.createElement('div');
            shell.style.cssText = 'height:200px;width:300px;overflow:auto;position:relative';
            shell.innerHTML =
                '<div style="height:1800px;position:relative"><div style="position:absolute;top:100px;height:60px;width:60px"></div></div>';
            fixture.append(shell);
            const sample = shell.firstElementChild.firstElementChild;
            const local = keep(
                trackScrollProgress(sample, { root: shell, start: 1.5, end: -0.3, once: true })
            );
            let destroyed = false;
            local.onDestroy(() => {
                destroyed = true;
            });
            await until(() => local.getState().isTracking);
            shell.scrollTop = 1400;
            await until(() => destroyed);
            near(local.getState().progress, 1);
            shell.remove();
        });
        await test('Native invalid margin and threshold updates are atomic', async () => {
            for (const options of [
                { rootMargin: 'invalid' },
                { observerThreshold: 2 },
                { observerThreshold: NaN },
                { observerThreshold: [0, Infinity] }
            ]) {
                const before = JSON.stringify(tracker.getConfig(), (key, value) =>
                    key === 'root' ? null : value
                );
                let threw = false;
                try {
                    tracker.update(options);
                } catch {
                    threw = true;
                }
                assert(threw, `Native rejection: ${JSON.stringify(options)}`);
                assert(
                    before ===
                        JSON.stringify(tracker.getConfig(), (key, value) =>
                            key === 'root' ? null : value
                        ),
                    'Config retained'
                );
            }
            root.scrollTop = 90;
            await settle();
            near(
                tracker.getState().progress,
                readScrollProgress(target, { ...tracker.getConfig(), axis: 'y', root })
            );
        });
        await test('Horizontal update, inversion, unchanged explicit notification and native resize', async () => {
            tracker.update({
                axis: 'x',
                inverted: true,
                rootMargin: '10px',
                observerThreshold: []
            });
            root.scrollLeft = 90;
            await settle();
            near(
                tracker.getState().progress,
                1 - readScrollProgress(target, { ...tracker.getConfig(), axis: 'x', root })
            );
            let calls = 0;
            const unsubscribe = tracker.subscribe(() => calls++);
            tracker.update({});
            tracker.update({});
            await settle();
            assert(calls === 2, `Expected coalesced subscriber delivery, got ${calls}`);
            unsubscribe();
            target.style.width = '140px';
            await settle();
            near(
                tracker.getState().progress,
                1 - readScrollProgress(target, { ...tracker.getConfig(), axis: 'x', root })
            );
        });
        await test('Stable debug entries share a registry and tear down', async () => {
            const bridge = keep(debugScrollProgress(tracker, { label: 'Installed smoke' }));
            const palette = keep(createDebugPalette());
            const overlay = keep(
                createDebugOverlay({
                    visibleLayers: ['target', 'progress', 'root', 'margin', 'intersection']
                })
            );
            const logger = keep(createDebugConsoleLogger());
            await settle();
            const state = getScrollProgressDebugRegistryState();
            assert(
                state.items.length === 1 && state.items[0].label === 'Installed smoke',
                'Shared registry'
            );
            const panel = document.querySelector('[data-scroll-progress-debug-palette]');
            assert(panel?.textContent.includes('Installed smoke'), 'Palette content');
            const list = panel.querySelector('.spdp-tracker-list');
            const listStyle = getComputedStyle(list);
            assert(
                listStyle.listStyleType === 'none',
                'Palette removes native list markers without Tailwind'
            );
            for (const property of [
                'marginTop',
                'marginRight',
                'marginBottom',
                'marginLeft',
                'paddingTop',
                'paddingRight',
                'paddingBottom',
                'paddingLeft'
            ]) {
                assert(
                    listStyle[property] === '0px',
                    `Palette resets native list spacing: ${property}`
                );
            }
            assert(
                list.getAttribute('role') === 'list',
                'Unstyled list retains explicit semantics'
            );
            const focused = panel.querySelector('button:not([disabled])');
            focused.focus();
            const action = focused.dataset.scrollProgressDebugAction;
            tracker.update({});
            await settle();
            assert(
                document.activeElement?.dataset.scrollProgressDebugAction === action,
                'Focus restored'
            );
            assert(
                document.querySelector('.scroll-progress-debug-overlay [data-layer="root"]').style
                    .width === `${root.clientWidth}px`,
                'Overlay client box'
            );
            overlay.destroy();
            palette.destroy();
            logger.destroy();
            bridge.destroy();
            assert(
                !document.querySelector('[data-scroll-progress-debug-palette]'),
                'Palette removed'
            );
            assert(!document.querySelector('.scroll-progress-debug-overlay'), 'Overlay removed');
            assert(getScrollProgressDebugRegistryState().items.length === 0, 'Bridge removed');
        });
        await test('Debug subscriber errors reach window without rollback, interruption or automatic unsubscribe', async () => {
            const errors = [
                new Error('expected first debug failure'),
                new Error('expected second debug failure')
            ];
            const reported = [];
            const snapshots = [];
            const unsubscribes = [];
            let armed = false;
            let item;
            const onError = (event) => {
                if (errors.includes(event.error)) {
                    reported.push(event.error);
                    event.preventDefault();
                }
            };
            window.addEventListener('error', onError);
            try {
                for (const error of errors) {
                    unsubscribes.push(
                        subscribeScrollProgressDebugRegistry(() => {
                            if (armed) throw error;
                        })
                    );
                }
                unsubscribes.push(
                    subscribeScrollProgressDebugRegistry((state) => snapshots.push(state))
                );
                snapshots.length = 0;
                armed = true;
                item = registerScrollProgressDebugItem({
                    element: target,
                    label: 'Registry errors'
                });
                assert(
                    snapshots.length === 1 && snapshots[0].items[0].id === item.id,
                    'Later subscriber synchronously received the committed item'
                );
                assert(reported.length === 0, 'Reporting is deferred beyond registration');
                await until(() => reported.length === 2);
                assert(
                    getScrollProgressDebugRegistryState().items[0].id === item.id,
                    'Registration survived notification errors'
                );
                item.update({ label: 'Still subscribed' });
                assert(
                    snapshots.length === 2 && snapshots[1].items[0].label === 'Still subscribed',
                    'Later updates remain synchronous'
                );
                await until(() => reported.length === 4);
                assert(
                    reported.every((error, index) => error === errors[index % 2]),
                    'All original errors reported in order; failing subscribers retained'
                );
            } finally {
                for (const unsubscribe of unsubscribes) unsubscribe();
                item?.destroy();
                window.removeEventListener('error', onError);
            }
        });
        await test('Destroy retains CSS, is idempotent, and debug can attach afterward', async () => {
            const css = target.style.getPropertyValue('--progress');
            tracker.destroy();
            tracker.destroy();
            tracker.update({ axis: 'y' });
            const bridge = debugScrollProgress(tracker);
            bridge.destroy();
            assert(
                getScrollProgressDebugRegistryState().items.length === 0,
                'No destroyed-tracker leak'
            );
            assert(target.style.getPropertyValue('--progress') === css, 'CSS persists');
            tracker.subscribe(() => {
                throw new Error('Destroyed subscriber invoked');
            });
            await settle();
        });
        await test('Native rAF error preserves another tracker and once cleanup (ordinary/inverted)', async () => {
            root.scrollTop = 200;
            root.scrollLeft = 0;
            target.style.top = '0px';
            target.style.left = '0px';
            await settle();
            // Target is geometrically terminal while inside a positive observation margin.
            const expected = new Error('scrollprogress expected browser smoke failure');
            let caught = 0;
            const onError = (event) => {
                if (event.error === expected) {
                    caught++;
                    event.preventDefault();
                }
            };
            window.addEventListener('error', onError);
            try {
                for (const inverted of [false, true]) {
                    let destroyed = false;
                    const a = keep(
                        trackScrollProgress(target, {
                            root,
                            rootMargin: '400px',
                            inverted,
                            once: true,
                            onEnter: () => {
                                throw expected;
                            }
                        })
                    );
                    a.onDestroy(() => {
                        destroyed = true;
                    });
                    const b = keep(trackScrollProgress(target, { root, rootMargin: '400px' }));
                    await until(() => destroyed && b.getState().isTracking);
                    assert(b.getConfig().once === false, 'Independent B retained');
                    near(a.getState().progress, inverted ? 0 : 1);
                    b.destroy();
                }
                assert(caught === 2, 'Both expected rAF errors reached window');
            } finally {
                window.removeEventListener('error', onError);
            }
        });
    } catch (error) {
        results.push({ name: 'Smoke runner', result: 'FAIL', message: String(error) });
    } finally {
        for (const resource of resources.reverse()) {
            try {
                resource.destroy();
            } catch (error) {
                results.push({ name: 'Resource cleanup', result: 'FAIL', message: String(error) });
            }
        }
        button.disabled = false;
        const passed =
            attemptedTests > 0 &&
            results.length === attemptedTests &&
            results.every((item) => item.result === 'PASS');
        reporting.publish(passed ? 'passed' : 'failed', { results, passed });
        output.dataset.result = passed ? 'pass' : 'fail';
    }
}
button.addEventListener('click', run);
