import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import { localBrowserPackageInfo } from './tooling/vite/local-package-info.mjs';

const browserDirectory = fileURLToPath(new URL('.', import.meta.url));
const repository = path.resolve(browserDirectory, '../..');
const distributionDirectory = path.join(repository, 'dist');
const packageManifest = JSON.parse(readFileSync(path.join(repository, 'package.json'), 'utf8'));

const packageName = packageManifest.name;
const aliases = [
    ['debug/registry', 'debug/registry/index.js'],
    ['debug/palette', 'debug/palette/index.js'],
    ['debug/console', 'debug/console/index.js'],
    ['debug/overlay', 'debug/overlay/index.js'],
    ['debug', 'debug/index.js'],
    ['', 'index.js']
].map(([subpath, output]) => ({
    find: `${packageName}${subpath ? `/${subpath}` : ''}`,
    replacement: path.join(distributionDirectory, output)
}));

export default defineConfig({
    root: browserDirectory,
    publicDir: false,
    clearScreen: false,
    appType: 'mpa',
    plugins: [
        localBrowserPackageInfo({
            browserDirectory,
            distributionDirectory,
            packageName: packageManifest.name,
            packageVersion: packageManifest.version
        })
    ],
    resolve: { alias: aliases },
    server: {
        host: '127.0.0.1',
        port: 4175,
        strictPort: true,
        open: false
    }
});
