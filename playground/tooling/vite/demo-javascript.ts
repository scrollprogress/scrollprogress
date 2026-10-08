import { readFileSync } from 'node:fs';
import prettier from 'prettier';
import ts from 'typescript';

const demoJavaScriptQuery = '?demo-js';

export function playgroundDemoJavaScript() {
    return {
        name: 'playground-demo-javascript',
        enforce: 'pre' as const,

        async load(id: string) {
            if (!id.endsWith(demoJavaScriptQuery)) return null;

            const sourcePath = id.slice(0, -demoJavaScriptQuery.length);

            if (!sourcePath.endsWith('.ts')) {
                throw new Error(`[playground] JavaScript demo source must be TypeScript: ${id}`);
            }

            const result = ts.transpileModule(readFileSync(sourcePath, 'utf8'), {
                fileName: sourcePath,
                compilerOptions: {
                    target: ts.ScriptTarget.ES2023,
                    module: ts.ModuleKind.ESNext,
                    verbatimModuleSyntax: true
                }
            });
            const javascript = await prettier.format(result.outputText, {
                parser: 'babel',
                singleQuote: true,
                tabWidth: 4
            });

            return `export default ${JSON.stringify(javascript)};`;
        }
    };
}
