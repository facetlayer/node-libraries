#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { DocFilesHelper } from '@facetlayer/docs-tool';
import { listChatSessions } from './listChatSessions.ts';
import type { ChatSession } from './types.ts';
import { printProjects } from './printProjects.ts';
import { printChatSessions, printAllSessions, pathToProjectDir } from './printChatSessions.ts';
import { printSearchResults } from './searchSessions.ts';
import { printPermissionChecks } from './listPermissionChecks.ts';
import { runSummarize } from './summarizeSessions.ts';
import { printListSkills } from './listSkills.ts';
import { printListRoutines } from './listRoutines.ts';
import { printSkillRuns } from './getSkillRuns.ts';
import { normalizeListArg, type SessionFilterOptions } from './sessionFilters.ts';
import { ChatSessionMessageSchema } from './Schemas.ts';
import { getClaudeProjectsDir } from './paths.ts';
import * as path from 'path';
import * as fs from 'fs/promises';
import { readFileSync } from 'fs';
import { ZodError } from 'zod';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const __packageRoot = path.join(__dirname, '..');

const docFiles = new DocFilesHelper({
  dirs: [path.join(__packageRoot, 'docs')],
  files: [path.join(__packageRoot, 'README.md')],
});

// Read the version from package.json so `--version` always reflects what is
// actually installed (the previous hard-coded string drifted from package.json).
function readPackageVersion(): string {
  try {
    const pkgPath = path.join(__packageRoot, 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    return typeof pkg.version === 'string' ? pkg.version : '0.0.0';
  } catch {
    return '0.0.0';
  }
}

interface GlobalOptions {
  verbose?: boolean;
  claudeDir?: string;
}

interface GetChatOptions extends GlobalOptions {
  session: string;
  json?: boolean;
}

interface CheckSchemaOptions extends GlobalOptions {
  project?: string;
}

async function getChat(options: GetChatOptions): Promise<void> {
  try {
    // Get all project directories
    let projectDirs: string[];
    try {
      const projectDirents = await fs.readdir(getClaudeProjectsDir(options.claudeDir), { withFileTypes: true });
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

    if (options.json) {
      console.log(JSON.stringify({
        project: foundProjectPath,
        sessionId: foundSession.sessionId,
        messageCount: foundSession.messageCount,
        firstMessageTimestamp: foundSession.firstMessageTimestamp,
        lastMessageTimestamp: foundSession.lastMessageTimestamp,
        messages: foundSession.messages,
      }));
      return;
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
    const projectsDir = getClaudeProjectsDir(options.claudeDir);
    const verbose = options.verbose || false;

    // Get all project directories or filter by specific project
    let projectDirs: string[];
    try {
      const projectDirents = await fs.readdir(projectsDir, { withFileTypes: true });
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
      const projectPath = path.join(projectsDir, projectDir);

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

// Pre-process argv to handle --project values that start with -.
// Claude Code project directory names all start with - (e.g., -Users-andy-project),
// which yargs misinterprets as short option flags. Joining with = prevents this.
function preprocessProjectArg(argv: string[]): string[] {
  const result = [...argv];
  for (let i = 0; i < result.length; i++) {
    if ((result[i] === '--project' || result[i] === '-p') && i + 1 < result.length && result[i + 1].startsWith('-')) {
      result[i] = `${result[i]}=${result[i + 1]}`;
      result.splice(i + 1, 1);
    }
  }
  return result;
}

// Allow overriding the Claude directory via env var. The CLI flag --claude-dir
// takes precedence, then CC_SESSION_HISTORY_DIR, then the default ~/.claude.
function resolveClaudeDir(claudeDirOption: string | undefined): string | undefined {
  return claudeDirOption || process.env.CC_SESSION_HISTORY_DIR || undefined;
}

// Add the shared --skill / --routine / --routine-name / --since / --until / --entrypoint flags.
function addFilterOptions(y: any): any {
  return y
    .option('skill', {
      type: 'string',
      array: true,
      description: 'Only sessions that invoked this skill (repeatable, comma-separated)'
    })
    .option('routine', {
      type: 'boolean',
      default: false,
      description: 'Only sessions started by a Claude Routine / scheduled task'
    })
    .option('routine-name', {
      type: 'string',
      array: true,
      description: 'Only sessions for the named scheduled-task (repeatable, comma-separated). Implies --routine.'
    })
    .option('entrypoint', {
      type: 'string',
      description: 'Filter by session entrypoint (e.g. cli, claude-desktop)'
    })
    .option('since', {
      type: 'string',
      description: 'Only sessions newer than this (ISO date or relative duration like 7d, 24h)'
    })
    .option('until', {
      type: 'string',
      description: 'Only sessions older than this (ISO date or relative duration like 7d, 24h)'
    });
}

function buildFilter(argv: any): SessionFilterOptions {
  return {
    skill: normalizeListArg(argv['skill']),
    routine: argv['routine'] || undefined,
    routineName: normalizeListArg(argv['routine-name']),
    entrypoint: argv['entrypoint'],
    since: argv['since'],
    until: argv['until'],
  };
}

const args = yargs(preprocessProjectArg(hideBin(process.argv)))
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
    (argv: any) => {
      printProjects({
        claudeDir: resolveClaudeDir(argv['claude-dir']),
        verbose: argv.verbose
      }).catch(console.error);
    }
  )
  .command(
    'list-sessions',
    'List Claude Code chat sessions for a project (defaults to current directory)',
    (yargs) => {
      return addFilterOptions(yargs
        .option('project', {
          type: 'string',
          alias: 'p',
          description: 'Project path or directory name (defaults to current directory)'
        })
        .option('all-projects', {
          type: 'boolean',
          description: 'List sessions from all projects',
          default: false
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
        .option('json', {
          type: 'boolean',
          description: 'Output as JSON (envelope: { total, offset, limit, items })',
          default: false
        })
        .option('jsonl', {
          type: 'boolean',
          description: 'Output as JSON Lines (one record per line)',
          default: false
        })
        .option('count', {
          type: 'boolean',
          description: 'Print only the matching session count',
          default: false
        })
        .option('claude-dir', {
          type: 'string',
          description: 'Custom path to Claude directory'
        })
        .option('verbose', {
          type: 'boolean',
          description: 'Enable verbose logging',
          default: false
        }));
    },
    (argv: any) => {
      const filter = buildFilter(argv);
      if (argv['all-projects']) {
        printAllSessions({
          offset: argv.offset,
          limit: argv.limit,
          json: argv.json,
          jsonl: argv.jsonl,
          count: argv.count,
          claudeDir: resolveClaudeDir(argv['claude-dir']),
          verbose: argv.verbose,
          ...filter,
        }).catch(console.error);
      } else {
        let project: string;
        if (!argv.project) {
          project = pathToProjectDir(process.cwd());
        } else if (argv.project.startsWith('/')) {
          project = pathToProjectDir(argv.project);
        } else {
          project = argv.project;
        }
        printChatSessions({
          project,
          offset: argv.offset,
          limit: argv.limit,
          json: argv.json,
          jsonl: argv.jsonl,
          count: argv.count,
          claudeDir: resolveClaudeDir(argv['claude-dir']),
          verbose: argv.verbose,
          ...filter,
        }).catch(console.error);
      }
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
        })
        .option('json', {
          type: 'boolean',
          description: 'Output as JSON',
          default: false
        });
    },
    (argv: any) => {
      getChat({
        session: argv.session,
        claudeDir: resolveClaudeDir(argv['claude-dir']),
        verbose: argv.verbose,
        json: argv.json
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
    (argv: any) => {
      checkSchema({
        project: argv.project,
        claudeDir: resolveClaudeDir(argv['claude-dir']),
        verbose: argv.verbose
      }).catch(console.error);
    }
  )
  .command(
    'search <query>',
    'Search for text in chat sessions',
    (yargs) => {
      return addFilterOptions(yargs
        .positional('query', {
          type: 'string',
          description: 'Text to search for',
          demandOption: true
        })
        .option('all-projects', {
          type: 'boolean',
          description: 'Search across all projects',
          default: false
        })
        .option('project', {
          type: 'string',
          description: 'Project path or directory name (defaults to current directory)'
        })
        .option('offset', {
          type: 'number',
          description: 'Number of results to skip'
        })
        .option('limit', {
          type: 'number',
          description: 'Maximum number of results to return'
        })
        .option('json', {
          type: 'boolean',
          default: false
        })
        .option('count', {
          type: 'boolean',
          description: 'Print only the count of matches',
          default: false
        })
        .option('claude-dir', {
          type: 'string',
          description: 'Custom path to Claude directory'
        })
        .option('verbose', {
          type: 'boolean',
          description: 'Enable verbose logging',
          default: false
        }));
    },
    (argv: any) => {
      let project: string | undefined;
      if (argv.project) {
        if (argv.project.startsWith('/')) {
          project = pathToProjectDir(argv.project);
        } else {
          project = argv.project;
        }
      }
      printSearchResults({
        query: argv.query as string,
        allProjects: argv['all-projects'],
        project,
        offset: argv.offset,
        limit: argv.limit,
        json: argv.json,
        count: argv.count,
        claudeDir: resolveClaudeDir(argv['claude-dir']),
        verbose: argv.verbose,
        ...buildFilter(argv),
      }).catch(console.error);
    }
  )
  .command(
    'list-permission-checks',
    'List rejected tool permission checks',
    (yargs) => {
      return addFilterOptions(yargs
        .option('project', {
          type: 'string',
          alias: 'p',
          description: 'Project path or directory name (defaults to current directory)'
        })
        .option('all-projects', {
          type: 'boolean',
          description: 'Search across all projects',
          default: false
        })
        .option('offset', {
          type: 'number',
          description: 'Number of results to skip'
        })
        .option('limit', {
          type: 'number',
          description: 'Maximum number of results to return'
        })
        .option('json', {
          type: 'boolean',
          default: false
        })
        .option('count', {
          type: 'boolean',
          description: 'Print only the matching count',
          default: false
        })
        .option('claude-dir', {
          type: 'string',
          description: 'Custom path to Claude directory'
        })
        .option('verbose', {
          type: 'boolean',
          description: 'Enable verbose logging',
          default: false
        }));
    },
    (argv: any) => {
      let project: string | undefined;
      if (argv.project) {
        if (argv.project.startsWith('/')) {
          project = pathToProjectDir(argv.project);
        } else {
          project = argv.project;
        }
      }
      printPermissionChecks({
        project,
        allProjects: argv['all-projects'],
        offset: argv.offset,
        limit: argv.limit,
        json: argv.json,
        count: argv.count,
        claudeDir: resolveClaudeDir(argv['claude-dir']),
        verbose: argv.verbose,
        ...buildFilter(argv),
      }).catch(console.error);
    }
  )
  .command(
    'summarize',
    'Produce a compact digest of sessions (user prompts, tool counts, errors)',
    (yargs) => {
      return addFilterOptions(yargs
        .option('project', {
          type: 'string',
          alias: 'p',
          description: 'Project path or directory name (defaults to current directory)'
        })
        .option('all-projects', {
          type: 'boolean',
          description: 'Summarize sessions across all projects',
          default: false
        })
        .option('session', {
          type: 'string',
          alias: 's',
          description: 'Summarize a single session by ID'
        })
        .option('offset', {
          type: 'number',
          description: 'Number of sessions to skip'
        })
        .option('limit', {
          type: 'number',
          description: 'Max number of recent sessions to summarize'
        })
        .option('include-assistant', {
          type: 'boolean',
          description: 'Include short assistant text snippets',
          default: false
        })
        .option('max-prompt-chars', {
          type: 'number',
          default: 200
        })
        .option('claude-dir', {
          type: 'string'
        })
        .option('verbose', {
          type: 'boolean',
          default: false
        }));
    },
    (argv: any) => {
      runSummarize({
        project: argv.project,
        allProjects: argv['all-projects'],
        session: argv.session,
        offset: argv.offset,
        limit: argv.limit,
        includeAssistantText: argv['include-assistant'],
        maxPromptChars: argv['max-prompt-chars'],
        claudeDir: resolveClaudeDir(argv['claude-dir']),
        verbose: argv.verbose,
        ...buildFilter(argv),
      }).catch((err) => {
        console.error(err);
        process.exit(1);
      });
    }
  )
  .command(
    'list-skills',
    'List skills invoked across sessions, with usage counts',
    (yargs) => {
      return addFilterOptions(yargs
        .option('project', {
          type: 'string',
          alias: 'p',
          description: 'Project path or directory name (defaults to current directory)'
        })
        .option('all-projects', {
          type: 'boolean',
          description: 'Scan all projects',
          default: false
        })
        .option('json', { type: 'boolean', default: false })
        .option('jsonl', { type: 'boolean', default: false, description: 'JSON Lines output' })
        .option('count', { type: 'boolean', default: false })
        .option('claude-dir', { type: 'string' })
        .option('verbose', { type: 'boolean', default: false }));
    },
    (argv: any) => {
      printListSkills({
        project: argv.project,
        allProjects: argv['all-projects'],
        json: argv.json,
        jsonl: argv.jsonl,
        count: argv.count,
        claudeDir: resolveClaudeDir(argv['claude-dir']),
        verbose: argv.verbose,
        ...buildFilter(argv),
      }).catch((err) => { console.error(err); process.exit(1); });
    }
  )
  .command(
    'list-routines',
    'List Claude Routines (scheduled tasks) seen in sessions',
    (yargs) => {
      return addFilterOptions(yargs
        .option('project', {
          type: 'string',
          alias: 'p',
          description: 'Project path or directory name (defaults to current directory)'
        })
        .option('all-projects', {
          type: 'boolean',
          description: 'Scan all projects',
          default: false
        })
        .option('json', { type: 'boolean', default: false })
        .option('jsonl', { type: 'boolean', default: false, description: 'JSON Lines output' })
        .option('count', { type: 'boolean', default: false })
        .option('claude-dir', { type: 'string' })
        .option('verbose', { type: 'boolean', default: false }));
    },
    (argv: any) => {
      printListRoutines({
        project: argv.project,
        allProjects: argv['all-projects'],
        json: argv.json,
        jsonl: argv.jsonl,
        count: argv.count,
        claudeDir: resolveClaudeDir(argv['claude-dir']),
        verbose: argv.verbose,
        ...buildFilter(argv),
      }).catch((err) => { console.error(err); process.exit(1); });
    }
  )
  .command(
    'get-skill-runs <skillName>',
    'List sessions that invoked a particular skill',
    (yargs) => {
      return addFilterOptions(yargs
        .positional('skillName', {
          type: 'string',
          description: 'Skill name (basename of the skill directory) to look up',
          demandOption: true
        })
        .option('project', {
          type: 'string',
          alias: 'p',
          description: 'Project path or directory name (defaults to current directory)'
        })
        .option('all-projects', {
          type: 'boolean',
          description: 'Scan all projects',
          default: false
        })
        .option('offset', { type: 'number' })
        .option('limit', { type: 'number' })
        .option('json', { type: 'boolean', default: false })
        .option('jsonl', { type: 'boolean', default: false, description: 'JSON Lines output' })
        .option('count', { type: 'boolean', default: false })
        .option('claude-dir', { type: 'string' })
        .option('verbose', { type: 'boolean', default: false }));
    },
    (argv: any) => {
      printSkillRuns({
        skillName: argv.skillName as string,
        project: argv.project,
        allProjects: argv['all-projects'],
        offset: argv.offset,
        limit: argv.limit,
        json: argv.json,
        jsonl: argv.jsonl,
        count: argv.count,
        claudeDir: resolveClaudeDir(argv['claude-dir']),
        verbose: argv.verbose,
        ...buildFilter(argv),
      }).catch((err) => { console.error(err); process.exit(1); });
    }
  )
docFiles.yargsSetup(args);

args
  .demandCommand(1, 'You must specify a command')
  .help()
  .alias('help', 'h')
  .version(readPackageVersion())
  .alias('version', 'v')
  .parse();
