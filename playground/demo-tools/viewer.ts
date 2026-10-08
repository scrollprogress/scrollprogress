import { getPlaygroundDemo, playgroundDemos } from '../demos/catalog';

import { createDemoProjectZip, type DemoProjectLanguage } from './project';

type DemoFile = 'markup' | 'style' | 'typescript' | 'javascript';

const labels: Record<DemoFile, string> = {
    markup: 'HTML',
    style: 'CSS',
    typescript: 'TypeScript',
    javascript: 'JavaScript'
};

function createDialog(): HTMLDialogElement {
    const dialog = document.createElement('dialog');
    dialog.className = 'demo-code-dialog';
    dialog.setAttribute('aria-labelledby', 'demo-code-title');
    dialog.innerHTML = `
        <div class="demo-code-panel">
            <header class="demo-code-header">
                <div><p class="demo-code-kicker">Demo code</p><h2 id="demo-code-title"></h2></div>
                <button type="button" class="demo-code-close" data-demo-close aria-label="Close code viewer">×</button>
            </header>
            <div class="demo-code-tabs" role="tablist" aria-label="Demo files"></div>
            <pre class="demo-code-pre"><code></code></pre>
            <footer class="demo-code-actions">
                <p data-copy-status aria-live="polite"></p>
                <button type="button" class="demo-action" data-copy-file>Copy file</button>
            </footer>
        </div>`;
    document.body.append(dialog);
    return dialog;
}

function setupCodeViewer(): void {
    const dialog = createDialog();
    const titleElement = dialog.querySelector<HTMLElement>('#demo-code-title');
    const tabsElement = dialog.querySelector<HTMLElement>('[role="tablist"]');
    const codeElement = dialog.querySelector<HTMLElement>('code');
    const statusElement = dialog.querySelector<HTMLElement>('[data-copy-status]');
    let activeDemoId = '';
    let activeFile: DemoFile = 'markup';
    let returnFocus: HTMLElement | null = null;
    let copyStatusTimer: number | null = null;

    if (!titleElement || !tabsElement || !codeElement || !statusElement) {
        throw new Error('Incomplete demo code dialog');
    }

    const title = titleElement;
    const tabs = tabsElement;
    const code = codeElement;
    const status = statusElement;

    function clearCopyStatus(): void {
        if (copyStatusTimer !== null) window.clearTimeout(copyStatusTimer);
        copyStatusTimer = null;
        status.textContent = '';
    }

    function showCopyStatus(message: string): void {
        clearCopyStatus();
        status.textContent = message;
        copyStatusTimer = window.setTimeout(() => {
            status.textContent = '';
            copyStatusTimer = null;
        }, 3000);
    }

    function renderFile(file: DemoFile): void {
        const demo = getPlaygroundDemo(activeDemoId);
        clearCopyStatus();
        activeFile = file;
        code.textContent = demo[file].trim();

        for (const tab of tabs.querySelectorAll<HTMLButtonElement>('[role="tab"]')) {
            const selected = tab.dataset.demoFile === file;
            tab.setAttribute('aria-selected', String(selected));
            tab.tabIndex = selected ? 0 : -1;
        }
    }

    function openDemo(id: string): void {
        const demo = getPlaygroundDemo(id);
        activeDemoId = id;
        title.textContent = demo.title;
        tabs.replaceChildren(
            ...Object.entries(labels).map(([file, label]) => {
                const button = document.createElement('button');
                button.type = 'button';
                button.role = 'tab';
                button.className = 'demo-code-tab';
                button.dataset.demoFile = file;
                button.textContent = label;
                button.addEventListener('click', () => renderFile(file as DemoFile));
                button.addEventListener('keydown', (event) => {
                    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
                    const files = Object.keys(labels) as DemoFile[];
                    const direction = event.key === 'ArrowRight' ? 1 : -1;
                    const next =
                        (files.indexOf(file as DemoFile) + direction + files.length) % files.length;
                    renderFile(files[next]);
                    tabs.querySelector<HTMLButtonElement>('[aria-selected="true"]')?.focus();
                });
                return button;
            })
        );
        renderFile('markup');
        dialog.showModal();
        tabs.querySelector<HTMLButtonElement>('[aria-selected="true"]')?.focus();
    }

    dialog.querySelector('[data-demo-close]')?.addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', () => {
        clearCopyStatus();
        returnFocus?.focus();
    });
    dialog.addEventListener('click', (event) => {
        if (event.target === dialog) dialog.close();
    });
    dialog.querySelector('[data-copy-file]')?.addEventListener('click', async () => {
        const value = code.textContent ?? '';
        const copiedFile = activeFile;

        try {
            await navigator.clipboard.writeText(value);
            if (activeFile === copiedFile) showCopyStatus(`${labels[copiedFile]} copied.`);
        } catch {
            if (activeFile !== copiedFile) return;
            const selection = window.getSelection();
            const range = document.createRange();
            range.selectNodeContents(code);
            selection?.removeAllRanges();
            selection?.addRange(range);
            showCopyStatus('Copy is unavailable. The code is selected; press Ctrl/Cmd+C.');
        }
    });

    document.addEventListener('click', (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;
        const viewButton = target.closest<HTMLElement>('[data-demo-view]');
        const downloadButton = target.closest<HTMLElement>('[data-demo-download]');

        if (viewButton?.dataset.demoView) {
            returnFocus = viewButton;
            openDemo(viewButton.dataset.demoView);
        }
        if (downloadButton?.dataset.demoDownload) {
            const demo = getPlaygroundDemo(downloadButton.dataset.demoDownload);
            const language = downloadButton.dataset.demoLanguage as DemoProjectLanguage | undefined;
            const selectedLanguage = language ?? 'typescript';
            const zip = createDemoProjectZip(demo, selectedLanguage);
            const blob = new Blob([zip.slice().buffer], { type: 'application/zip' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `scrollprogress-${demo.id.replaceAll('/', '-')}-${selectedLanguage}.zip`;
            document.body.append(link);
            link.click();
            link.remove();
            window.setTimeout(() => URL.revokeObjectURL(link.href), 0);
        }
    });
}

export function addDemoActions(): void {
    for (const demo of playgroundDemos) {
        const host = document.querySelector<HTMLElement>(`[data-demo-actions="${demo.id}"]`);
        if (!host) continue;
        host.innerHTML = `<button type="button" class="demo-action" data-demo-view="${demo.id}">View code</button><button type="button" class="demo-action" data-demo-download="${demo.id}" data-demo-language="typescript">Download TypeScript</button><button type="button" class="demo-action" data-demo-download="${demo.id}" data-demo-language="javascript">Download JavaScript</button>`;
    }

    setupCodeViewer();
}
