import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const demoMarkerPattern = /<!--\s*playground-demo:([a-z0-9/-]+)\s*-->/g;

export function playgroundDemoIncludes(playgroundDirectory: string) {
    return {
        name: 'playground-demo-includes',
        enforce: 'pre' as const,

        transformIndexHtml(html: string) {
            const seen = new Set<string>();

            return html.replace(demoMarkerPattern, (_marker, demoId: string) => {
                if (seen.has(demoId)) {
                    throw new Error(`[playground] Duplicate demo marker: ${demoId}`);
                }

                seen.add(demoId);
                const fragmentPath = resolve(playgroundDirectory, 'demos', demoId, 'markup.html');

                try {
                    return readFileSync(fragmentPath, 'utf8');
                } catch {
                    throw new Error(
                        `[playground] Missing markup for demo "${demoId}": ${fragmentPath}`
                    );
                }
            });
        }
    };
}
