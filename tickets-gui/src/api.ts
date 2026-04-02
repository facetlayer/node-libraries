import { App, startServer } from '@facetlayer/prism-framework';
import { ticketsService } from './services/tickets-service.ts';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PRISM_API_PORT || '4014', 10);

async function main() {
  const app = new App({
    name: 'Tickets Manager',
    description: 'Web interface for managing tickets',
    services: [ticketsService],
  });

  await startServer({
    port: PORT,
    app,
    corsConfig: {
      allowLocalhost: true,
    },
    web: {
      dir: join(__dirname, '..', 'web'),
    },
  });

  console.log(`Tickets Manager running at http://localhost:${PORT}`);
}

main().catch(console.error);
