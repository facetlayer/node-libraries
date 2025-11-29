import cookieParser from 'cookie-parser';
import express from 'express';
import { Server } from 'http';
import { PrismApp } from '../app/PrismApp';
import { getMetrics } from '../Metrics';
import { corsMiddleware, CorsConfig } from './corsMiddleware';
import { mountPrismApp, setLoggers } from './ExpressEndpointSetup';
import { localhostOnlyMiddleware } from './localhostOnlyMiddleware';
import { requestContextMiddleware } from './requestContextMiddleware';
import { mountOpenAPIEndpoints, OpenAPIConfig } from './OpenAPI';

export interface ServerSetupConfig {
  port: number;
  app: PrismApp;
  openapiConfig?: OpenAPIConfig;
  corsConfig?: CorsConfig;
  logInfo?: (message: string) => void;
  logDebug?: (message: string) => void;
  logWarn?: (message: string) => void;
  logError?: (message: string, details?: any, error?: Error) => void;
}

export function createExpressApp(config: ServerSetupConfig): express.Application {
  const app = express();

  // Set up logging if provided
  if (config.logDebug && config.logWarn && config.logError) {
    setLoggers(config.logDebug, config.logWarn, config.logError);
  }

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

  mountPrismApp(app, config.app);

  return app;
}

export async function startServer(config: ServerSetupConfig): Promise<Server> {
  const port = config.port;

  const app = createExpressApp(config);

  const logInfo = config.logInfo || ((message: string) => console.log(`[INFO] ${message}`));

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
