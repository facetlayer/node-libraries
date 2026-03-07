#! /usr/bin/env node

import { App, mountPrismApp } from '@facetlayer/prism-framework';
import { skillsService } from './services/skills.ts';
import { buildHtmlPage } from './ui/buildHtmlPage.ts';

const port = parseInt(process.env.PRISM_API_PORT || '4013', 10);

const app = new App({
  name: 'cc-skills-gui',
  description: 'Web GUI for editing Claude Code skills',
  services: [skillsService],
});

// Build Express app manually (instead of createExpressApp) so we control route order
// and can serve HTML at GET / before the 404 handler.
async function main() {
  const express = (await import('express')).default;

  const expressApp = express();
  expressApp.use(express.json());

  // Serve the HTML page at root
  expressApp.get('/', (_req: any, res: any) => {
    res.setHeader('Content-Type', 'text/html');
    res.send(buildHtmlPage());
  });

  // Mount API endpoints from prism app
  mountPrismApp(expressApp as any, app);

  // 404 handler
  expressApp.use((_req: any, res: any) => {
    res.status(404).json({ error: 'Not found' });
  });

  const server = expressApp.listen(port, () => {
    console.log(`cc-skills-gui running at http://localhost:${port}`);
  });

  process.on('SIGTERM', () => {
    server.close(() => process.exit(0));
  });
}

main();
