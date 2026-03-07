#! /usr/bin/env node

import { runBuildTool } from '@facetlayer/build-config-nodejs';

await runBuildTool({
  entryPoints: ['src/main.ts'],
});
