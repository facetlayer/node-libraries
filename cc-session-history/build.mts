#! /usr/bin/env node

import { runBuildTool } from '@facetlayer/build-config-nodejs';

await runBuildTool({
  entryPoints: ['src/index.ts', 'src/cli.ts'],
});
