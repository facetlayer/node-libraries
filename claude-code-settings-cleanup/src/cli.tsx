#!/usr/bin/env node

import React from 'react';
import { render } from 'ink';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { resolve } from 'path';
import { AppWithLoading } from './components/index.ts';
import { analyzeSettingsWithLLM, analyzeSettingsWithHeadless } from './analyzer/index.ts';
import type { AnalysisResult, Suggestion } from './types.ts';

function getSeverityIcon(severity: string): string {
  switch (severity) {
    case 'error':
      return '[!]';
    case 'warning':
      return '[*]';
    case 'info':
    default:
      return '[i]';
  }
}

function printSuggestion(suggestion: Suggestion, index: number): void {
  const icon = getSeverityIcon(suggestion.severity);
  console.log(`${icon} ${index + 1}. ${suggestion.title}`);
  console.log(`   ${suggestion.description}`);
  if (suggestion.affectedItems && suggestion.affectedItems.length > 0) {
    console.log('   Affected items:');
    for (const item of suggestion.affectedItems) {
      console.log(`     - ${item}`);
    }
  }
  if (suggestion.action) {
    console.log(
      `   Action: ${suggestion.action.type} ${suggestion.action.rules.join(', ')}${suggestion.action.newRule ? ` -> ${suggestion.action.newRule}` : ''}`
    );
  }
  console.log();
}

function printSuggestionsOnly(result: AnalysisResult, projectPath: string): void {
  console.log('Claude Settings Tidier');
  console.log('======================\n');
  console.log(`Project: ${projectPath}\n`);

  console.log('Files:');
  console.log(
    `  settings.json: ${result.settingsFile.exists ? 'Found' : 'Not found'}`
  );
  console.log(
    `  settings.local.json: ${result.localSettingsFile.exists ? 'Found' : 'Not found'}`
  );
  console.log();

  const { suggestions } = result;
  const errorCount = suggestions.filter((s) => s.severity === 'error').length;
  const warningCount = suggestions.filter((s) => s.severity === 'warning').length;
  const infoCount = suggestions.filter((s) => s.severity === 'info').length;

  if (suggestions.length === 0) {
    console.log('Summary: No issues found!');
    return;
  }

  const parts: string[] = [];
  if (errorCount > 0) parts.push(`${errorCount} error${errorCount !== 1 ? 's' : ''}`);
  if (warningCount > 0)
    parts.push(`${warningCount} warning${warningCount !== 1 ? 's' : ''}`);
  if (infoCount > 0)
    parts.push(`${infoCount} suggestion${infoCount !== 1 ? 's' : ''}`);
  console.log(`Summary: ${parts.join(', ')}\n`);

  console.log('Suggestions:');
  console.log('------------\n');
  suggestions.forEach((suggestion, index) => {
    printSuggestion(suggestion, index);
  });
}

async function main(): Promise<void> {
  await yargs(hideBin(process.argv))
    .scriptName('claude-settings-tidier')
    .command(
      ['$0 [path]', 'analyze [path]'],
      'Analyze Claude settings files and suggest cleanups',
      (yargs) =>
        yargs
          .positional('path', {
            describe: 'Path to the project directory',
            type: 'string',
            default: '.',
          })
          .option('suggestions-only', {
            alias: 's',
            describe:
              'Non-interactive mode: fetch and print suggestions, then exit',
            type: 'boolean',
            default: false,
          })
          .option('headless', {
            describe:
              'Use Claude Code in headless mode instead of the Anthropic SDK',
            type: 'boolean',
            default: false,
          }),
      async (argv) => {
        const projectPath = resolve(argv.path as string);
        const analyzeFunction = argv.headless ? analyzeSettingsWithHeadless : analyzeSettingsWithLLM;

        if (argv.suggestionsOnly) {
          console.log(`Analyzing settings with ${argv.headless ? 'Claude Code (headless)' : 'Anthropic SDK'}...\n`);
          const result = await analyzeFunction(projectPath);
          printSuggestionsOnly(result, projectPath);
          return;
        }

        const { waitUntilExit } = render(
          <AppWithLoading
            projectPath={projectPath}
            analyzeFunction={analyzeFunction}
          />
        );

        await waitUntilExit();
      },
    )
    .help()
    .version()
    .parse();
}

main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
