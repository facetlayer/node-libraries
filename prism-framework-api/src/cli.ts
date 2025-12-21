#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { DocFilesHelper } from '@facetlayer/doc-files-helper';

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
  const args = yargs(hideBin(process.argv));

  docFiles.yargsSetup(args);

  args
    .strictCommands()
    .demandCommand(1, 'You must specify a command')
    .help()
    .alias('help', 'h')
    .version(packageJson.version)
    .alias('version', 'v')
    .parse();
}

main();
