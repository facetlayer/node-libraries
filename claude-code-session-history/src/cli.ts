#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { listChatSessions } from './listChatSessions';
import { ChatSession } from './types';
import { printProjects } from './printProjects';
import { printChatSessions } from './printChatSessions';
import { ChatSessionMessageSchema } from './Schemas';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';
import { ZodError } from 'zod';

interface GlobalOptions {
  verbose?: boolean;
  claudeDir?: string;
}

interface GetChatOptions extends GlobalOptions {
  session: string;
}

interface CheckSchemaOptions extends GlobalOptions {
  project?: string;
}

async function getChat(options: GetChatOptions): Promise<void> {
  try {
    const claudeDir = options.claudeDir || path.join(os.homedir(), '.claude', 'projects');
    const verbose = options.verbose || false;

    // Get all project directories
    let projectDirs: string[];
    try {
      const projectDirents = await fs.readdir(claudeDir, { withFileTypes: true });
      projectDirs = projectDirents
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);
    } catch (error) {
      console.error('Claude directory does not exist');
      process.exit(1);
    }

    // Search for the session across all projects
    let foundSession: ChatSession | null = null;
    let foundProjectPath: string | null = null;

    for (const projectDir of projectDirs) {
      const sessions = await listChatSessions({
        project: projectDir,
        claudeDir: options.claudeDir,
        verbose: options.verbose
      });

      const session = sessions.find(s => s.sessionId === options.session);
      if (session) {
        foundSession = session;
        foundProjectPath = projectDir;
        break;
      }
    }

    if (!foundSession || !foundProjectPath) {
      console.error(`Session not found: ${options.session}`);
      process.exit(1);
    }

    console.log(`Project: ${foundProjectPath}`);
    console.log(`Session ID: ${foundSession.sessionId}`);
    console.log(`Messages: ${foundSession.messageCount}`);
    console.log(`First message: ${new Date(foundSession.firstMessageTimestamp).toLocaleString()}`);
    console.log(`Last message: ${new Date(foundSession.lastMessageTimestamp).toLocaleString()}`);
    console.log('\n' + '─'.repeat(80) + '\n');

    for (const message of foundSession.messages) {
      const timestamp = new Date(message.timestamp).toLocaleString();
      console.log(`[${timestamp}] ${message.type.toUpperCase()}`);

      if (message.message) {
        const content = message.message.content;

        if (typeof content === 'string') {
          console.log(content);
        } else if (Array.isArray(content)) {
          for (const block of content) {
            if (block.type === 'text' && block.text) {
              console.log(block.text);
            } else if (block.type === 'tool_use') {
              console.log(`[TOOL USE: ${block.name}]`);
              if (options.verbose && block.input) {
                console.log(JSON.stringify(block.input, null, 2));
              }
            } else if (block.type === 'tool_result') {
              console.log(`[TOOL RESULT: ${block.tool_use_id}]`);
              if (options.verbose) {
                console.log(JSON.stringify(block, null, 2));
              }
            }
          }
        }

        if (message.message.usage && options.verbose) {
          console.log(`\nUsage: ${JSON.stringify(message.message.usage)}`);
        }
      } else if (message.content) {
        console.log(message.content);
      }

      if (message.isMeta) {
        console.log('[META MESSAGE]');
      }

      if (message.internalMessageType) {
        console.log(`[INTERNAL: ${message.internalMessageType}]`);
      }

      console.log('\n' + '─'.repeat(80) + '\n');
    }
  } catch (error) {
    console.error('Error retrieving chat session:', error);
    process.exit(1);
  }
}

async function checkSchema(options: CheckSchemaOptions): Promise<void> {
  try {
    const claudeDir = options.claudeDir || path.join(os.homedir(), '.claude', 'projects');
    const verbose = options.verbose || false;

    // Get all project directories or filter by specific project
    let projectDirs: string[];
    try {
      const projectDirents = await fs.readdir(claudeDir, { withFileTypes: true });
      projectDirs = projectDirents
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

      if (options.project) {
        projectDirs = projectDirs.filter(dir => dir === options.project);
        if (projectDirs.length === 0) {
          console.error(`Project not found: ${options.project}`);
          process.exit(1);
        }
      }
    } catch (error) {
      console.error('Claude directory does not exist');
      process.exit(1);
    }

    let totalMessages = 0;
    let totalErrors = 0;
    let totalSessions = 0;
    const errorDetails: Array<{
      project: string;
      session: string;
      messageIndex: number;
      error: ZodError;
    }> = [];

    for (const projectDir of projectDirs) {
      const projectPath = path.join(claudeDir, projectDir);

      // Get all .jsonl files in the project directory
      const files = await fs.readdir(projectPath);
      const sessionFiles = files.filter(f => f.endsWith('.jsonl'));

      for (const sessionFile of sessionFiles) {
        totalSessions++;
        const sessionFilePath = path.join(projectPath, sessionFile);
        const sessionId = sessionFile.replace('.jsonl', '');

        try {
          const content = await fs.readFile(sessionFilePath, 'utf-8');
          const lines = content.trim().split('\n');

          for (let i = 0; i < lines.length; i++) {
            totalMessages++;
            try {
              const line = lines[i].trim();
              if (line === '')
                continue;

              const message = JSON.parse(line);
              ChatSessionMessageSchema.parse(message);

              if (verbose) {
                console.log(`✓ ${projectDir}/${sessionId} message ${i + 1}`);
              }
            } catch (error) {
              totalErrors++;
              if (error instanceof ZodError) {
                errorDetails.push({
                  project: projectDir,
                  session: sessionId,
                  messageIndex: i,
                  error,
                });

                console.error(`\n✗ Error in ${projectDir}/${sessionId} at message ${i + 1}:`);
                console.error(`  Message type: ${JSON.parse(lines[i]).type || 'unknown'}`);
                console.error(`  Validation errors:`);
                for (const issue of error.issues) {
                  console.error(`    - ${issue.path.join('.')}: ${issue.message}`);
                }

                if (verbose) {
                  console.error(`  Full message:`);
                  console.error(`  ${lines[i]}`);
                }
              } else {
                console.error(`\n✗ Failed to parse JSON in ${projectDir}/${sessionId} at message ${i + 1}`);
                if (verbose) {
                  console.error(`  ${error}`);
                }
              }
            }
          }
        } catch (error) {
          console.error(`Failed to read session file: ${sessionFilePath}`, error);
        }
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('Schema Validation Summary');
    console.log('='.repeat(80));
    console.log(`Total sessions checked: ${totalSessions}`);
    console.log(`Total messages checked: ${totalMessages}`);
    console.log(`Total errors found: ${totalErrors}`);

    if (totalErrors > 0) {
      console.log(`\nValidation FAILED with ${totalErrors} error(s)`);
      process.exit(1);
    } else {
      console.log(`\n✓ All messages conform to schema!`);
    }
  } catch (error) {
    console.error('Error checking schema:', error);
    process.exit(1);
  }
}

yargs(hideBin(process.argv))
  .command(
    'list-projects',
    'List all projects with Claude Code sessions',
    (yargs) => {
      return yargs
        .option('claude-dir', {
          type: 'string',
          description: 'Custom path to Claude directory'
        })
        .option('verbose', {
          type: 'boolean',
          description: 'Enable verbose logging',
          default: false
        });
    },
    (argv) => {
      printProjects({
        claudeDir: argv['claude-dir'],
        verbose: argv.verbose
      }).catch(console.error);
    }
  )
  .command(
    'list-sessions',
    'List all Claude Code chat sessions',
    (yargs) => {
      return yargs
        .option('project', {
          type: 'string',
          description: 'Filter sessions by project name',
          alias: 'p'
        })
        .option('offset', {
          type: 'number',
          description: 'Number of sessions to skip',
          default: 0
        })
        .option('limit', {
          type: 'number',
          description: 'Maximum number of sessions to return'
        })
        .option('claude-dir', {
          type: 'string',
          description: 'Custom path to Claude directory'
        })
        .option('verbose', {
          type: 'boolean',
          description: 'Enable verbose logging',
          default: false
        });
    },
    (argv) => {
      printChatSessions({
        project: argv.project,
        offset: argv.offset,
        limit: argv.limit,
        claudeDir: argv['claude-dir'],
        verbose: argv.verbose
      }).catch(console.error);
    }
  )
  .command(
    'get-chat',
    'Get a specific chat session by ID',
    (yargs) => {
      return yargs
        .option('session', {
          type: 'string',
          description: 'Session ID to retrieve',
          demandOption: true,
          alias: 's'
        })
        .option('claude-dir', {
          type: 'string',
          description: 'Custom path to Claude directory'
        })
        .option('verbose', {
          type: 'boolean',
          description: 'Enable verbose logging',
          default: false
        });
    },
    (argv) => {
      getChat({
        session: argv.session,
        claudeDir: argv['claude-dir'],
        verbose: argv.verbose
      }).catch(console.error);
    }
  )
  .command(
    'check-schema',
    'Validate all chat messages against the Zod schema',
    (yargs) => {
      return yargs
        .option('project', {
          type: 'string',
          description: 'Check only a specific project',
          alias: 'p'
        })
        .option('claude-dir', {
          type: 'string',
          description: 'Custom path to Claude directory'
        })
        .option('verbose', {
          type: 'boolean',
          description: 'Enable verbose logging (shows all valid messages)',
          default: false
        });
    },
    (argv) => {
      checkSchema({
        project: argv.project,
        claudeDir: argv['claude-dir'],
        verbose: argv.verbose
      }).catch(console.error);
    }
  )
  .demandCommand(1, 'You must specify a command')
  .help()
  .alias('help', 'h')
  .version('0.1.0')
  .alias('version', 'v')
  .parse();
