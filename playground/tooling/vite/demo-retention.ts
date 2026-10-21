import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve, basename, relative } from 'node:path';
import ts from 'typescript';
import { normalizePath, type ResolvedConfig, type Rolldown } from 'vite';
import { demoMarkerPattern } from './demo-includes.ts';

export function executableSelectors(code: string): Set<string> {
    const selectors = new Set<string>();
    const source = ts.createSourceFile('demo.ts', code, ts.ScriptTarget.Latest, true);
    function visit(node: ts.Node) {
        if (ts.isCallExpression(node)) {
            for (const argument of node.arguments) {
                if (ts.isStringLiteralLike(argument) && argument.text.startsWith('[data-')) {
                    selectors.add(argument.text);
                }
            }
        }
        ts.forEachChild(node, visit);
    }
    visit(source);
    return selectors;
}

export function assertDemoSelectors(code: string, expected: Iterable<string>, identity: string) {
    const retained = executableSelectors(code);
    for (const selector of expected) {
        assert(
            retained.has(selector),
            `Missing executable demo initialization in ${identity}: ${selector}`
        );
    }
}

function localModuleGraph(entries: string[]): Set<string> {
    const visited = new Set<string>();
    function collect(file: string) {
        if (visited.has(file)) return;
        assert(existsSync(file), `Missing demo source script: ${file}`);
        visited.add(file);
        const source = ts.createSourceFile(
            file,
            readFileSync(file, 'utf8'),
            ts.ScriptTarget.Latest,
            true
        );
        for (const statement of source.statements) {
            if (!ts.isImportDeclaration(statement) && !ts.isExportDeclaration(statement)) continue;
            const specifier = statement.moduleSpecifier;
            if (!specifier || !ts.isStringLiteral(specifier)) continue;
            const name = specifier.text;
            if (!name.startsWith('.') || /[?#]|\.css$|\.s[ac]ss$/.test(name)) continue;
            const target = resolve(dirname(file), name);
            const resolved = [
                target,
                `${target}.ts`,
                `${target}.js`,
                resolve(target, 'index.ts')
            ].find((candidate) => /\.[cm]?[jt]s$/.test(candidate) && existsSync(candidate));
            assert(resolved, `Missing local demo import: ${name} in ${file}`);
            collect(resolved);
        }
    }
    entries.forEach(collect);
    return visited;
}

export function validateDemoRetention(playgroundDirectory: string) {
    let root = playgroundDirectory;
    let inputs: string[] = [];
    return {
        name: 'validate-demo-retention',
        configResolved(config: ResolvedConfig) {
            root = config.root;
            const input = config.build.rolldownOptions.input;
            inputs = (
                typeof input === 'string'
                    ? [input]
                    : Array.isArray(input)
                      ? input
                      : Object.values(input ?? { index: 'index.html' })
            ).map((file) => resolve(root, file));
        },
        writeBundle(_options: unknown, bundle: Rolldown.OutputBundle) {
            for (const input of inputs) {
                if (!input.endsWith('.html')) continue;
                const htmlSource = readFileSync(input, 'utf8');
                const demoIds = [...htmlSource.matchAll(new RegExp(demoMarkerPattern))].map(
                    (match) => match[1]
                );
                if (demoIds.length === 0) continue;
                assert.equal(
                    new Set(demoIds).size,
                    demoIds.length,
                    `Duplicate demo marker: ${input}`
                );
                const sourceScripts = [...htmlSource.matchAll(/<script\b([^>]*)>/g)]
                    .filter(([, attributes]) => /\btype=["']module["']/.test(attributes))
                    .map(([, attributes]) => /\bsrc=["']([^"']+)["']/.exec(attributes)?.[1]);
                assert(
                    sourceScripts.length > 0 && sourceScripts.every(Boolean),
                    `Missing demo module script: ${input}`
                );
                const entries = sourceScripts.map((src) => {
                    assert(src && !/^(?:[a-z]+:)?\/\//i.test(src), `Non-local demo script: ${src}`);
                    const clean = decodeURIComponent(src.split(/[?#]/)[0]);
                    return resolve(
                        clean.startsWith('/') ? root : dirname(input),
                        clean.replace(/^\//, '')
                    );
                });
                const graph = localModuleGraph(entries);
                const page = normalizePath(relative(root, input));
                const html = bundle[page];
                assert(html?.type === 'asset', `Missing demo page: ${page}`);
                const scripts = [
                    ...String(html.source).matchAll(/<script\b[^>]*\bsrc="([^"]+\.js)"/g)
                ];
                const visited = new Set<string>();
                const code: string[] = [];
                function collect(file: string) {
                    if (visited.has(file)) return;
                    visited.add(file);
                    const chunk = bundle[file];
                    assert(chunk?.type === 'chunk', `Missing demo chunk: ${file}`);
                    code.push(chunk.code);
                    chunk.imports.forEach(collect);
                }
                for (const [, url] of scripts) {
                    const file = Object.keys(bundle).find(
                        (key) => key.endsWith(`/${basename(url)}`) || key === basename(url)
                    );
                    assert(file, `Missing script asset: ${url}`);
                    collect(file);
                }
                for (const id of demoIds) {
                    const demoPath = resolve(playgroundDirectory, 'demos', id, 'main.ts');
                    assert(graph.has(demoPath), `Missing declared demo import: ${page}:${id}`);
                    const expected = executableSelectors(readFileSync(demoPath, 'utf8'));
                    assert(expected.size > 0, `Missing selector contract: ${id}`);
                    assertDemoSelectors(code.join('\n'), expected, `${page}:${id}`);
                }
            }
        }
    };
}
