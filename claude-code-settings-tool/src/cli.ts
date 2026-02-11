#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { DocFilesHelper } from '@facetlayer/docs-tool';
import { listAllowRules, addAllowRule } from './settings.ts';
import type { SettingsFileName } from './types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const __packageRoot = join(__dirname, '..');
const packageJson = JSON.parse(
  readFileSync(join(__packageRoot, 'package.json'), 'utf-8')
);

const docFiles = new DocFilesHelper({
  dirs: [join(__packageRoot, 'docs')],
  files: [join(__packageRoot, 'README.md')],
});

async function main() {
  const cli = yargs(hideBin(process.argv))
    .command(
      'list-rules [path]',
      'List all allow rules from settings files',
      (yargs) => {
        return yargs.positional('path', {
          type: 'string',
          describe: 'Project path (defaults to current directory)',
          default: '.',
        });
      },
      async (argv) => {
        const projectPath = argv.path as string;
        const rules = listAllowRules(projectPath);

        if (rules.length === 0) {
          console.log('No allow rules found.');
          return;
        }

        console.log(`Found ${rules.length} allow rule(s):\n`);
        for (const { rule, source } of rules) {
          console.log(`  ${rule}  (${source})`);
        }
      }
    )
    .command(
      'allow-rules <rules..>',
      'Add one or more allow rules to settings',
      (yargs) => {
        return yargs
          .positional('rules', {
            type: 'string',
            describe: 'Allow rules to add',
            array: true,
            demandOption: true,
          })
          .option('path', {
            type: 'string',
            describe: 'Project path (defaults to current directory)',
            default: '.',
          })
          .option('file', {
            type: 'string',
            describe: 'Target settings file',
            choices: ['settings.json', 'settings.local.json'] as const,
            default: 'settings.json' as SettingsFileName,
          });
      },
      async (argv) => {
        const projectPath = argv.path as string;
        const targetFile = argv.file as SettingsFileName;
        const rules = argv.rules as string[];

        let added = 0;
        let skipped = 0;

        for (const rule of rules) {
          const wasAdded = addAllowRule(projectPath, rule, targetFile);
          if (wasAdded) {
            console.log(`  Added: ${rule}`);
            added++;
          } else {
            console.log(`  Already exists: ${rule}`);
            skipped++;
          }
        }

        console.log(`\nDone. Added ${added} rule(s), skipped ${skipped} existing.`);
      }
    );

  docFiles.yargsSetup(cli);

  await cli
    .strictCommands()
    .demandCommand(1, 'You must specify a command')
    .help()
    .alias('help', 'h')
    .version(packageJson.version)
    .alias('version', 'v')
    .example([
      ['$0 list-rules', 'List all allow rules in the current project'],
      ['$0 list-rules /path/to/project', 'List allow rules for a specific project'],
      ['$0 allow-rules "Bash(npm test)" "Bash(npm run build)"', 'Add multiple allow rules'],
      ['$0 allow-rules "Bash(npm test)" --file settings.local.json', 'Add a rule to settings.local.json'],
    ])
    .parse();
}

main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
