import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import {
    existsSync,
    mkdirSync,
    mkdtempSync,
    readFileSync,
    rmSync,
    symlinkSync,
    writeFileSync
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { createConsumerWorkspace as createWorkspace } from '../../scripts/consumer-workspace.mjs';

const createConsumerWorkspace = (repository) =>
    createWorkspace(repository, undefined, { external: true });

const fixture = fileURLToPath(new URL('./fixtures/consumer-workspace.mjs', import.meta.url));

function project(t) {
    const directory = mkdtempSync(path.join(os.tmpdir(), 'scrollprogress-tooling-test-'));
    t.after(() => rmSync(directory, { recursive: true, force: true }));
    return directory;
}

async function launch(t, repository, mode, storage = 'external') {
    const child = spawn(process.execPath, [fixture, repository, mode, storage], {
        stdio: ['ignore', 'pipe', 'pipe', 'ipc']
    });
    const messages = [];
    let stderr = '';
    child.stdout.resume();
    child.stderr.on('data', (data) => {
        stderr += data;
    });
    child.on('message', (message) => messages.push(message));
    const closed = once(child, 'close');
    // Register before the child can exit; clean our own fixtures even on assertion failure.
    t.after(async () => {
        if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
        await closed;
        for (const message of messages) {
            if (message.directory) rmSync(message.directory, { recursive: true, force: true });
        }
    });
    const [{ directory }] = await once(child, 'message');
    return { child, directory, closed, messages, stderr: () => stderr };
}

for (const mode of ['normal', 'error', 'rejection']) {
    test(`removes the entire consumer on ${mode} exit`, { timeout: 10000 }, async (t) => {
        const run = await launch(t, project(t), mode);
        const [code] = await run.closed;
        assert.equal(code, mode === 'normal' ? 0 : 1);
        assert.equal(existsSync(run.directory), false);
        if (mode !== 'normal') assert.match(run.stderr(), /Deliberate/);
    });
}

test(
    'signal handler waits for server shutdown and removes the installation',
    { timeout: 10000 },
    async (t) => {
        const run = await launch(t, project(t), 'signal');
        const [code] = await run.closed;
        assert.equal(code, 130);
        assert(run.messages.some((message) => message.serverClosed));
        assert.equal(existsSync(run.directory), false);
    }
);

for (const [signal, code] of [
    ['SIGINT', 130],
    ['SIGTERM', 143],
    ['SIGHUP', 129]
]) {
    // Windows programmatic kill is unconditional; a terminal Ctrl+C is a separate native check.
    test(
        `cleans up on native ${signal}`,
        { skip: process.platform === 'win32', timeout: 10000 },
        async (t) => {
            const run = await launch(t, project(t), 'wait');
            run.child.kill(signal);
            assert.equal((await run.closed)[0], code);
            assert(run.messages.some((message) => message.serverClosed));
            assert.equal(existsSync(run.directory), false);
        }
    );
}

test(
    'preserves a live consumer and recovers it after forced termination',
    { timeout: 10000 },
    async (t) => {
        const repository = project(t);
        const run = await launch(t, repository, 'wait');
        const concurrent = createConsumerWorkspace(repository);
        t.after(concurrent.cleanup);
        assert(existsSync(run.directory), 'another active run must not be deleted');
        concurrent.cleanup();
        concurrent.cleanup(); // Explicit cleanup is idempotent.
        run.child.kill('SIGKILL');
        await run.closed;
        assert(existsSync(run.directory), 'SIGKILL cannot execute cleanup');
        const next = createConsumerWorkspace(repository);
        t.after(next.cleanup);
        assert.equal(existsSync(run.directory), false, 'next run recovers abandoned files');
        assert(existsSync(next.directory));
    }
);

test(
    'does not recover directories belonging to a different checkout',
    { timeout: 10000 },
    async (t) => {
        const run = await launch(t, project(t), 'wait');
        run.child.kill('SIGKILL');
        await run.closed;
        const other = createConsumerWorkspace(project(t));
        t.after(other.cleanup);
        assert(existsSync(run.directory));
    }
);

test('never follows a stale-looking symlink during recovery', { timeout: 10000 }, async (t) => {
    const repository = project(t);
    const run = await launch(t, repository, 'wait');
    run.child.kill('SIGKILL');
    await run.closed;
    rmSync(run.directory, { recursive: true });
    const target = path.join(repository, 'keep');
    mkdirSync(target);
    const sentinel = path.join(target, 'important.txt');
    writeFileSync(sentinel, 'Keep me');
    symlinkSync(target, run.directory, 'junction');
    const next = createConsumerWorkspace(repository);
    t.after(next.cleanup);
    assert.equal(readFileSync(sentinel, 'utf8'), 'Keep me');
    assert(existsSync(run.directory));
});

for (const storage of ['local', 'external'])
    test(`a failed pack preserves earlier reports with ${storage} storage`, (t) => {
        const repository = project(t);
        writeFileSync(
            path.join(repository, 'package.json'),
            JSON.stringify({ name: 'consumer-test', private: true })
        );
        const results = path.join(repository, 'test-results');
        mkdirSync(results);
        const report = path.join(results, 'consumer-latest.json');
        const archive = path.join(results, 'consumer-latest.tgz');
        writeFileSync(report, 'Previous successful report');
        writeFileSync(archive, 'Previous successful archive');
        const result = spawnSync(
            process.execPath,
            [
                fileURLToPath(new URL('../../scripts/check-consumer.mjs', import.meta.url)),
                ...(storage === 'external' ? ['--external'] : [])
            ],
            {
                cwd: repository,
                encoding: 'utf8',
                timeout: 10000,
                env: {
                    ...process.env,
                    npm_execpath: fileURLToPath(
                        new URL('./fixtures/fail-command.mjs', import.meta.url)
                    )
                }
            }
        );
        assert.equal(result.status, 1);
        assert.match(result.stderr, /Deliberate npm pack failure/);
        const directory = result.stdout.match(
            /^(?:Temporary consumer \(removed on exit\)|Consumer directory \(kept after exit\)): (.+)$/m
        )?.[1];
        assert(directory, result.stdout);
        assert.equal(existsSync(directory), storage === 'local');
        assert.equal(existsSync(path.join(directory, '.running')), false);
        assert.equal(readFileSync(report, 'utf8'), 'Previous successful report');
        assert.equal(readFileSync(archive, 'utf8'), 'Previous successful archive');
    });

test('reuses a visible project directory and replaces only its generated contents', (t) => {
    const repository = project(t);
    const first = createWorkspace(repository);
    t.after(first.cleanup);
    assert.equal(first.directory, path.join(repository, 'test-results', 'consumer'));
    const oldFile = path.join(first.directory, 'old-output.txt');
    writeFileSync(oldFile, 'Keep until next run');
    first.cleanup();
    assert(existsSync(oldFile));
    const second = createWorkspace(repository);
    t.after(second.cleanup);
    assert.equal(second.directory, first.directory);
    assert.equal(existsSync(oldFile), false);
});

for (const mode of ['normal', 'error', 'rejection', 'signal']) {
    test(
        `local ${mode} exit retains files and releases the directory`,
        { timeout: 10000 },
        async (t) => {
            const repository = project(t);
            const run = await launch(t, repository, mode, 'local');
            await run.closed;
            assert(existsSync(path.join(run.directory, 'node_modules', 'sample', 'index.js')));
            assert.equal(existsSync(path.join(run.directory, '.running')), false);
            const next = createWorkspace(repository);
            t.after(next.cleanup);
            assert.equal(next.directory, run.directory);
        }
    );
}

test(
    'a running local consumer is preserved and another name can run independently',
    { timeout: 10000 },
    async (t) => {
        const repository = project(t);
        const run = await launch(t, repository, 'wait', 'local');
        assert.throws(
            () => createWorkspace(repository),
            (error) => {
                assert.match(error.message, /already in use/);
                assert.equal(error.cause.code, 'EEXIST');
                return true;
            }
        );
        assert(existsSync(path.join(run.directory, 'node_modules', 'sample', 'index.js')));
        const other = createWorkspace(repository, undefined, { name: 'comparison' });
        t.after(other.cleanup);
        assert.equal(other.directory, path.join(repository, 'test-results', 'comparison'));
    }
);

test(
    'a forcibly stopped local run is visible and can be explicitly deleted and recreated',
    { timeout: 10000 },
    async (t) => {
        const repository = project(t);
        const run = await launch(t, repository, 'wait', 'local');
        run.child.kill('SIGKILL');
        await run.closed;
        assert(existsSync(run.directory));
        assert.throws(() => createWorkspace(repository), /After a forced termination, delete/);
        rmSync(run.directory, { recursive: true });
        const next = createWorkspace(repository);
        t.after(next.cleanup);
        assert.equal(next.directory, run.directory);
    }
);

for (const name of ['reports', 'history', 'lint-format-review', 'typecheck-separation']) {
    test(`reserves ${name} before creating a consumer directory`, (t) => {
        const repository = project(t);

        assert.throws(
            () => createWorkspace(repository, undefined, { name }),
            /reserved for saved results/
        );

        assert.equal(existsSync(path.join(repository, 'test-results')), false);
    });

    test(`preserves ${name} even with a legacy consumer marker`, (t) => {
        const repository = project(t);
        const consumer = createWorkspace(repository);

        t.after(consumer.cleanup);

        const savedDirectory = path.join(repository, 'test-results', name);

        mkdirSync(savedDirectory);

        writeFileSync(
            path.join(savedDirectory, '.scrollprogress-consumer'),
            readFileSync(path.join(consumer.directory, '.scrollprogress-consumer'))
        );

        const savedFile = path.join(savedDirectory, 'notes.txt');

        writeFileSync(savedFile, 'Keep this result');

        assert.throws(
            () => createWorkspace(repository, undefined, { name }),
            /reserved for saved results/
        );

        assert.equal(readFileSync(savedFile, 'utf8'), 'Keep this result');
        assert.equal(existsSync(path.join(savedDirectory, '.running')), false);
    });
}

test('rejects unsafe names, symlinks and unrecognized directories without deleting their data', (t) => {
    const repository = project(t);
    for (const name of ['../src', '/tmp/test', '..', 'a/b', 'a\\b', '']) {
        assert.throws(() => createWorkspace(repository, undefined, { name }), /Consumer name/);
    }
    const unknown = path.join(repository, 'test-results', 'consumer');
    mkdirSync(unknown, { recursive: true });
    const sentinel = path.join(unknown, 'important.txt');
    writeFileSync(sentinel, 'Keep me');
    assert.throws(() => createWorkspace(repository), /unrecognized directory/);
    assert.equal(readFileSync(sentinel, 'utf8'), 'Keep me');
    const linked = path.join(repository, 'test-results', 'linked');
    symlinkSync(unknown, linked, 'junction');
    assert.throws(() => createWorkspace(repository, undefined, { name: 'linked' }), /symlink/);
    assert.equal(readFileSync(sentinel, 'utf8'), 'Keep me');
});
