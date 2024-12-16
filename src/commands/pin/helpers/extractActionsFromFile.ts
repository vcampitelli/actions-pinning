import Logger from '@/logger';
import chalk, {Chalk} from 'chalk';
import terminalLink from 'terminal-link';
import type {CommandOptions} from '../';
import {Document, Scalar, YAMLMap, YAMLSeq} from 'yaml';

export type Discovery = Record<string, Record<string, string | null>>;

export type FoundAction = {
    job: string;
    step: number;
    package: {
        name: string;
        version: string;
    };
};

export default function extractActionsFromFile (
    file: string,
    workflow: Document.Parsed,
    discovery: Discovery,
    options: CommandOptions,
    logger: Logger,
): FoundAction[] {
    const jobs = workflow.get('jobs') as YAMLMap<Scalar, YAMLMap>;
    const response: FoundAction[] = [];
    let jobIndex = -1;
    for (const jobPair of jobs.items) {
        jobIndex++;
        if (!jobPair.value) {
            continue;
        }

        const jobName = jobPair.key.value as string;
        const isLastJob = jobIndex === jobs.items.length - 1;
        const jobIcon = (isLastJob) ? ' ' : '│';

        logger.debug([
            '%s %s',
            chalk.dim((isLastJob) ? '└──' : '├──'),
            chalk.cyan.bold(jobName),
        ]);

        const job = jobPair.value;

        // Composite action
        if (job.has('uses')) {
            logger.debug(chalk.dim(`${jobIcon}    └── ☐  Skipping job ${jobName} as it is a composite action`));
            continue;
        }

        if (!job.has('steps')) {
            logger.debug(chalk.dim(`${jobIcon}    └── ☐  Skipping job ${jobName} as it doesn't have steps`));
            continue;
        }

        const steps = job.get('steps') as YAMLSeq<YAMLMap>;

        steps.items.forEach((step: YAMLMap, index: number) => {
            const stepIcon = (index === steps.items.length - 1) ? '└──' : '├──';

            const doLog = (color: Chalk, icon: string, message: string) => {
                logger.debug([
                    '%s   %s' + color(' %s  %s'),
                    chalk.dim(jobIcon),
                    chalk.dim(stepIcon),
                    icon,
                    message,
                ]);
            };

            const uses = step.get('uses') as string;
            if ((!uses) || (uses.startsWith('./'))) {
                doLog(
                    chalk.dim,
                    '☐',
                    (uses)
                        ? `Skipping step with custom action: ${chalk.bold(uses)}`
                        : `Skipping step without ${chalk.underline('uses')}`,
                );
                return;
            }

            const [packageFullName, version] = uses.split('@', 2);
            const [packageAuthor] = packageFullName.split('/', 2);
            const packageLink = terminalLink(packageFullName, `https://github.com/${packageFullName}`);

            if (options.ignorePackageAuthors.includes(packageAuthor)) {
                doLog(
                    chalk.dim,
                    '☐',
                    `Skipping ignored author: ${packageLink}`,
                );
                return;
            }

            // @FIXME better check for main branch
            const packageVersion = version ?? 'main';
            // @TODO check for short SHA and branches
            const isUsingSha = packageVersion.length === 40;
            doLog(
                (isUsingSha) ? chalk.green : chalk.red,
                (isUsingSha) ? '☑' : '☒',
                ((isUsingSha) ? 'Action uses SHA:' : 'Action doesn\'t use SHA:') + ` ${packageLink}@${packageVersion}`,
            );

            if (isUsingSha) {
                return;
            }

            if (!discovery[packageFullName]) { // @FIXME maybe create a class
                discovery[packageFullName] = {};
            }
            if (!discovery[packageFullName][packageVersion]) {
                discovery[packageFullName][packageVersion] = null;
            }
            response.push({
                job: jobName,
                step: index,
                package: {
                    name: packageFullName,
                    version: packageVersion,
                },
            });
        });
    }
    return response;
}
