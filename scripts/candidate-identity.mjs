import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

export function candidateIdentity(repository = process.cwd()) {
    const git = (args) => execFileSync('git', args, { cwd: repository, encoding: 'utf8' });
    const paths = new Set(
        [
            ...git(['diff', '--name-only', '-z', 'HEAD']).split('\0'),
            ...git(['ls-files', '--others', '--exclude-standard', '-z']).split('\0')
        ].filter(Boolean)
    );
    return {
        head: git(['rev-parse', 'HEAD']).trim(),
        diff: git(['diff', 'HEAD', '--no-ext-diff', '--binary']),
        files: Object.fromEntries(
            [...paths].sort().map((file) => {
                const full = path.join(repository, file);
                return [
                    file,
                    existsSync(full)
                        ? createHash('sha256').update(readFileSync(full)).digest('hex')
                        : null
                ];
            })
        )
    };
}

export function consumerCandidateMetadata({ external = false } = {}, repository = process.cwd()) {
    return external ? {} : { candidate: candidateIdentity(repository) };
}
