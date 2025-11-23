#! /usr/bin/env node

import { runBuildTool } from '@facetlayer/build-config-cli-app';

await runBuildTool({
  entryPoints: ['src/cli.ts', 'src/index.ts'],
});
