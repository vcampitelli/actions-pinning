import Logger from '@/logger';
import chalk from 'chalk';
import extractActionsFromFile, {FoundAction} from './extractActionsFromFile';
import type {CommandOptions} from '../';
import type {Discovery} from './extractActionsFromFile';
import {Document, parseDocument, Scalar, stringify, YAMLMap, YAMLSeq} from 'yaml';
import {basename} from 'node:path';
import {exec as childExec} from 'node:child_process';
import {promisify} from 'node:util';
import {readFileSync, writeFileSync} from 'node:fs';

const exec = promisify(childExec);

type Output = {
    yaml: Document.Parsed;
    actions: FoundAction[];
};

const parseFile = (
    path: string,
    discovery: Discovery,
    options: CommandOptions,
    logger: Logger,
): Output => {
    const file = readFileSync(path, 'utf8');
    const yaml = parseDocument(file, {
        keepSourceTokens: true,
    });

    if (!yaml.has('jobs')) {
        throw new Error(`No jobs found at ${path}`);
    }

    return {
        yaml,
        actions: extractActionsFromFile(path, yaml, discovery, options, logger),
    };
};

export default async function parseFiles (
    paths: string[],
    options: CommandOptions,
    logger: Logger,
) {
    // Writing a new line before every file
    console.log();

    const discovery: Discovery = {};
    const actionsPerFile: Record<string, FoundAction[]> = {};
    const yamls: Record<string, Document.Parsed> = {};

    for (const path of paths) {
        const filename = basename(path);
        logger.debug(chalk.yellow.bold(`🗎 ${filename}`));
        const response = parseFile(path, discovery, options, logger);
        actionsPerFile[path] = response.actions;
        yamls[path] = response.yaml;
    }

    const packageNames = Object.keys(discovery);
    if (!packageNames.length) {
        console.log();
        logger.success('No files required fixing');
        return;
    }

    const promises: ReturnType<typeof exec>[] = [];
    const promiseNames: string[] = [];

    console.log();
    logger.info('Starting to fetch tags...');

    for (const packageFullName of packageNames) {
        const versions = Object.keys(discovery[packageFullName]);
        const url = (options.ssh) ? `git@github.com:${packageFullName}.git` : `https://github.com/${packageFullName}.git`;
        promises.push(exec(`git ls-remote --refs --tags "${url}" ${versions.join(' ')}`));
        promiseNames.push(packageFullName);
        versions.forEach((version) => logger.info(' ─ ' + chalk.cyan(`${packageFullName}@${version}`) + ' →  ...'));
    }

    const responses = await Promise.all(promises);
    process.stdout.moveCursor(0, -1 * packageNames.length);

    responses.forEach((response, key) => {
        if (!response) {
            return;
        }
        const {stdout, stderr} = response; // @TODO maybe check stderr as well?
        if (stderr.length) {
            console.error(`exec error: ${stderr}`);
            return;
        }

        const packageFullName = promiseNames[key];
        String(stdout).trimEnd().split('\n').forEach((line) => {
            const [commitSha, tagWithRef] = line.split('\t', 2);
            if (!tagWithRef.startsWith('refs/tags/')) {
                logger.error(chalk.red(` ─ Cannot understand tag ${tagWithRef}`));
                return;
            }

            const tag = tagWithRef.substring(10); // Stripping refs/tags/
            discovery[packageFullName][tag] = commitSha;
            logger.info(
                ' ─ ' + chalk.cyan(`${packageFullName}@${tag}`) + ' →  ' + chalk.green(commitSha),
            );
        });
    });

    console.log();
    logger.info('Writing files...');
    let dirtyCount = 0;
    for (const path of Object.keys(yamls)) {
        let isDirty = false;
        for (const action of actionsPerFile[path]) {
            const jobs = yamls[path].get('jobs') as YAMLMap<Scalar, YAMLMap> | undefined;
            if (!jobs) {
                throw new Error(`Can't find jobs in ${path}`);
            }

            // Sanity check
            const job = jobs.get(action.job) as YAMLMap | undefined;
            if (!job) {
                throw new Error(`Can't find job ${action.job} in ${path}`);
            }

            // Another sanity check
            const steps = job.get('steps') as YAMLSeq<YAMLMap> | undefined;
            if (!steps) {
                throw new Error(`Can't find step ${action.step} in ${path}`);
            }

            // Another sanity check
            const step = steps.get(action.step) as YAMLMap | undefined;
            if (!step) {
                throw new Error(`Can't find step ${action.step} in ${path}`);
            }

            // Another sanity check
            const uses = step.get('uses', true);
            if (!uses) {
                throw new Error(`Step ${action.step} doesn't have "uses" in ${path}`);
            }

            const foundVersion = discovery[action.package.name][action.package.version] as string;
            uses.value = `${action.package.name}@${foundVersion}`;
            uses.comment = `actions-pinning<${action.package.version}>`;
            isDirty = true;
        }
        if (isDirty) {
            dirtyCount++;
            logger.info(' ─ ' + chalk.cyan(path));
            writeFileSync(
                path,
                stringify(yamls[path], {
                    lineWidth: 0,
                }),
            );
        }
    }

    console.log();
    logger.success(`${chalk.bold(dirtyCount)} files were fixed`);
}
