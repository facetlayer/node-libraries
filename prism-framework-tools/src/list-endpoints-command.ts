import { callEndpoint } from './call-command.ts';

/**
 * List all available endpoints by calling the introspection endpoint
 */
export async function listEndpoints(baseUrl: string): Promise<void> {
  try {
    // Try to call a list endpoints API if it exists
    // This is optional - the server may not have this endpoint
    const response = await callEndpoint({
      baseUrl,
      positionalArgs: ['GET', '/endpoints.json'],
      namedArgs: {},
    });
    const endpoints = response.endpoints;

    console.log('Available endpoints:\n');
    if (Array.isArray(endpoints)) {
      for (const endpoint of endpoints) {
        const fullPath = `${endpoint.method} ${endpoint.path}`;
        console.log(`  ${fullPath}`);
        if (endpoint.description) {
          console.log(`    ${endpoint.description}`);
        }
      }
    } else {
      console.log(JSON.stringify(endpoints, null, 2));
    }
  } catch (error) {
    console.error('Could not list endpoints. The server may not support the /api/endpoints introspection endpoint.');
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
