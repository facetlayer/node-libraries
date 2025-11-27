#! /usr/bin/env node

import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { getOrCreateStateDirectory } from '@facetlayer/userdata-db'
import { listDeployments } from './listCommand'
import { serveCommand } from './serveCommand'

export interface CommonOptions {
  appName: string
  deployDir: string
}

function addCommonOptions<T>(yargs: yargs.Argv<T>) {
  return yargs
    .option('deploy-dir', {
      type: 'string',
      describe: 'Directory for deployments (defaults to goobernetes state directory)'
    })
    .option('app-name', {
      type: 'string',
      default: 'goobernetes',
      describe: 'Application name for database lookup'
    })
}

function resolveCommonOptions(argv: { 'app-name': string; 'deploy-dir'?: string }): CommonOptions {
  const appName = argv['app-name']
  const deployDir = argv['deploy-dir'] || getOrCreateStateDirectory(appName)
  return { appName, deployDir }
}

async function main() {
  await yargs(hideBin(process.argv))
    .command(
      'serve',
      'Start the static web server',
      (yargs) => {
        return addCommonOptions(yargs)
          .option('port', {
            type: 'number',
            default: 4716,
            describe: 'Port number for the server'
          })
      },
      async (argv) => {
        const { appName, deployDir } = resolveCommonOptions(argv)
        const port = argv.port

        await serveCommand({ appName, deployDir, port })
      }
    )
    .command(
      'list',
      'List all deployments with web static directories',
      (yargs) => addCommonOptions(yargs),
      async (argv) => {
        const { appName, deployDir } = resolveCommonOptions(argv)
        await listDeployments({ appName, deployDir })
      }
    )
    .demandCommand(1, 'You must specify a command')
    .help()
    .argv
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
