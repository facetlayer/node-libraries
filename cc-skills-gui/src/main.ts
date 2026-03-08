#! /usr/bin/env node

import { App, startServer } from '@facetlayer/prism-framework';
import { skillsService } from './services/skills.ts';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const port = parseInt(process.env.PRISM_API_PORT || '4013', 10);

const app = new App({
  name: 'cc-skills-gui',
  description: 'Web GUI for editing Claude Code skills',
  services: [skillsService],
});

await startServer({
  app,
  port,
  web: {
    dir: join(__dirname, '..', 'web'),
  },
});

console.log(`cc-skills-gui running at http://localhost:${port}`);
