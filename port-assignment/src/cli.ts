#!/usr/bin/env node

import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { DocFilesHelper } from '@facetlayer/doc-files-helper'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import {
  assignPort,
  claimUnusedPort,
  getOrClaimPort,
  getPortAssignments,
  getPortAssignmentsByProjectDir,
  releasePort,
  resetPortAssignments,
  isPortAssigned,
  isPortActuallyAvailable,
  serializeAssignments,
  applyAssignmentEdits
} from './index.ts'
import { execSync } from 'child_process'
import { writeFileSync, readFileSync, unlinkSync } from 'fs'
import { tmpdir } from 'os'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const __packageRoot = join(__dirname, '..')

const docFiles = new DocFilesHelper({
  dirs: [join(__packageRoot, 'docs')],
  files: [join(__packageRoot, 'README.md')],
})

import type { PortAssignment } from './index.ts'

function printAssignments(assignments: PortAssignment[], options: { showProjectDir?: boolean } = {}) {
  console.log('\nPort Assignments:')
  console.log('─'.repeat(80))
  for (const assignment of assignments) {
    const date = new Date(assignment.assigned_at).toLocaleString()
    console.log(`Port: ${assignment.port}`)
    console.log(`  Assigned: ${date}`)
    if (options.showProjectDir) {
      console.log(`  Project: ${assignment.project_dir}`)
    }
    if (assignment.name) {
      console.log(`  Name: ${assignment.name}`)
    }
    console.log()
  }
}

async function main() {
  const args = yargs(hideBin(process.argv))
    .scriptName('port-assignment')
    .command(
      'claim',
      'Claim the next available port',
      (yargs) => {
        return yargs
          .option('project-dir', {
            describe: 'Project directory to associate with this port',
            type: 'string',
            default: process.cwd()
          })
          .option('name', {
            describe: 'Name to associate with this port',
            type: 'string',
            demandOption: true
          })
      },
      async (argv) => {
        try {
          const projectDir = argv.projectDir as string
          const port = await claimUnusedPort({
            cwd: projectDir,
            project_dir: projectDir,
            name: argv.name as string
          })
          console.log(port)
        } catch (error) {
          console.error(`Error claiming port: ${error instanceof Error ? error.message : String(error)}`)
          process.exit(1)
        }
      }
    )
    .command(
      'get-or-claim',
      'Get an existing port for a name, or claim a new one (idempotent)',
      (yargs) => {
        return yargs
          .option('name', {
            describe: 'Name to associate with this port',
            type: 'string',
            demandOption: true
          })
          .option('project-dir', {
            describe: 'Project directory to associate with this port',
            type: 'string',
            default: process.cwd()
          })
      },
      async (argv) => {
        try {
          const projectDir = argv.projectDir as string
          const port = await getOrClaimPort({
            project_dir: projectDir,
            name: argv.name as string,
            cwd: projectDir
          })
          console.log(port)
        } catch (error) {
          console.error(`Error: ${error instanceof Error ? error.message : String(error)}`)
          process.exit(1)
        }
      }
    )
    .command(
      'list',
      'List port assignments for the current project directory',
      (yargs) => {
        return yargs
          .option('project-dir', {
            describe: 'Project directory to filter by',
            type: 'string',
            default: process.cwd()
          })
      },
      async (argv) => {
        try {
          const projectDir = argv.projectDir as string
          const assignments = await getPortAssignmentsByProjectDir(projectDir)
          if (assignments.length === 0) {
            console.log('No port assignments found for this project')
            return
          }

          printAssignments(assignments)
        } catch (error) {
          console.error(`Error listing assignments: ${error instanceof Error ? error.message : String(error)}`)
          process.exit(1)
        }
      }
    )
    .command(
      'list-all',
      'List all port assignments across all projects',
      () => {},
      async () => {
        try {
          const assignments = await getPortAssignments()
          if (assignments.length === 0) {
            console.log('No port assignments found')
            return
          }

          printAssignments(assignments, { showProjectDir: true })
        } catch (error) {
          console.error(`Error listing assignments: ${error instanceof Error ? error.message : String(error)}`)
          process.exit(1)
        }
      }
    )
    .command(
      'assign <port>',
      'Assign a specific port',
      (yargs) => {
        return yargs
          .positional('port', {
            describe: 'Port number to assign',
            type: 'number',
            demandOption: true
          })
          .option('project-dir', {
            describe: 'Project directory to associate with this port',
            type: 'string',
            default: process.cwd()
          })
          .option('name', {
            describe: 'Name to associate with this port',
            type: 'string',
            demandOption: true
          })
      },
      async (argv) => {
        try {
          const projectDir = argv.projectDir as string
          await assignPort({
            port: argv.port,
            cwd: projectDir,
            project_dir: projectDir,
            name: argv.name as string
          })
          console.log(`Port ${argv.port} assigned`)
        } catch (error) {
          console.error(`Error assigning port: ${error instanceof Error ? error.message : String(error)}`)
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
    .command(
      'edit-as-text',
      'Edit all port assignments in your text editor',
      () => {},
      async () => {
        try {
          const assignments = await getPortAssignments()
          const content = serializeAssignments(assignments)

          const tmpFile = join(tmpdir(), `port-assignments-${Date.now()}.txt`)
          writeFileSync(tmpFile, content)

          const editor = process.env.EDITOR || 'vi'
          try {
            execSync(`${editor} ${tmpFile}`, { stdio: 'inherit' })
          } catch {
            console.error('Editor exited with an error')
            unlinkSync(tmpFile)
            process.exit(1)
          }

          const newContent = readFileSync(tmpFile, 'utf-8')
          unlinkSync(tmpFile)

          const { released, assigned, updated } = await applyAssignmentEdits(assignments, newContent)

          if (released.length === 0 && assigned.length === 0 && updated.length === 0) {
            console.log('No changes')
            return
          }

          for (const port of released) {
            console.log(`Released port ${port}`)
          }
          for (const port of assigned) {
            console.log(`Assigned port ${port}`)
          }
          for (const port of updated) {
            console.log(`Updated port ${port}`)
          }
        } catch (error) {
          console.error(`Error: ${error instanceof Error ? error.message : String(error)}`)
          process.exit(1)
        }
      }
    )
    .demandCommand(1, 'You need to specify a command')
    .help()
    .alias('h', 'help')
    .alias('v', 'version')
    .strict()

  docFiles.yargsSetup(args)

  args.parse()
}

main()
