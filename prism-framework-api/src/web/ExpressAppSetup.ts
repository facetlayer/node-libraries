import cookieParser from 'cookie-parser';
import express from 'express';
import { Server } from 'http';
import { PrismApp } from '../app/PrismApp.ts';
import { getMetrics } from '../Metrics.ts';
import { corsMiddleware, CorsConfig } from './corsMiddleware.ts';
import { mountPrismApp, } from './ExpressEndpointSetup.ts';
import { localhostOnlyMiddleware } from './localhostOnlyMiddleware.ts';
import { requestContextMiddleware } from './requestContextMiddleware.ts';
import { mountOpenAPIEndpoints, OpenAPIConfig } from './openapi/OpenAPI.ts';
import { createListingEndpoints } from './EndpointListing.ts';
import { captureError } from '@facetlayer/Streams';
import { logError, logInfo } from '../logging/index.ts';

export interface ServerSetupConfig {
  port: number;
  app: PrismApp;
  openapiConfig?: OpenAPIConfig;
  corsConfig?: CorsConfig;
}

export function createExpressApp(config: ServerSetupConfig): express.Application {
  const app = express();

  app.use(corsMiddleware(config.corsConfig));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(requestContextMiddleware);
  app.use(cookieParser());

  // Health check endpoint
  app.get('/health', localhostOnlyMiddleware, (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Prometheus metrics endpoint (localhost only)
  app.get('/metrics', localhostOnlyMiddleware, async (req, res) => {
    try {
      const metrics = await getMetrics();
      res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
      res.end(metrics);
    } catch (error) {
      res.status(500).json({ error: 'Failed to retrieve metrics' });
    }
  });

  if (config.openapiConfig) {
    mountOpenAPIEndpoints(config.openapiConfig, app, config.app);
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
      app.get(endpoint.path, handler);
    }
  }

  mountPrismApp(app, config.app);

  // 404 handling
  app.use((req, res) => {
      res.status(404);
      res.json({ error: "Not found" });
  });

  return app;
}

export async function startServer(config: ServerSetupConfig): Promise<Server> {
  const port = config.port;

  const app = createExpressApp(config);

  const server = app.listen(port, () => {
    logInfo(`Server now listening on port ${port}`);
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
