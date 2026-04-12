#!/usr/bin/env node

import { disableSqliteExperimentalWarning } from '@facetlayer/sqlite-wrapper';
disableSqliteExperimentalWarning();
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
                    demandOption: true,
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
        'preview-deploy-files <config-file>',
        'Show the local files that would be included in a deployment',
        (yargs) => {
            return yargs
                .positional('config-file', {
                    type: 'string',
                    describe: 'Path to the deployment configuration file',
                    demandOption: true,
                });
        },
        async (argv) => {
            const { previewDeployFiles } = await import('./client/deployPreviewFiles');
            await previewDeployFiles({
                configFilename: argv['config-file'] as string,
            });
        }
    )
    .command(
        'preview-deploy <config-file>',
        'Preview deployment drift: show which files would be uploaded, deleted, or are server-only',
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
            const { previewDeploy } = await import('./client/previewDeploy');
            await previewDeploy({
                configFilename: argv['config-file'] as string,
                overrideDest: argv['override-dest'],
            });
        }
    )
    .command(
        'sql <config-file> <sql>',
        'Run a SQL query on a database in a deployed project',
        (yargs) => {
            return yargs
                .positional('config-file', {
                    type: 'string',
                    describe: 'Path to the deployment configuration file',
                    demandOption: true,
                })
                .positional('sql', {
                    type: 'string',
                    describe: 'SQL query to execute',
                    demandOption: true,
                })
                .option('database', {
                    type: 'string',
                    describe: 'Explicit database file path (relative to project dir) to use',
                })
                .option('override-dest', {
                    description: 'Override the destination URL from the config file',
                    type: 'string'
                });
        },
        async (argv) => {
            const { runSqlCommand } = await import('./client/sqlCommand');
            await runSqlCommand({
                configFilename: argv['config-file'] as string,
                sql: argv['sql'] as string,
                database: argv['database'],
                overrideDest: argv['override-dest'],
            });
        }
    )
    .command(
        'list-databases <config-file>',
        'List the databases configured for a deployed project',
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
            const { listDatabasesCommand } = await import('./client/sqlCommand');
            await listDatabasesCommand({
                configFilename: argv['config-file'] as string,
                overrideDest: argv['override-dest'],
            });
        }
    )
    .command(
        'rollback <config-file> [deploy-name]',
        'Roll back a project to a previous deployment',
        (yargs) => {
            return yargs
                .positional('config-file', {
                    type: 'string',
                    describe: 'Path to the deployment configuration file',
                    demandOption: true,
                })
                .positional('deploy-name', {
                    type: 'string',
                    describe: 'Name of the deployment to roll back to (omit to choose interactively)',
                })
                .option('override-dest', {
                    description: 'Override the destination URL from the config file',
                    type: 'string'
                })
                .option('limit', {
                    type: 'number',
                    default: 10,
                    describe: 'Number of recent deployments to list',
                });
        },
        async (argv) => {
            const { rollback } = await import('./client/rollback');
            await rollback({
                configFilename: argv['config-file'] as string,
                deployName: argv['deploy-name'] as string | undefined,
                overrideDest: argv['override-dest'],
                limit: argv.limit,
            });
        }
    )
    .command(
        'history <config-file>',
        'Show deployment history and current active deployment for a project',
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
                })
                .option('limit', {
                    type: 'number',
                    default: 10,
                    describe: 'Number of recent deployments to show',
                });
        },
        async (argv) => {
            const { history } = await import('./client/history');
            await history({
                configFilename: argv['config-file'] as string,
                overrideDest: argv['override-dest'],
                limit: argv.limit,
            });
        }
    )
    .command(
        'copy-back <config-file> <filename>',
        'Copy a file from the server back to the local filesystem',
        (yargs) => {
            return yargs
                .positional('config-file', {
                    type: 'string',
                    describe: 'Path to the deployment configuration file',
                    demandOption: true,
                })
                .positional('filename', {
                    type: 'string',
                    describe: 'Relative path of the file to copy back from the server',
                    demandOption: true,
                })
                .option('override-dest', {
                    description: 'Override the destination URL from the config file',
                    type: 'string'
                });
        },
        async (argv) => {
            const { copyBack } = await import('./client/copyBack');
            await copyBack({
                configFilename: argv['config-file'] as string,
                filename: argv['filename'] as string,
                overrideDest: argv['override-dest'],
            });
        }
    )
    .demandCommand(1, 'You must specify a command')
    .strict()
    .help()
    .parse();
