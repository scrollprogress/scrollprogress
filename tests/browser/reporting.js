// Developer fixtures only: this module is never part of the library bundle.
export async function createBrowserReport(kind, output, collect = () => ({})) {
    const save = document.querySelector('#save-report');
    const notice = document.querySelector('#report-status');
    const controls = document.querySelector('#report-controls');
    for (const [name, label] of Object.entries({
        browser: 'Browser and version',
        os: 'OS and version',
        device: 'Device',
        notes: 'Notes / reproduction steps'
    })) {
        const field = document.createElement('label');
        field.textContent = `${label} `;
        const input = document.createElement(name === 'notes' ? 'textarea' : 'input');
        input.name = name;
        input.dataset.reportField = name;
        field.append(input);
        controls.append(field, document.createElement('br'));
    }
    let artifact = null,
        metadataError = null;
    try {
        const response = await fetch('./package-info.json', { cache: 'no-store' });
        if (!response.ok) throw new Error(`Package metadata HTTP ${response.status}`);
        artifact = await response.json();
        if (!artifact.package || !/^[a-f\d]{64}$/.test(artifact.sha256))
            throw new Error('Invalid package metadata');
    } catch (error) {
        artifact = null;
        metadataError = String(error);
    }
    const metadataNotice = metadataError ? `Package identity unavailable: ${metadataError}. ` : '';
    notice.textContent = `${metadataNotice}Save report downloads JSON through your browser. Nothing is saved automatically.`;
    let startedAt, environment, status, data;
    function snapshot() {
        return {
            schemaVersion: 1,
            kind,
            startedAt,
            updatedAt: new Date().toISOString(),
            status,
            artifact,
            metadataError,
            environment,
            observations: Object.fromEntries(
                [...document.querySelectorAll('[data-report-field]')].map((input) => [
                    input.dataset.reportField,
                    input.value
                ])
            ),
            ...data,
            ...collect()
        };
    }
    function render() {
        if (!status) return;
        const report = snapshot();
        output.textContent = JSON.stringify(report, null, 2);
        return report;
    }
    controls.addEventListener('input', render);
    save.addEventListener('click', () => {
        if (!status) return;
        try {
            const report = { ...render(), savedAt: new Date().toISOString() };
            const blob = new Blob([JSON.stringify(report, null, 2) + '\n'], {
                type: 'application/json'
            });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `scrollprogress-${kind}-${report.savedAt.replace(/[:.]/g, '-')}.json`;
            document.body.append(link);
            try {
                link.click();
            } finally {
                link.remove();
                // Allow the browser to begin the download before releasing its URL.
                setTimeout(() => URL.revokeObjectURL(url), 1000);
            }
            notice.textContent = `${metadataNotice}Download requested. Check your browser's downloads; save reports outside the generated consumer folder.`;
        } catch (error) {
            notice.textContent = `${metadataNotice}Could not download report: ${String(error)}. Copy the displayed JSON instead.`;
        }
    });
    return {
        start() {
            startedAt = new Date().toISOString();
            environment = {
                userAgent: navigator.userAgent,
                language: navigator.language,
                viewport: { width: window.innerWidth, height: window.innerHeight },
                devicePixelRatio: window.devicePixelRatio,
                visibility: document.visibilityState
            };
            status = null;
            data = {};
            save.disabled = true;
            delete output.dataset.result;
        },
        publish(nextStatus, details = {}) {
            status = nextStatus;
            // Freeze the completed portion of a run; keep later caller mutations out.
            data = structuredClone(details);
            save.disabled = false;
            return render();
        }
    };
}
