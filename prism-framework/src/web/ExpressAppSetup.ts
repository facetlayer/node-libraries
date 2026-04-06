import cookieParser from 'cookie-parser';
import express from 'express';
import { createServer as createHttpServer, type Server } from 'http';
import { PrismApp } from '../app/PrismApp.ts';
import { configureMetrics, getMetrics, type MetricsConfig } from '../Metrics.ts';
import { corsMiddleware, type CorsConfig } from './corsMiddleware.ts';
import { mountPrismApp, } from './ExpressEndpointSetup.ts';
import { localhostOnlyMiddleware } from './localhostOnlyMiddleware.ts';
import { requestContextMiddleware } from './requestContextMiddleware.ts';
import { mountOpenAPIEndpoints, type OpenAPIConfig } from './openapi/OpenAPI.ts';
import { createListingEndpoints } from './EndpointListing.ts';
import { captureError } from '@facetlayer/streams';
import { logError, logInfo } from '../logging/index.ts';
import { validateAppOrThrow } from '../app/validateApp.ts';
import { setupWebMiddleware, type WebConfig } from './ViteIntegration.ts';

export type { WebConfig } from './ViteIntegration.ts';

export interface ServerSetupConfig {
  /**
   * Port to listen on. If omitted, reads from PRISM_API_PORT env var, then falls back to 3000.
   */
  port?: number;
  app: PrismApp;
  openapiConfig?: OpenAPIConfig;
  corsConfig?: CorsConfig;
  /**
   * Serve web files alongside the API. When provided, API endpoints are mounted at /api/.
   * Can be a WebConfig object or a string path to the web directory.
   */
  web?: WebConfig | string;
  /**
   * Metrics configuration. When provided, all metrics are labeled with the app name.
   */
  metricsConfig?: MetricsConfig;
}

export function createExpressApp(config: ServerSetupConfig): express.Application {
  if (config.metricsConfig) {
    configureMetrics(config.metricsConfig);
  }

  const app = express();

  app.use(corsMiddleware(config.corsConfig ?? {}));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(requestContextMiddleware);
  app.use(cookieParser());

  // Create the API router - all API endpoints live under /api/
  const apiRouter = express.Router();

  // Health check endpoint
  apiRouter.get('/health', localhostOnlyMiddleware, (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Prometheus metrics endpoint (localhost only)
  apiRouter.get('/metrics', localhostOnlyMiddleware, async (req, res) => {
    try {
      const metrics = await getMetrics();
      res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
      res.end(metrics);
    } catch (error) {
      res.status(500).json({ error: 'Failed to retrieve metrics' });
    }
  });

  if (config.openapiConfig) {
    mountOpenAPIEndpoints(config.openapiConfig, apiRouter, config.app);
  }

  // Mount endpoint listing endpoints
  const allEndpoints = config.app.listAllEndpoints();
  const listingEndpoints = createListingEndpoints(allEndpoints);
  for (const endpoint of listingEndpoints) {
    const handler = async (req: express.Request, res: express.Response) => {
      try {
        const result = await endpoint.handler({});
        if (result.sendHttpResponse) {
          result.sendHttpResponse(res);
        } else {
          res.json(result);
        }
      } catch (error) {
        logError('Unhandled error in endpoint', {
          endpointPath: endpoint.path,
          error: captureError(error),
        });
        res.status(500).json({ error: 'Internal server error' });
      }
    };
    if (endpoint.method === 'GET') {
      apiRouter.get(endpoint.path, handler);
    }
  }

  mountPrismApp(apiRouter, config.app);

  // API 404 handler (only for /api/* routes)
  apiRouter.use((req: express.Request, res: express.Response) => {
    res.status(404).json({ error: "Not found" });
  });

  // Mount the API router at /api
  app.use('/api', apiRouter);

  return app;
}

function resolvePort(config: ServerSetupConfig): number {
  if (config.port != null) return config.port;
  const envPort = process.env.PRISM_API_PORT;
  if (envPort) return parseInt(envPort, 10);
  return 3000;
}

function resolveWebConfig(web: WebConfig | string | undefined): WebConfig | undefined {
  if (web == null) return undefined;
  if (typeof web === 'string') return { dir: web };
  return web;
}

export async function startServer(config: ServerSetupConfig): Promise<Server> {
  // Validate app configuration before starting
  validateAppOrThrow(config.app);

  const port = resolvePort(config);
  const webConfig = resolveWebConfig(config.web);

  const app = createExpressApp(config);

  // Create HTTP server so Vite can attach HMR WebSocket to it
  const server = createHttpServer(app);

  // Set up web serving before listening (Vite just needs the Server instance, not a listening one)
  if (webConfig) {
    await setupWebMiddleware(app, webConfig, server);
  }

  await new Promise<void>(resolve => {
    server.listen(port, () => {
      logInfo(`Server now listening on port ${port}`);
      resolve();
    });
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    logInfo('SIGTERM received, shutting down gracefully');
    server.close(() => {
      logInfo('Server closed');
      process.exit(0);
    });
  });

  return server;
}
