import cookieParser from 'cookie-parser';
import express from 'express';
import { Server } from 'http';
import { getEnv } from '../Env';
import { getMetrics } from '../Metrics';
import { ServiceDefinition } from '../ServiceDefinition';
import { corsMiddleware } from './corsMiddleware';
import { mountEndpoints, mountMiddlewares, setLoggers } from './ExpressEndpointSetup';
import { localhostOnlyMiddleware } from './localhostOnlyMiddleware';
import { requestContextMiddleware } from './requestContextMiddleware';

export interface MainSetupConfig {
  port: number;
  services: ServiceDefinition[];
  logInfo?: (message: string) => void;
  logDebug?: (message: string) => void;
  logWarn?: (message: string) => void;
  logError?: (message: string, details?: any, error?: Error) => void;
}

export function createApp(config: MainSetupConfig): express.Application {
  const endpoints = config.services.flatMap(service => service.endpoints || []);
  const middlewares = config.services.flatMap(service => service.middleware || []);

  const app = express();

  // Set up logging if provided
  if (config.logDebug && config.logWarn && config.logError) {
    setLoggers(config.logDebug, config.logWarn, config.logError);
  }

  app.use(corsMiddleware);
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(requestContextMiddleware);
  app.use(cookieParser());

  // Mount service-defined middleware
  if (middlewares) {
    mountMiddlewares(app, middlewares);
  }

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

  // Endpoints
  mountEndpoints(app, endpoints);

  // General 404 handler
  app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  return app;
}

export async function startServer(config: MainSetupConfig): Promise<Server> {
  const appConfig = getEnv();
  const port = config.port || appConfig.port;

  const app = createApp(config);

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
