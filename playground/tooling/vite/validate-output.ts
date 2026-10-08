import { lstatSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import type { ResolvedConfig } from 'vite';

export function validatePlaygroundOutput(playgroundDirectory: string) {
    return {
        name: 'validate-playground-output',

        configResolved(config: ResolvedConfig) {
            const outputDirectory = resolve(config.root, config.build.outDir);
            const relativeOutput = relative(playgroundDirectory, outputDirectory);

            if (
                relativeOutput === '' ||
                relativeOutput === '..' ||
                relativeOutput.startsWith(`..${sep}`) ||
                isAbsolute(relativeOutput)
            ) {
                throw new Error(
                    '[playground] outDir must be a subdirectory of playground. ' +
                        `Received: ${outputDirectory}`
                );
            }

            let current = outputDirectory;

            while (true) {
                const entry = lstatSync(current, {
                    throwIfNoEntry: false
                });

                if (entry?.isSymbolicLink()) {
                    throw new Error('[playground] outDir cannot use symbolic links: ' + current);
                }

                if (relative(playgroundDirectory, current) === '') break;
                current = dirname(current);
            }
        }
    };
}
