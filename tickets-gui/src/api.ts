import { App, startServer } from '@facetlayer/prism-framework';
import { ticketsService } from './services/tickets-service.ts';

const PORT = parseInt(process.env.PRISM_API_PORT || '4810', 10);

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
      enableTestEndpoints: true,
    },
  });

  console.log(`Tickets Manager API running at http://localhost:${PORT}`);
}

main().catch(console.error);
