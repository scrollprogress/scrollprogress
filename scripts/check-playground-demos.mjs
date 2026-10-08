import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { build, createServer } from 'vite';

import { createDemoProjectEntries } from '../playground/demo-tools/project.ts';

function command(executable, args, cwd) {
    const result = spawnSync(executable, args, { cwd, encoding: 'utf8' });
    if (result.error) throw result.error;
    if (result.status !== 0) {
        process.stderr.write(result.stdout ?? '');
        process.stderr.write(result.stderr ?? '');
        throw new Error(`${executable} ${args.join(' ')} exited ${result.status}`);
    }
    return result.stdout;
}

function projectDirectory(root, demo, language) {
    return path.join(root, language, ...demo.id.split('/'));
}

function writeProject(directory, entries) {
    const resolvedDirectory = path.resolve(directory);

    for (const entry of entries) {
        const destination = path.resolve(directory, entry.name);
        assert(
            destination.startsWith(`${resolvedDirectory}${path.sep}`),
            `Demo project entry escapes its directory: ${entry.name}`
        );
        mkdirSync(path.dirname(destination), { recursive: true });
        writeFileSync(destination, entry.content);
    }
}

async function loadPlaygroundDemos(repository) {
    const server = await createServer({
        configFile: path.join(repository, 'vite.config.ts'),
        root: path.join(repository, 'playground'),
        appType: 'custom',
        logLevel: 'error',
        server: { hmr: false, middlewareMode: true, watch: null, ws: false }
    });

    try {
        const catalog = await server.ssrLoadModule('/demos/catalog.ts');
        assert(Array.isArray(catalog.playgroundDemos), 'Playground catalog did not export demos.');
        return catalog.playgroundDemos;
    } finally {
        await server.close();
    }
}

function patchPackageDependency(project, packageName, packageVersion, tarball) {
    const manifestPath = path.join(project, 'package.json');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    assert.equal(manifest.dependencies[packageName], packageVersion);
    manifest.dependencies[packageName] = `file:${tarball}`;
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    return manifest.name;
}

function assertProjectVersions(entries, packageManifest, language) {
    const manifestEntry = entries.find(({ name }) => name === 'package.json');
    assert(manifestEntry, 'Generated demo project is missing package.json.');
    const manifest = JSON.parse(manifestEntry.content);

    assert.equal(manifest.dependencies[packageManifest.name], packageManifest.version);
    for (const dependency of ['@tailwindcss/vite', 'tailwindcss', 'vite'])
        assert.equal(
            manifest.devDependencies[dependency],
            packageManifest.devDependencies[dependency]
        );
    if (language === 'typescript')
        assert.equal(
            manifest.devDependencies.typescript,
            packageManifest.devDependencies.typescript
        );
    else assert.equal('typescript' in manifest.devDependencies, false);
}

async function checkAllDemoSources({ repository, validationDirectory, demos, packageManifest }) {
    const typescriptFiles = [];
    const javascriptInputs = {};
    const projectDependencies = createProjectDependencies(packageManifest);

    for (const demo of demos) {
        const typescriptDirectory = projectDirectory(validationDirectory, demo, 'typescript');
        const javascriptDirectory = projectDirectory(validationDirectory, demo, 'javascript');
        const typescriptEntries = createDemoProjectEntries(demo, 'typescript', projectDependencies);
        const javascriptEntries = createDemoProjectEntries(demo, 'javascript', projectDependencies);
        assertProjectVersions(typescriptEntries, packageManifest, 'typescript');
        assertProjectVersions(javascriptEntries, packageManifest, 'javascript');
        writeProject(typescriptDirectory, typescriptEntries);
        writeProject(javascriptDirectory, javascriptEntries);
        typescriptFiles.push(path.join(typescriptDirectory, 'src/main.ts'));
        javascriptInputs[demo.id.replaceAll('/', '-')] = path.join(
            javascriptDirectory,
            'src/main.js'
        );
    }

    const environmentTypes = path.join(validationDirectory, 'demo-environment.d.ts');
    writeFileSync(
        environmentTypes,
        `declare module '*.css';
interface ImportMeta {
    readonly hot?: { dispose(callback: () => void): void };
}
`
    );
    const tsconfig = path.join(validationDirectory, 'tsconfig.all-demos.json');
    writeFileSync(
        tsconfig,
        `${JSON.stringify(
            {
                files: [environmentTypes, ...typescriptFiles],
                compilerOptions: {
                    target: 'ES2023',
                    module: 'ESNext',
                    lib: ['ES2023', 'DOM', 'DOM.Iterable'],
                    moduleResolution: 'Bundler',
                    strict: true,
                    noEmit: true,
                    types: []
                }
            },
            null,
            2
        )}\n`
    );
    command(
        process.execPath,
        [path.join(repository, 'node_modules/typescript/bin/tsc'), '--project', tsconfig],
        validationDirectory
    );

    const localStylePrefix = '\0playground-demo-style:';
    await build({
        configFile: false,
        root: validationDirectory,
        publicDir: false,
        logLevel: 'error',
        plugins: [
            {
                name: 'ignore-downloaded-demo-styles',
                enforce: 'pre',
                resolveId(source, importer) {
                    if (source === './style.css' && importer)
                        return `${localStylePrefix}${importer}`;
                    return null;
                },
                load(id) {
                    return id.startsWith(localStylePrefix) ? '' : null;
                }
            }
        ],
        build: {
            write: false,
            minify: false,
            rolldownOptions: { input: javascriptInputs }
        }
    });
}

function prepareRepresentativeProjects({ demos, projectsDirectory, packageManifest, tarball }) {
    const representatives = [
        { id: 'debug/lab', language: 'typescript' },
        { id: 'experiments/json-feed', language: 'javascript' }
    ];
    const workspaces = [];
    const packageNames = [];
    const projectDependencies = createProjectDependencies(packageManifest);

    for (const representative of representatives) {
        const demo = demos.find(({ id }) => id === representative.id);
        assert(demo, `Missing representative demo: ${representative.id}`);
        const workspace = representative.language;
        const directory = path.join(projectsDirectory, workspace);
        writeProject(
            directory,
            createDemoProjectEntries(demo, representative.language, projectDependencies)
        );
        packageNames.push(
            patchPackageDependency(
                directory,
                packageManifest.name,
                packageManifest.version,
                tarball
            )
        );
        workspaces.push(workspace);
    }

    writeFileSync(
        path.join(projectsDirectory, 'package.json'),
        `${JSON.stringify({ private: true, workspaces }, null, 2)}\n`
    );
    return packageNames;
}

function createProjectDependencies(packageManifest) {
    return {
        packageName: packageManifest.name,
        packageVersion: packageManifest.version,
        viteVersion: packageManifest.devDependencies.vite,
        typescriptVersion: packageManifest.devDependencies.typescript,
        tailwindVersion: packageManifest.devDependencies.tailwindcss,
        tailwindViteVersion: packageManifest.devDependencies['@tailwindcss/vite']
    };
}

export async function checkPlaygroundDemoProjects({
    repository,
    consumerDirectory,
    tarball,
    npmCli,
    packageManifest
}) {
    const demos = await loadPlaygroundDemos(repository);
    const validationDirectory = path.join(consumerDirectory, 'playground-demo-validation');
    mkdirSync(validationDirectory, { recursive: true });
    await checkAllDemoSources({ repository, validationDirectory, demos, packageManifest });

    const projectsDirectory = path.join(consumerDirectory, 'playground-download-projects');
    mkdirSync(projectsDirectory, { recursive: true });
    const packageNames = prepareRepresentativeProjects({
        demos,
        projectsDirectory,
        packageManifest,
        tarball
    });
    command(
        process.execPath,
        [npmCli, 'install', '--ignore-scripts', '--no-audit', '--no-fund', '--prefer-offline'],
        projectsDirectory
    );
    for (const packageName of packageNames) {
        command(
            process.execPath,
            [npmCli, 'run', 'build', `--workspace=${packageName}`],
            projectsDirectory
        );
    }

    return { demos: demos.length, projects: packageNames.length };
}
