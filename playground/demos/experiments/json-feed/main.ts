import './style.css';

import { trackScrollProgress, type ScrollProgressTracker } from '@scrollprogress/scrollprogress';

type ExperimentCleanup = () => void;
function getExperimentElement<TElement extends Element>(
    selector: string,
    parent: ParentNode = document
): TElement {
    const element = parent.querySelector<TElement>(selector);
    if (!element) throw new Error(`Missing demo element: ${selector}`);
    return element;
}

interface JsonPost {
    id: number;
    category: string;
    title: string;
    excerpt: string;
    readTime: string;
}

interface JsonPage {
    posts: JsonPost[];
    next: string | null;
}

type RequestState = 'idle' | 'loading' | 'ready' | 'complete' | 'error';

function setupMinimalJsonFeedExperiment(): ExperimentCleanup {
    const root = getExperimentElement<HTMLElement>('[data-experiment-root="minimal-json"]');
    const list = getExperimentElement<HTMLElement>('[data-minimal-json-list]', root);
    const sentinel = getExperimentElement<HTMLElement>('[data-minimal-json-sentinel]', root);
    const sentinelLabel = getExperimentElement<HTMLElement>('[data-minimal-json-sentinel-label]');
    const status = getExperimentElement<HTMLElement>('[data-minimal-json-status]');
    const count = getExperimentElement<HTMLOutputElement>('[data-minimal-json-count]');
    const retryButton = getExperimentElement<HTMLButtonElement>('[data-minimal-json-retry]');
    const resetButton = getExperimentElement<HTMLButtonElement>('[data-minimal-json-reset]');
    let tracker: ScrollProgressTracker | null = null;
    let controller: AbortController | null = null;
    let resetFrame: number | null = null;
    let generation = 0;
    let nextPage: string | null = './data/posts-page-1.json';
    let loadedPages = 0;
    let loading = false;

    function renderState(state: RequestState, message: string): void {
        root.setAttribute('aria-busy', String(state === 'loading'));
        status.textContent = message;
        sentinel.dataset.state = state;
        sentinelLabel.textContent =
            state === 'loading'
                ? `Loading JSON page ${loadedPages + 1}…`
                : state === 'ready'
                  ? 'Page 1 appended · continue to the moved sentinel'
                  : state === 'complete'
                    ? 'Page 2 appended · tracker released'
                    : state === 'error'
                      ? 'The JSON request failed · retry is available'
                      : 'Sentinel · approach to request page 1';
        retryButton.hidden = state !== 'error';
        retryButton.disabled = loading;
        count.value = `${loadedPages} / 2 pages · ${list.querySelectorAll('[data-minimal-json-item]').length} posts`;
    }

    function createPostCard(post: JsonPost): HTMLElement {
        const article = document.createElement('article');
        const number = document.createElement('div');
        const content = document.createElement('div');
        const category = document.createElement('p');
        const title = document.createElement('h4');
        const excerpt = document.createElement('p');
        const readTime = document.createElement('p');

        article.className =
            'generated-feed-item grid min-h-40 gap-4 rounded-2xl border border-emerald-300/20 bg-emerald-300/5 p-5 motion-reduce:animate-none sm:grid-cols-[5rem_minmax(0,1fr)]';
        article.dataset.minimalJsonItem = 'true';
        number.className =
            'grid min-h-20 place-items-center rounded-xl bg-emerald-300/10 font-mono text-xs text-emerald-200';
        category.className = 'text-xs uppercase tracking-[0.16em] text-emerald-300';
        title.className = 'mt-2 text-xl font-semibold text-white';
        excerpt.className = 'mt-3 text-sm leading-6 text-neutral-400';
        readTime.className = 'mt-4 text-xs text-neutral-500';

        number.textContent = String(post.id);
        category.textContent = post.category;
        title.textContent = post.title;
        excerpt.textContent = post.excerpt;
        readTime.textContent = post.readTime;
        content.append(category, title, excerpt, readTime);
        article.append(number, content);

        return article;
    }

    function appendPosts(posts: JsonPost[]): void {
        const fragment = document.createDocumentFragment();

        for (const post of posts) fragment.append(createPostCard(post));
        list.append(fragment);
    }

    async function loadPosts(): Promise<void> {
        if (loading || nextPage === null) return;

        const requestGeneration = generation;
        const requestController = new AbortController();
        const pageUrl = nextPage;
        controller = requestController;
        loading = true;
        renderState('loading', `requesting JSON page ${loadedPages + 1}`);

        try {
            const response = await fetch(pageUrl, {
                signal: requestController.signal
            });

            if (!response.ok) throw new Error(`Request failed: ${response.status}`);

            const page = readPage(await response.json());

            if (requestGeneration !== generation) return;

            appendPosts(page.posts);
            loadedPages += 1;
            nextPage = page.next;

            if (nextPage === null) {
                tracker?.destroy();
                tracker = null;
                renderState('complete', 'page 2 appended · tracker released');
            } else {
                renderState('ready', 'page 1 appended · keep scrolling');
            }
        } catch (error) {
            if (requestController.signal.aborted || requestGeneration !== generation) return;

            renderState(
                'error',
                error instanceof Error ? error.message : 'The JSON request failed'
            );
        } finally {
            if (requestGeneration === generation) {
                loading = false;
                if (controller === requestController) controller = null;
                retryButton.disabled = false;
            }
        }
    }

    function createTracker(): void {
        tracker?.destroy();
        tracker = trackScrollProgress(sentinel, {
            root,
            rootMargin: '0px 0px 80px 0px',
            requireRootVisible: true,
            onEnter: () => void loadPosts()
        });
    }

    function resetDemo(): void {
        generation += 1;
        controller?.abort();
        controller = null;
        tracker?.destroy();
        tracker = null;
        if (resetFrame !== null) cancelAnimationFrame(resetFrame);
        resetFrame = null;
        loading = false;
        nextPage = './data/posts-page-1.json';
        loadedPages = 0;
        list.querySelectorAll('[data-minimal-json-item]').forEach((item) => item.remove());
        root.scrollTop = 0;
        renderState('idle', 'reset complete · waiting for sentinel');

        resetFrame = requestAnimationFrame(() => {
            resetFrame = null;
            createTracker();
        });
    }

    function retryLoad(): void {
        void loadPosts();
    }

    retryButton.addEventListener('click', retryLoad);
    resetButton.addEventListener('click', resetDemo);
    renderState('idle', 'waiting for sentinel');
    createTracker();

    return () => {
        generation += 1;
        retryButton.removeEventListener('click', retryLoad);
        resetButton.removeEventListener('click', resetDemo);
        controller?.abort();
        tracker?.destroy();
        if (resetFrame !== null) cancelAnimationFrame(resetFrame);
        list.querySelectorAll('[data-minimal-json-item]').forEach((item) => item.remove());
        root.scrollTop = 0;
        root.removeAttribute('aria-busy');
    };
}

function readPage(payload: unknown): JsonPage {
    if (
        typeof payload !== 'object' ||
        payload === null ||
        !('posts' in payload) ||
        !Array.isArray(payload.posts) ||
        !payload.posts.every(isJsonPost) ||
        !('next' in payload) ||
        (payload.next !== null && typeof payload.next !== 'string')
    ) {
        throw new TypeError('The JSON page does not match the expected shape');
    }

    return { posts: payload.posts, next: payload.next };
}

function isJsonPost(value: unknown): value is JsonPost {
    return (
        typeof value === 'object' &&
        value !== null &&
        'id' in value &&
        typeof value.id === 'number' &&
        'category' in value &&
        typeof value.category === 'string' &&
        'title' in value &&
        typeof value.title === 'string' &&
        'excerpt' in value &&
        typeof value.excerpt === 'string' &&
        'readTime' in value &&
        typeof value.readTime === 'string'
    );
}

const cleanup: ExperimentCleanup = setupMinimalJsonFeedExperiment();
if (import.meta.hot) import.meta.hot.dispose(cleanup);
