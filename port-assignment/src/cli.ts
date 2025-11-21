#!/usr/bin/env node

import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import {
  claimUnusedPort,
  getPortAssignments,
  releasePort,
  resetPortAssignments,
  isPortAssigned,
  isPortActuallyAvailable
} from './index.js'

async function main() {
  await yargs(hideBin(process.argv))
    .scriptName('port-assignment')
    .command(
      'claim [startPort]',
      'Claim the next available port',
      (yargs) => {
        return yargs
          .positional('startPort', {
            describe: 'Starting port number to begin searching from',
            type: 'number',
            default: 3001
          })
          .option('cwd', {
            describe: 'Working directory to associate with this port',
            type: 'string',
            default: process.cwd()
          })
          .option('service-name', {
            describe: 'Optional service name to associate with this port',
            type: 'string'
          })
      },
      async (argv) => {
        try {
          const port = await claimUnusedPort({
            startPort: argv.startPort,
            cwd: argv.cwd,
            serviceName: argv['service-name']
          })
          console.log(port)
        } catch (error) {
          console.error(`Error claiming port: ${error instanceof Error ? error.message : String(error)}`)
          process.exit(1)
        }
      }
    )
    .command(
      'list',
      'List all port assignments',
      () => {},
      async () => {
        try {
          const assignments = await getPortAssignments()
          if (assignments.length === 0) {
            console.log('No port assignments found')
            return
          }

          console.log('\nPort Assignments:')
          console.log('─'.repeat(80))
          for (const assignment of assignments) {
            const date = new Date(assignment.assigned_at).toLocaleString()
            console.log(`Port: ${assignment.port}`)
            console.log(`  Assigned: ${date}`)
            console.log(`  CWD: ${assignment.cwd}`)
            if (assignment.service_name) {
              console.log(`  Service: ${assignment.service_name}`)
            }
            console.log()
          }
        } catch (error) {
          console.error(`Error listing assignments: ${error instanceof Error ? error.message : String(error)}`)
          process.exit(1)
        }
      }
    )
    .command(
      'release <port>',
      'Release a specific port assignment',
      (yargs) => {
        return yargs.positional('port', {
          describe: 'Port number to release',
          type: 'number',
          demandOption: true
        })
      },
      async (argv) => {
        try {
          await releasePort(argv.port)
          console.log(`Port ${argv.port} released`)
        } catch (error) {
          console.error(`Error releasing port: ${error instanceof Error ? error.message : String(error)}`)
          process.exit(1)
        }
      }
    )
    .command(
      'reset',
      'Clear all port assignments',
      () => {},
      async () => {
        try {
          await resetPortAssignments()
          console.log('All port assignments cleared')
        } catch (error) {
          console.error(`Error resetting assignments: ${error instanceof Error ? error.message : String(error)}`)
          process.exit(1)
        }
      }
    )
    .command(
      'check <port>',
      'Check if a port is assigned or available',
      (yargs) => {
        return yargs.positional('port', {
          describe: 'Port number to check',
          type: 'number',
          demandOption: true
        })
      },
      async (argv) => {
        try {
          const assigned = await isPortAssigned(argv.port)
          const available = await isPortActuallyAvailable(argv.port)

          console.log(`Port ${argv.port}:`)
          console.log(`  Assigned in database: ${assigned ? 'Yes' : 'No'}`)
          console.log(`  Available on system: ${available ? 'Yes' : 'No'}`)
        } catch (error) {
          console.error(`Error checking port: ${error instanceof Error ? error.message : String(error)}`)
          process.exit(1)
        }
      }
    )
    .demandCommand(1, 'You need to specify a command')
    .help()
    .alias('h', 'help')
    .alias('v', 'version')
    .strict()
    .parse()
}

main()
