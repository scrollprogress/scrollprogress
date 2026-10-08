import { createBrowserReport } from './reporting.js';
import { trackScrollProgress, readScrollProgress } from '@scrollprogress/scrollprogress';
import { debugScrollProgress } from '@scrollprogress/scrollprogress/debug';
import { createDebugPalette } from '@scrollprogress/scrollprogress/debug/palette';
import { createDebugOverlay } from '@scrollprogress/scrollprogress/debug/overlay';
const el = (id) => document.getElementById(id);
const target = el('target'),
    root = el('root'),
    space = el('space'),
    content = el('content');
let tracker,
    bridge,
    views = [],
    destroyed = false;
const records = [];
function options() {
    return {
        root: el('mode').value === 'custom' ? root : null,
        axis: el('axis').value,
        start: Number(el('start').value),
        end: Number(el('end').value),
        rootMargin: el('margin').value,
        observerThreshold: JSON.parse(el('threshold').value),
        inverted: el('inverted').checked,
        once: el('once').checked,
        requireRootVisible: el('gate').checked,
        cssVar: '--manual-progress'
    };
}
function layout(config) {
    const custom = config.root !== null;
    space.style.width = custom || config.axis === 'y' ? '100%' : '400vw';
    space.style.height = custom ? '220vh' : config.axis === 'y' ? '400vh' : '100vh';
    root.style.display = custom ? 'block' : 'none';
    content.style.position = 'relative';
    content.style.width = '240vw';
    content.style.height = '160vh';
    (custom ? content : space).append(target);
    space.style.position = 'relative';
    target.style.left = config.axis === 'x' ? (custom ? '90vw' : '120vw') : '20px';
    target.style.top = config.axis === 'y' ? (custom ? '70vh' : '120vh') : custom ? '20px' : '65vh';
    document.documentElement.style.overflowX = 'auto';
    document.body.style.overflowX = 'visible';
}
function diagnostics() {
    const config = tracker?.getConfig();
    const viewport = window.visualViewport;
    const directProgress = config && readScrollProgress(target, config);
    return {
        time: new Date().toISOString(),
        userAgent: navigator.userAgent,
        destroyed,
        config: config && { ...config, root: config.root ? 'custom' : 'viewport' },
        state: tracker?.getState(),
        directProgress,
        expectedProgress: config && (config.inverted ? 1 - directProgress : directProgress),
        innerWidth,
        innerHeight,
        scrollX,
        scrollY,
        documentClientWidth: document.documentElement.clientWidth,
        scrollingElement: document.scrollingElement?.tagName,
        scrollWidth: document.scrollingElement?.scrollWidth,
        clientWidth: document.scrollingElement?.clientWidth,
        rootScrollLeft: root.scrollLeft,
        rootScrollTop: root.scrollTop,
        visualViewport: viewport && {
            width: viewport.width,
            height: viewport.height,
            offsetLeft: viewport.offsetLeft,
            offsetTop: viewport.offsetTop,
            scale: viewport.scale
        },
        overflow: {
            html: getComputedStyle(document.documentElement).overflow,
            body: getComputedStyle(document.body).overflow
        },
        target: target.getBoundingClientRect().toJSON(),
        css: target.style.getPropertyValue('--manual-progress')
    };
}
function refresh(state) {
    const config = tracker?.getConfig();
    el('status').textContent = JSON.stringify(
        {
            destroyed,
            state: state ?? tracker?.getState(),
            directProgress: config && readScrollProgress(target, config)
        },
        null,
        2
    );
}
function create() {
    const config = options();
    bridge?.destroy();
    tracker?.destroy();
    layout(config);
    destroyed = false;
    tracker = trackScrollProgress(target, { ...config, onUpdate: (state) => refresh(state) });
    tracker.onDestroy(() => {
        destroyed = true;
        refresh();
    });
    bridge = debugScrollProgress(tracker, { label: 'Manual test target' });
    refresh();
}
const checklist = {
    'viewport-x': 'Viewport / horizontal',
    'viewport-y': 'Viewport / vertical',
    'custom-x': 'Custom root / horizontal',
    'custom-y': 'Custom root / vertical',
    observation: 'rootMargin / thresholds / root visibility',
    lifecycle: 'Inverted / once / update / destroy / recreate',
    css: 'CSS variable and persistence after destroy',
    debug: 'Palette / overlay / controls / teardown'
};
const fieldset = el('report-controls');
for (const [key, text] of Object.entries(checklist)) {
    const label = document.createElement('label');
    label.textContent = `${text} `;
    const select = document.createElement('select');
    select.dataset.reportField = key;
    for (const value of ['not-tested', 'pass', 'fail']) select.add(new Option(value, value));
    label.append(select);
    fieldset.append(label, document.createElement('br'));
}
const reporting = await createBrowserReport('manual', el('log'), () => ({
    events: records,
    currentSnapshot: diagnostics()
}));
reporting.start();
function record(action, runAction) {
    try {
        runAction();
        records.push({ action, result: 'executed', snapshot: diagnostics() });
    } catch (error) {
        el('status').textContent = String(error);
        records.push({
            action,
            result: 'error',
            error: String(error),
            time: new Date().toISOString()
        });
    }
    // This records actions, not a compatibility PASS. The operator fills the checklist.
    reporting.publish('manual-session');
}
for (const [id, action] of Object.entries({
    create,
    update: () => {
        const config = options();
        tracker.update(config);
        layout(config);
    },
    destroy: () => {
        tracker.destroy();
        refresh();
    },
    debug: () => {
        if (views.length) {
            views.forEach((view) => view.destroy());
            views = [];
        } else {
            views.push(createDebugPalette());
            views.push(
                createDebugOverlay({
                    visibleLayers: ['target', 'progress', 'root', 'margin']
                })
            );
        }
    },
    snapshot: () => {}
}))
    el(id).addEventListener('click', () => record(id, action));
record('initial-create', create);
