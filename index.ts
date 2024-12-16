import 'module-alias/register';
import {Command} from 'commander';
import packageJson from './package.json';
import pinCommand from '@/commands/pin';

const program = new Command();

program
    .name(packageJson.name)
    .description(packageJson.description)
    .version(packageJson.version)
    .argument('[path]', 'Base path for your repository', process.cwd())
    .option('--ssh', 'use SSH instead of HTTPS to fetch repository data from Git')
    .option('--verbose', 'verbose output')
    .option('--debug', 'debug output')
    .action(pinCommand);

program.parse();
