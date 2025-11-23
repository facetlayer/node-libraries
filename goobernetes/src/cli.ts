#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(
    readFileSync(join(__dirname, '../package.json'), 'utf-8')
);

yargs(hideBin(process.argv))
    .scriptName('goobernetes')
    .version(packageJson.version)
    .usage('$0 <command> [options]')
    .command(
        'serve',
        'Start the goobernetes server',
        (yargs) => {
            return yargs
                .option('disable-api-key-check', {
                    type: 'boolean',
                    default: false,
                    describe: 'Disable API key validation'
                })
                .option('port', {
                    type: 'number',
                    default: 4715,
                    describe: 'Port number for the server'
                });
        },
        async (argv) => {
            const { startServer } = await import('./server/main');
            await startServer({
                disableAPIKeyCheck: argv['disable-api-key-check'],
                port: argv.port,
            });
        }
    )
    .command(
        'create-key',
        'Generate a new secret API key',
        () => {},
        async () => {
            const { generateSecretKey } = await import('./commands/generateSecretKey');
            const key = generateSecretKey();
            console.log('Generated new secret key:', key);
        }
    )
    .command(
        'set-deployments-dir <directory>',
        'Set the directory where deployments are stored',
        (yargs) => {
            return yargs
                .positional('directory', {
                    type: 'string',
                    describe: 'Path to the deployments directory',
                    demandOption: true,
                });
        },
        async (argv) => {
            const { setDeploymentsDir } = await import('./commands/setDeploymentsDir');
            setDeploymentsDir(argv.directory as string);
        }
    )
    .command(
        'deploy <config-file>',
        'Trigger a deployment using the specified configuration file',
        (yargs) => {
            return yargs
                .positional('config-file', {
                    type: 'string',
                    describe: 'Path to the deployment configuration file',
                    demandOption: true,
                })
                .option('override-dest', {
                    description: 'Override the destination URL from the config file',
                    type: 'string'
                });
        },
        async (argv) => {
            const { deploy } = await import('./client/deploy');
            await deploy({
                configFilename: argv['config-file'] as string,
                overrideDest: argv['override-dest'],
            });
        }
    )
    .command(
        'preview-deploy <config-file>',
        'Show the deployment preview for the specified configuration file',
        (yargs) => {
            return yargs
                .positional('config-file', {
                    type: 'string',
                    describe: 'Path to the deployment configuration file',
                    demandOption: true,
                });
        },
        async (argv) => {
            const { previewDeploy } = await import('./client/deployPreviewFiles');
            await previewDeploy({
                configFilename: argv['config-file'] as string,
            });
        }
    )
    .demandCommand(1, 'You must specify a command')
    .strict()
    .help()
    .parse();
