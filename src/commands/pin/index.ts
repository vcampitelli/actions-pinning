import parseFiles from './helpers/parseFiles';
import {readdirSync} from 'node:fs';
import Logger, {Verbosity} from '@/logger';
import chalk from 'chalk';

export type CommandOptions = {
    verbose: boolean;
    debug: boolean;
    ssh: boolean;
    ignorePackageAuthors: string[];
};

function parseOptions (options: CommandOptions): CommandOptions {
    if (!options.ignorePackageAuthors) {
        options.ignorePackageAuthors = ['actions'];
    }
    if (options.debug) {
        options.verbose = true;
    }
    return options;
}

export default async function pinCommand (path: string, options: CommandOptions): Promise<void> {
    // Trimming last /
    path = path.replace(/\/$/, '');

    // Some friendliness in path checking
    path = path.endsWith('.github')
        ? `${path}/workflows`
        : path.endsWith('.github/workflows') ? path : `${path}/.github/workflows`;

    options = parseOptions(options);
    const logger = new Logger(
        (options.debug) ? Verbosity.Debug : (options.verbose) ? Verbosity.Verbose : Verbosity.Off,
    );

    logger.info(['Reading path %s...', chalk.cyan(path)]);

    try {
        const files = readdirSync(path, {withFileTypes: true})
            .filter(item => item.isFile() && (item.name.endsWith('.yaml') || item.name.endsWith('.yml')));

        if (!files.length) {
            logger.log(`No YAML files found at ${path}, skipping...`);
            return;
        }

        const fileNames = files.map(file => file.name);

        logger.info([
            'Found files: %s',
            chalk.cyan(fileNames.join(', ')),
        ]);

        await parseFiles(
            files.map(file => `${file.parentPath}/${file.name}`),
            options,
            logger,
        );
    } catch (err: unknown) {
        const message = (err instanceof Error) ? err.message : String(err);
        logger.error(message);
        if (options.debug) {
            console.error(err);
        }
        process.exit(1);
    }
}
