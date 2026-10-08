import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createConsumerWorkspace } from '../../../scripts/consumer-workspace.mjs';

const [repository, mode, storage = 'external', name = 'consumer'] = process.argv.slice(2);
const { directory } = createConsumerWorkspace(
    repository,
    async () => {
        // Stand in for closing Vite before deleting files that it may still use.
        await new Promise((resolve) => setTimeout(resolve, 10));
        process.send({ serverClosed: true });
    },
    { external: storage === 'external', name }
);
mkdirSync(path.join(directory, 'node_modules', 'sample'), { recursive: true });
writeFileSync(
    path.join(directory, 'node_modules', 'sample', 'index.js'),
    'export const ready = true;'
);
process.send({ directory }, () => {
    if (mode === 'normal') process.disconnect();
    else if (mode === 'error') throw new Error('Deliberate consumer check failure');
    else if (mode === 'rejection') Promise.reject(new Error('Deliberate async check failure'));
    else if (mode === 'signal') process.emit('SIGINT');
    else setInterval(() => {}, 1000);
});
