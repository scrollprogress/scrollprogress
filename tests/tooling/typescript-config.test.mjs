import assert from 'node:assert/strict';
import test from 'node:test';
import ts from 'typescript';

function paths(file) {
    const config = ts.getParsedCommandLineOfConfigFile(
        file,
        {},
        {
            ...ts.sys,
            onUnRecoverableConfigFileDiagnostic: (diagnostic) => {
                throw new Error(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
            }
        }
    );
    return config.options.paths;
}

test('general, playground and declaration builds keep their intended public-import scopes', () => {
    assert.deepEqual(paths('tsconfig.json')['@scrollprogress/scrollprogress'], [
        './dist/index.d.ts'
    ]);
    assert.deepEqual(paths('tsconfig.playground.json')['@scrollprogress/scrollprogress'], [
        './src/lib/index.ts'
    ]);
    assert.deepEqual(paths('tsconfig.build.json'), {});
});
