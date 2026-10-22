// Standalone check of an installed browser consumer for the scroll-sync diagnostic.
// `npm run consumer:browser` copies and serves the diagnostic; this script only verifies,
// byte for byte, that the installed package matches its tarball and that the copied
// browser fixture matches both its recorded identity and the checkout. It writes nothing.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { gunzipSync } from 'node:zlib';
import { fixtureIdentity } from '../tests/browser/tooling/browser-fixture-hash.mjs';

const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readTarString(block, start, length) {
    const end = block.indexOf(0, start);
    return block.toString('utf8', start, end === -1 || end > start + length ? start + length : end);
}

/** Returns regular files of an uncompressed ustar/pax archive as a Map(path → Buffer). */
export function readTarEntries(archive) {
    const entries = new Map();
    let offset = 0;
    let paxPath = null;
    while (offset + 512 <= archive.length) {
        const header = archive.subarray(offset, offset + 512);
        if (header.every((byte) => byte === 0)) break;
        const size = Number.parseInt(readTarString(header, 124, 12).trim() || '0', 8);
        const type = String.fromCharCode(header[156] || 48);
        const prefix = readTarString(header, 345, 155);
        const name = readTarString(header, 0, 100);
        const body = archive.subarray(offset + 512, offset + 512 + size);
        if (body.length !== size) throw new Error('Truncated tar archive');
        if (type === 'x') {
            const record = body.toString('utf8').match(/^\d+ path=(.*)$/m);
            paxPath = record ? record[1] : null;
        } else if (type === '0') {
            entries.set(paxPath ?? (prefix ? `${prefix}/${name}` : name), Buffer.from(body));
            paxPath = null;
        } else {
            paxPath = null;
        }
        offset += 512 + Math.ceil(size / 512) * 512;
    }
    return entries;
}

function listFiles(directory, prefix = '') {
    return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const relative = path.posix.join(prefix, entry.name);
        return entry.isDirectory()
            ? listFiles(path.join(directory, entry.name), relative)
            : [relative];
    });
}

/** Compares the installed package directory byte-for-byte with the npm tarball. */
export function verifyInstalledPackage(tarball, installedDirectory) {
    const entries = readTarEntries(gunzipSync(readFileSync(tarball)));
    const expected = new Map(
        [...entries]
            .filter(([name]) => name.startsWith('package/'))
            .map(([name, contents]) => [name.slice('package/'.length), contents])
    );
    const installed = listFiles(installedDirectory);
    const problems = [];
    for (const [file, contents] of expected) {
        const target = path.join(installedDirectory, file);
        if (!existsSync(target)) problems.push(`missing ${file}`);
        else if (!readFileSync(target).equals(contents)) problems.push(`changed ${file}`);
    }
    for (const file of installed) {
        if (!expected.has(file)) problems.push(`unexpected ${file}`);
    }
    return { files: expected.size, problems };
}

export function checkInstalledConsumer({ consumer, expectSha256 }) {
    const browserDirectory = path.join(consumer, 'browser');
    const packageInfoFile = path.join(browserDirectory, 'package-info.json');
    if (!existsSync(packageInfoFile)) {
        throw new Error(`No installed consumer at ${consumer}; run npm run consumer:check first`);
    }
    const packageInfo = JSON.parse(readFileSync(packageInfoFile, 'utf8'));
    if (expectSha256 && packageInfo.sha256 !== expectSha256) {
        throw new Error(`Consumer has ${packageInfo.sha256}, expected ${expectSha256}`);
    }

    const tarballs = readdirSync(consumer).filter((file) => file.endsWith('.tgz'));
    if (tarballs.length !== 1) {
        throw new Error(`Expected one tarball in ${consumer}, found ${tarballs.length}`);
    }
    const tarball = path.join(consumer, tarballs[0]);
    const tarballSha256 = createHash('sha256').update(readFileSync(tarball)).digest('hex');
    if (tarballSha256 !== packageInfo.sha256) {
        throw new Error(`Tarball ${tarballSha256} does not match package-info.json`);
    }
    const name = packageInfo.package.slice(0, packageInfo.package.lastIndexOf('@'));
    const installed = verifyInstalledPackage(tarball, path.join(consumer, 'node_modules', name));
    if (installed.problems.length) {
        throw new Error(`Installed package differs from tarball: ${installed.problems.join(', ')}`);
    }

    // The copied fixture must match its recorded identity and the files in this checkout.
    let copied;
    try {
        copied = fixtureIdentity(browserDirectory);
    } catch (error) {
        throw new Error(
            `Consumer browser fixture is incomplete; regenerate it (${error.message})`,
            {
                cause: error
            }
        );
    }
    const committed = fixtureIdentity(path.join(repository, 'tests/browser'));
    for (const [field, value] of Object.entries(copied)) {
        if (packageInfo[field] !== value || committed[field] !== value) {
            throw new Error(`${field} differs from package-info.json or the checkout`);
        }
    }
    return { packageInfo, tarball, installedFiles: installed.files, identity: copied };
}

function main() {
    const { values: options } = parseArgs({
        options: {
            consumer: { type: 'string', default: 'test-results/consumer' },
            'expect-sha256': { type: 'string' },
            check: { type: 'boolean', default: false }
        }
    });
    if (!options.check) {
        console.error(
            'npm run consumer:browser now copies and serves the diagnostic. ' +
                'Use --check to verify an installed consumer.'
        );
        process.exitCode = 2;
        return;
    }
    let checked;
    try {
        checked = checkInstalledConsumer({
            consumer: path.resolve(options.consumer),
            expectSha256: options['expect-sha256']
        });
    } catch (error) {
        console.error(`Consumer check failed: ${error.message}`);
        process.exitCode = 1;
        return;
    }
    console.log(`Package: ${checked.packageInfo.package}`);
    console.log(`Tarball SHA-256: ${checked.packageInfo.sha256}`);
    console.log(`Installed files verified: ${checked.installedFiles}`);
    for (const [field, value] of Object.entries(checked.identity)) {
        console.log(`${field}: ${value}`);
    }
    console.log('Check only: no files written.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    main();
}
