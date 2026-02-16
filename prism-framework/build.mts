#! /usr/bin/env node

import { runBuildTool } from '@facetlayer/build-config-nodejs';
import { cpSync } from 'fs';

await runBuildTool({
  entryPoints: ['src/cli.ts'],
});
