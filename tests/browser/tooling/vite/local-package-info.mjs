import {
    BROWSER_FIXTURE_FILES,
    fixtureIdentity,
    hashFixtureFiles
} from '../browser-fixture-hash.mjs';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

function hashDirectory(hash, directory, prefix) {
    for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a, b) =>
        a.name.localeCompare(b.name)
    )) {
        const absolutePath = path.join(directory, entry.name);
        const relativePath = path.posix.join(prefix, entry.name);
        if (entry.isDirectory()) {
            hashDirectory(hash, absolutePath, relativePath);
        } else if (entry.isFile()) {
            hash.update(relativePath).update('\0').update(readFileSync(absolutePath));
        }
    }
}

export function localBrowserPackageInfo({
    browserDirectory,
    distributionDirectory,
    packageName,
    packageVersion
}) {
    function packageInfo() {
        const hash = createHash('sha256');
        hashDirectory(hash, distributionDirectory, 'dist');
        hash.update(hashFixtureFiles(browserDirectory, BROWSER_FIXTURE_FILES));
        return {
            package: `${packageName}@${packageVersion}`,
            sha256: hash.digest('hex'),
            mode: 'local-build',
            preparedAt: new Date().toISOString(),
            ...fixtureIdentity(browserDirectory)
        };
    }

    return {
        name: 'scrollprogress-local-browser-package-info',
        configureServer(server) {
            server.middlewares.use((request, response, next) => {
                if (request.url?.split('?')[0] !== '/package-info.json') {
                    next();
                    return;
                }
                response.setHeader('Content-Type', 'application/json');
                response.setHeader('Cache-Control', 'no-store');
                response.end(`${JSON.stringify(packageInfo(), null, 2)}\n`);
            });
        }
    };
}
