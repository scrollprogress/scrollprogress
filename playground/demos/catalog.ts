import boundaryMarkup from './core/boundary-events/markup.html?raw';
import boundaryStyle from './core/boundary-events/style.css?raw';
import boundaryTypescript from './core/boundary-events/main.ts?raw';
import boundaryJavascript from './core/boundary-events/main.ts?demo-js';
import cssVariableMarkup from './core/css-variable/markup.html?raw';
import cssVariableStyle from './core/css-variable/style.css?raw';
import cssVariableTypescript from './core/css-variable/main.ts?raw';
import cssVariableJavascript from './core/css-variable/main.ts?demo-js';
import customRootXMarkup from './core/custom-root-x/markup.html?raw';
import customRootXStyle from './core/custom-root-x/style.css?raw';
import customRootXTypescript from './core/custom-root-x/main.ts?raw';
import customRootXJavascript from './core/custom-root-x/main.ts?demo-js';
import customRootYMarkup from './core/custom-root-y/markup.html?raw';
import customRootYStyle from './core/custom-root-y/style.css?raw';
import customRootYTypescript from './core/custom-root-y/main.ts?raw';
import customRootYJavascript from './core/custom-root-y/main.ts?demo-js';
import invertedMarkup from './core/inverted/markup.html?raw';
import invertedStyle from './core/inverted/style.css?raw';
import invertedTypescript from './core/inverted/main.ts?raw';
import invertedJavascript from './core/inverted/main.ts?demo-js';
import lifecycleMarkup from './core/lifecycle/markup.html?raw';
import lifecycleStyle from './core/lifecycle/style.css?raw';
import lifecycleTypescript from './core/lifecycle/main.ts?raw';
import lifecycleJavascript from './core/lifecycle/main.ts?demo-js';
import oneShotReadMarkup from './core/one-shot-read/markup.html?raw';
import oneShotReadStyle from './core/one-shot-read/style.css?raw';
import oneShotReadTypescript from './core/one-shot-read/main.ts?raw';
import oneShotReadJavascript from './core/one-shot-read/main.ts?demo-js';
import onceMarkup from './core/once/markup.html?raw';
import onceStyle from './core/once/style.css?raw';
import onceTypescript from './core/once/main.ts?raw';
import onceJavascript from './core/once/main.ts?demo-js';
import progressMarkup from './core/progress-bar/markup.html?raw';
import progressStyle from './core/progress-bar/style.css?raw';
import progressTypescript from './core/progress-bar/main.ts?raw';
import progressJavascript from './core/progress-bar/main.ts?demo-js';
import webAnimationsMarkup from './core/web-animations/markup.html?raw';
import webAnimationsStyle from './core/web-animations/style.css?raw';
import webAnimationsTypescript from './core/web-animations/main.ts?raw';
import webAnimationsJavascript from './core/web-animations/main.ts?demo-js';
import directionMarkup from './experiments/direction-toolbar/markup.html?raw';
import directionStyle from './experiments/direction-toolbar/style.css?raw';
import directionTypescript from './experiments/direction-toolbar/main.ts?raw';
import directionJavascript from './experiments/direction-toolbar/main.ts?demo-js';
import jsonFeedMarkup from './experiments/json-feed/markup.html?raw';
import jsonFeedStyle from './experiments/json-feed/style.css?raw';
import jsonFeedTypescript from './experiments/json-feed/main.ts?raw';
import jsonFeedJavascript from './experiments/json-feed/main.ts?demo-js';
import milestonesMarkup from './experiments/milestones/markup.html?raw';
import milestonesStyle from './experiments/milestones/style.css?raw';
import milestonesTypescript from './experiments/milestones/main.ts?raw';
import milestonesJavascript from './experiments/milestones/main.ts?demo-js';
import preloadMarkup from './experiments/predictive-preload/markup.html?raw';
import preloadStyle from './experiments/predictive-preload/style.css?raw';
import preloadTypescript from './experiments/predictive-preload/main.ts?raw';
import preloadJavascript from './experiments/predictive-preload/main.ts?demo-js';
import handoffMarkup from './experiments/responsive-handoff/markup.html?raw';
import handoffStyle from './experiments/responsive-handoff/style.css?raw';
import handoffTypescript from './experiments/responsive-handoff/main.ts?raw';
import handoffJavascript from './experiments/responsive-handoff/main.ts?demo-js';
import postsPageOne from './experiments/json-feed/assets/posts-page-1.json?raw';
import postsPageTwo from './experiments/json-feed/assets/posts-page-2.json?raw';
import debugMarkup from './debug/lab/markup.html?raw';
import debugStyle from './debug/lab/style.css?raw';
import debugTypescript from './debug/lab/main.ts?raw';
import debugJavascript from './debug/lab/main.ts?demo-js';
import viewportMarkup from './edge/viewport-x/markup.html?raw';
import viewportStyle from './edge/viewport-x/style.css?raw';
import viewportTypescript from './edge/viewport-x/main.ts?raw';
import viewportJavascript from './edge/viewport-x/main.ts?demo-js';
import type { PlaygroundDemo } from './types';

export const playgroundDemos = [
    {
        id: 'core/progress-bar',
        category: 'core',
        title: 'Progress bar',
        order: 10,
        level: 'start-here',
        markup: progressMarkup,
        style: progressStyle,
        typescript: progressTypescript,
        javascript: progressJavascript
    },
    {
        id: 'core/css-variable',
        category: 'core',
        title: 'CSS variable',
        order: 20,
        level: 'start-here',
        markup: cssVariableMarkup,
        style: cssVariableStyle,
        typescript: cssVariableTypescript,
        javascript: cssVariableJavascript
    },
    {
        id: 'core/web-animations',
        category: 'core',
        title: 'Web Animations',
        order: 30,
        level: 'intermediate',
        markup: webAnimationsMarkup,
        style: webAnimationsStyle,
        typescript: webAnimationsTypescript,
        javascript: webAnimationsJavascript
    },
    {
        id: 'core/custom-root-y',
        category: 'core',
        title: 'Vertical custom root',
        order: 40,
        level: 'intermediate',
        markup: customRootYMarkup,
        style: customRootYStyle,
        typescript: customRootYTypescript,
        javascript: customRootYJavascript
    },
    {
        id: 'core/custom-root-x',
        category: 'core',
        title: 'Horizontal custom root',
        order: 50,
        level: 'intermediate',
        markup: customRootXMarkup,
        style: customRootXStyle,
        typescript: customRootXTypescript,
        javascript: customRootXJavascript
    },
    {
        id: 'core/inverted',
        category: 'core',
        title: 'Inverted progress',
        order: 60,
        level: 'intermediate',
        markup: invertedMarkup,
        style: invertedStyle,
        typescript: invertedTypescript,
        javascript: invertedJavascript
    },
    {
        id: 'core/boundary-events',
        category: 'core',
        title: 'Boundary events',
        order: 70,
        level: 'intermediate',
        markup: boundaryMarkup,
        style: boundaryStyle,
        typescript: boundaryTypescript,
        javascript: boundaryJavascript
    },
    {
        id: 'core/once',
        category: 'core',
        title: 'Once',
        order: 80,
        level: 'intermediate',
        markup: onceMarkup,
        style: onceStyle,
        typescript: onceTypescript,
        javascript: onceJavascript
    },
    {
        id: 'core/lifecycle',
        category: 'core',
        title: 'Lifecycle controls',
        order: 90,
        level: 'advanced',
        markup: lifecycleMarkup,
        style: lifecycleStyle,
        typescript: lifecycleTypescript,
        javascript: lifecycleJavascript
    },
    {
        id: 'core/one-shot-read',
        category: 'core',
        title: 'One-shot progress read',
        order: 100,
        level: 'advanced',
        markup: oneShotReadMarkup,
        style: oneShotReadStyle,
        typescript: oneShotReadTypescript,
        javascript: oneShotReadJavascript
    },
    {
        id: 'experiments/predictive-preload',
        category: 'experiments',
        title: 'Predictive preload',
        order: 110,
        level: 'intermediate',
        markup: preloadMarkup,
        style: preloadStyle,
        typescript: preloadTypescript,
        javascript: preloadJavascript
    },
    {
        id: 'experiments/milestones',
        category: 'experiments',
        title: 'Milestones',
        order: 120,
        level: 'intermediate',
        markup: milestonesMarkup,
        style: milestonesStyle,
        typescript: milestonesTypescript,
        javascript: milestonesJavascript
    },
    {
        id: 'experiments/responsive-handoff',
        category: 'experiments',
        title: 'Responsive handoff',
        order: 130,
        level: 'advanced',
        markup: handoffMarkup,
        style: handoffStyle,
        typescript: handoffTypescript,
        javascript: handoffJavascript
    },
    {
        id: 'experiments/direction-toolbar',
        category: 'experiments',
        title: 'Direction UI',
        order: 140,
        level: 'intermediate',
        markup: directionMarkup,
        style: directionStyle,
        typescript: directionTypescript,
        javascript: directionJavascript
    },
    {
        id: 'experiments/json-feed',
        category: 'experiments',
        title: 'JSON feed',
        order: 150,
        level: 'advanced',
        markup: jsonFeedMarkup,
        style: jsonFeedStyle,
        typescript: jsonFeedTypescript,
        javascript: jsonFeedJavascript,
        assets: [
            { path: 'public/data/posts-page-1.json', content: postsPageOne },
            { path: 'public/data/posts-page-2.json', content: postsPageTwo }
        ]
    },
    {
        id: 'debug/lab',
        category: 'debug',
        title: 'Debug lab',
        order: 200,
        level: 'diagnostics',
        markup: debugMarkup,
        style: debugStyle,
        typescript: debugTypescript,
        javascript: debugJavascript
    },
    {
        id: 'edge/viewport-x',
        category: 'edge',
        title: 'Viewport X',
        order: 210,
        level: 'advanced',
        markup: viewportMarkup,
        style: viewportStyle,
        typescript: viewportTypescript,
        javascript: viewportJavascript
    }
] as const satisfies readonly PlaygroundDemo[];

export function getPlaygroundDemo(id: string): PlaygroundDemo {
    const demo = playgroundDemos.find((candidate) => candidate.id === id);

    if (!demo) throw new Error(`Unknown playground demo: ${id}`);
    return demo;
}
