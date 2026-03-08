#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import {
  createFeedback,
  listFeedback,
  listProjects,
  getActiveSummary,
  setComplete,
  addComment,
  getFeedbackByTicketId,
  getComments,
  type Severity,
  type FeedbackStatus,
} from './db.ts';

const SEVERITIES: Severity[] = ['critical', 'high', 'medium', 'low', 'positive'];
const STATUSES: FeedbackStatus[] = ['pending', 'accepted', 'rejected', 'completed'];

function formatDate(timestamp: number): string {
  return new Date(timestamp).toISOString().replace('T', ' ').substring(0, 19);
}

function severityColor(severity: Severity): string {
  const colors: Record<Severity, string> = {
    critical: '\x1b[31m',
    high: '\x1b[33m',
    medium: '\x1b[36m',
    low: '\x1b[37m',
    positive: '\x1b[32m',
  };
  return colors[severity] || '';
}

function statusColor(status: FeedbackStatus): string {
  const colors: Record<FeedbackStatus, string> = {
    pending: '\x1b[33m',
    accepted: '\x1b[32m',
    rejected: '\x1b[31m',
    completed: '\x1b[36m',
  };
  return colors[status] || '';
}

const reset = '\x1b[0m';
const bold = '\x1b[1m';
const dim = '\x1b[2m';

async function main() {
  await yargs(hideBin(process.argv))
    .command(
      'report',
      'Create a new feedback item',
      (yargs) => {
        return yargs
          .option('library', {
            alias: 'l',
            type: 'string',
            description: 'Target library name',
            demandOption: true,
          })
          .option('description', {
            alias: 'd',
            type: 'string',
            description: 'Feedback description',
            demandOption: true,
          })
          .option('severity', {
            alias: 's',
            type: 'string',
            description: 'Severity level',
            choices: SEVERITIES,
            default: 'medium' as Severity,
          })
          .option('context', {
            alias: 'c',
            type: 'string',
            description: 'Additional context (e.g., stack trace, environment)',
          })
          .option('user', {
            alias: 'u',
            type: 'string',
            description: 'User who reported the feedback',
          });
      },
      (argv) => {
        const item = createFeedback({
          library: argv.library,
          description: argv.description,
          severity: argv.severity as Severity,
          context: argv.context,
          user: argv.user,
        });

        console.log(`Created feedback item ${bold}${item.ticket_id}${reset}`);
        console.log(`  Library:     ${item.library}`);
        console.log(`  Severity:    ${severityColor(item.severity)}${item.severity}${reset}`);
        console.log(`  Status:      ${statusColor(item.status)}${item.status}${reset}`);
        console.log(`  Description: ${item.description}`);
        if (item.context) {
          console.log(`  Context:     ${item.context}`);
        }
        if (item.user) {
          console.log(`  User:        ${item.user}`);
        }
        console.log(`  Created:     ${formatDate(item.created_at)}`);
      }
    )
    .command(
      'list',
      'List and search feedback items',
      (yargs) => {
        return yargs
          .option('library', {
            alias: 'l',
            type: 'string',
            description: 'Filter by library name',
          })
          .option('severity', {
            alias: 's',
            type: 'string',
            description: 'Filter by severity level',
            choices: SEVERITIES,
          })
          .option('status', {
            type: 'string',
            description: 'Filter by status',
            choices: STATUSES,
          })
          .option('user', {
            alias: 'u',
            type: 'string',
            description: 'Filter by user',
          })
          .option('limit', {
            alias: 'n',
            type: 'number',
            description: 'Number of items per page',
            default: 20,
          })
          .option('page', {
            alias: 'p',
            type: 'number',
            description: 'Page number (1-based)',
            default: 1,
          });
      },
      (argv) => {
        const offset = (argv.page - 1) * argv.limit;
        const result = listFeedback({
          library: argv.library,
          severity: argv.severity as Severity | undefined,
          status: argv.status as FeedbackStatus | undefined,
          user: argv.user,
          limit: argv.limit,
          offset,
        });

        if (result.items.length === 0) {
          console.log('No feedback items found.');
          return;
        }

        const totalPages = Math.ceil(result.total / result.limit);
        console.log(`Showing ${result.items.length} of ${result.total} items (page ${argv.page} of ${totalPages})\n`);

        for (const item of result.items) {
          const sevColor = severityColor(item.severity);
          const statColor = statusColor(item.status);
          console.log(`${bold}${item.ticket_id}${reset} [${sevColor}${item.severity.padEnd(8)}${reset}] [${statColor}${item.status.padEnd(9)}${reset}] ${item.library}`);
          console.log(`   ${item.description}`);
          if (item.context) {
            console.log(`   Context: ${item.context}`);
          }
          const meta: string[] = [];
          if (item.user) {
            meta.push(`User: ${item.user}`);
          }
          meta.push(`Date: ${formatDate(item.created_at)}`);
          console.log(`   ${dim}${meta.join(' | ')}${reset}`);
          console.log();
        }

        if (totalPages > 1 && argv.page < totalPages) {
          console.log(`Use --page ${argv.page + 1} to see more results.`);
        }
      }
    )
    .command(
      'list-projects',
      'List all projects that have feedback',
      () => {},
      () => {
        const projects = listProjects();

        if (projects.length === 0) {
          console.log('No projects found.');
          return;
        }

        console.log(`${bold}Projects with feedback:${reset}\n`);

        const maxNameLen = Math.max(...projects.map(p => p.library.length));

        for (const project of projects) {
          const name = project.library.padEnd(maxNameLen);
          const active = project.active > 0
            ? `${severityColor('high')}${project.active} active${reset}`
            : `${dim}0 active${reset}`;
          const completed = project.completed > 0
            ? `${statusColor('completed')}${project.completed} completed${reset}`
            : `${dim}0 completed${reset}`;
          console.log(`  ${bold}${name}${reset}  ${active}  ${completed}  (${project.total} total)`);
        }
        console.log();
      }
    )
    .command(
      'active-summary',
      'Show active (non-completed) feedback for a project',
      (yargs) => {
        return yargs
          .option('library', {
            alias: 'l',
            type: 'string',
            description: 'Project/library name',
            demandOption: true,
          });
      },
      (argv) => {
        const summary = getActiveSummary(argv.library);

        if (summary.total === 0) {
          console.log(`No active feedback for "${argv.library}".`);
          return;
        }

        console.log(`\n${bold}Active Feedback for: ${argv.library}${reset}`);
        console.log('='.repeat(40));
        console.log();

        if (summary.accepted.length > 0) {
          console.log(`${statusColor('accepted')}[Accepted]${reset} ${summary.accepted.length} item(s)`);
          for (const item of summary.accepted) {
            const sevColor = severityColor(item.severity);
            console.log(`  ${bold}${item.ticket_id}${reset} [${sevColor}${item.severity.padEnd(8)}${reset}] ${item.description}`);
            if (item.context) {
              console.log(`    ${dim}Context: ${item.context}${reset}`);
            }
          }
          console.log();
        }

        if (summary.pending.length > 0) {
          console.log(`${statusColor('pending')}[Pending]${reset} ${summary.pending.length} item(s)`);
          for (const item of summary.pending) {
            const sevColor = severityColor(item.severity);
            console.log(`  ${bold}${item.ticket_id}${reset} [${sevColor}${item.severity.padEnd(8)}${reset}] ${item.description}`);
            if (item.context) {
              console.log(`    ${dim}Context: ${item.context}${reset}`);
            }
          }
          console.log();
        }

        console.log(`${bold}Total: ${summary.total} active item(s)${reset}\n`);
      }
    )
    .command(
      'set-complete',
      'Mark a feedback item as completed',
      (yargs) => {
        return yargs
          .option('ticket', {
            alias: 't',
            type: 'string',
            description: 'Ticket ID (e.g., fb-a1b2c3d4)',
            demandOption: true,
          })
          .option('message', {
            alias: 'm',
            type: 'string',
            description: 'Completion message describing what was done',
            demandOption: true,
          })
          .option('user', {
            alias: 'u',
            type: 'string',
            description: 'User completing the ticket',
          });
      },
      (argv) => {
        const item = setComplete(argv.ticket, argv.message, argv.user);

        if (!item) {
          console.error(`Ticket "${argv.ticket}" not found.`);
          process.exit(1);
        }

        console.log(`${bold}Ticket ${item.ticket_id} marked as completed${reset}`);
        console.log(`  Library:     ${item.library}`);
        console.log(`  Description: ${item.description}`);
        console.log(`  Status:      ${statusColor(item.status)}${item.status}${reset}`);
        console.log(`  Message:     ${argv.message}`);
      }
    )
    .command(
      'add-comment',
      'Add a comment to a feedback item',
      (yargs) => {
        return yargs
          .option('ticket', {
            alias: 't',
            type: 'string',
            description: 'Ticket ID (e.g., fb-a1b2c3d4)',
            demandOption: true,
          })
          .option('message', {
            alias: 'm',
            type: 'string',
            description: 'Comment text',
            demandOption: true,
          })
          .option('user', {
            alias: 'u',
            type: 'string',
            description: 'User adding the comment',
          });
      },
      (argv) => {
        const item = getFeedbackByTicketId(argv.ticket);

        if (!item) {
          console.error(`Ticket "${argv.ticket}" not found.`);
          process.exit(1);
        }

        const comment = addComment(argv.ticket, argv.message, 'comment', argv.user);
        console.log(`Comment added to ${bold}${argv.ticket}${reset}`);
        console.log(`  ${comment.comment}`);
        if (comment.user) {
          console.log(`  ${dim}By: ${comment.user}${reset}`);
        }
        console.log(`  ${dim}Date: ${formatDate(comment.created_at)}${reset}`);
      }
    )
    .command(
      'show',
      'Show details and comment history for a feedback item',
      (yargs) => {
        return yargs
          .option('ticket', {
            alias: 't',
            type: 'string',
            description: 'Ticket ID (e.g., fb-a1b2c3d4)',
            demandOption: true,
          });
      },
      (argv) => {
        const item = getFeedbackByTicketId(argv.ticket);

        if (!item) {
          console.error(`Ticket "${argv.ticket}" not found.`);
          process.exit(1);
        }

        const comments = getComments(argv.ticket);

        console.log(`\n${bold}${item.ticket_id}${reset} - ${item.library}`);
        console.log('='.repeat(40));
        console.log(`  Severity:    ${severityColor(item.severity)}${item.severity}${reset}`);
        console.log(`  Status:      ${statusColor(item.status)}${item.status}${reset}`);
        console.log(`  Description: ${item.description}`);
        if (item.context) {
          console.log(`  Context:     ${item.context}`);
        }
        if (item.user) {
          console.log(`  Reporter:    ${item.user}`);
        }
        console.log(`  Created:     ${formatDate(item.created_at)}`);

        if (comments.length > 0) {
          console.log(`\n${bold}History (${comments.length} comment(s)):${reset}`);
          for (const c of comments) {
            const typeLabel = c.type === 'completion'
              ? '[Completed]'
              : c.type === 'status_change'
                ? '[Status Change]'
                : '[Comment]';
            const typeColor = c.type === 'completion'
              ? statusColor('completed')
              : c.type === 'status_change'
                ? statusColor('accepted')
                : '';
            console.log(`  ${typeColor}${typeLabel}${reset} ${formatDate(c.created_at)}${c.user ? ` by ${c.user}` : ''}`);
            console.log(`    ${c.comment}`);
          }
        } else {
          console.log(`\n${dim}No comments yet.${reset}`);
        }
        console.log();
      }
    )
    .demandCommand(1, 'You must specify a command')
    .help()
    .parse();
}

main();
