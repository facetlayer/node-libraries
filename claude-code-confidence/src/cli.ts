#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { analyzeSession, analyzeSessionInProject } from './analyzeSession.ts';
import { formatMetricsSummary } from './calculateMetrics.ts';
import { listChatSessions } from '@facetlayer/claude-code-session-history';

interface AnalyzeArgs {
  session: string;
  project?: string;
  claudeDir?: string;
  verbose?: boolean;
  json?: boolean;
}

interface ListArgs {
  project?: string;
  claudeDir?: string;
  verbose?: boolean;
  limit?: number;
}

async function handleAnalyze(args: AnalyzeArgs) {
  const { session, project, claudeDir, verbose, json } = args;

  let metrics;

  if (project) {
    metrics = await analyzeSessionInProject(session, project, { claudeDir, verbose });
  } else {
    metrics = await analyzeSession(session, { claudeDir, verbose });
  }

  if (!metrics) {
    console.error(`Could not analyze session: ${session}`);
    process.exit(1);
  }

  if (json) {
    console.log(JSON.stringify(metrics, null, 2));
  } else {
    console.log(formatMetricsSummary(metrics));
  }
}

async function handleList(args: ListArgs) {
  const { project, claudeDir, verbose, limit } = args;

  if (!project) {
    console.error('Please specify a project with --project or -p');
    process.exit(1);
  }

  const sessions = await listChatSessions({
    project,
    claudeDir,
    verbose,
    limit,
  });

  if (sessions.length === 0) {
    console.log('No sessions found');
    return;
  }

  console.log(`Sessions in project "${project}":`);
  console.log('');

  for (const session of sessions) {
    const date = new Date(session.lastMessageTimestamp);
    const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    console.log(`  ${session.sessionId}`);
    console.log(`    Messages: ${session.messageCount}, Last activity: ${dateStr}`);
    console.log('');
  }
}

yargs(hideBin(process.argv))
  .scriptName('claude-code-confidence')
  .usage('$0 <command> [options]')
  .command(
    'analyze',
    'Analyze a session for confidence metrics',
    (y) =>
      y
        .option('session', {
          alias: 's',
          type: 'string',
          description: 'Session ID to analyze',
          demandOption: true,
        })
        .option('project', {
          alias: 'p',
          type: 'string',
          description: 'Project name (optional, will search all projects if not specified)',
        })
        .option('claude-dir', {
          type: 'string',
          description: 'Custom Claude directory path',
        })
        .option('verbose', {
          alias: 'v',
          type: 'boolean',
          description: 'Enable verbose output',
          default: false,
        })
        .option('json', {
          alias: 'j',
          type: 'boolean',
          description: 'Output as JSON',
          default: false,
        }),
    async (args) => {
      await handleAnalyze(args as AnalyzeArgs);
    }
  )
  .command(
    'list',
    'List available sessions for a project',
    (y) =>
      y
        .option('project', {
          alias: 'p',
          type: 'string',
          description: 'Project name',
          demandOption: true,
        })
        .option('limit', {
          alias: 'l',
          type: 'number',
          description: 'Maximum number of sessions to list',
          default: 20,
        })
        .option('claude-dir', {
          type: 'string',
          description: 'Custom Claude directory path',
        })
        .option('verbose', {
          alias: 'v',
          type: 'boolean',
          description: 'Enable verbose output',
          default: false,
        }),
    async (args) => {
      await handleList(args as ListArgs);
    }
  )
  .demandCommand(1, 'Please specify a command')
  .help()
  .version()
  .parse();
