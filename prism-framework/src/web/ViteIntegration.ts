/*
 * ViteIntegration
 *
 * Provides web serving capabilities for Prism apps. In development mode,
 * uses Vite's dev server middleware (if available) for HMR and fast builds.
 * Falls back to serving static files when Vite is not installed or in production.
 */

import express from 'express';
import { existsSync } from 'fs';
import { join, resolve } from 'path';
import type { Server } from 'http';
import { logInfo } from '../logging/index.ts';

export interface WebConfig {
  /** Directory containing web files (index.html, etc.). In production, serves from dir/dist if it exists. */
  dir: string;
}

/**
 * Sets up web file serving on the Express app. This should be called AFTER
 * API routes are mounted so that /api/* takes priority.
 *
 * In development (NODE_ENV !== 'production'):
 *   - Tries to use Vite dev server in middleware mode
 *   - Falls back to express.static if Vite is not installed
 *
 * In production:
 *   - Serves static files from dir/dist (or dir if dist doesn't exist)
 *   - SPA fallback: unmatched GET requests serve index.html
 */
export async function setupWebMiddleware(
  expressApp: express.Application,
  webConfig: WebConfig,
  httpServer?: Server,
): Promise<void> {
  const isDev = process.env.NODE_ENV !== 'production';
  const webDir = resolve(webConfig.dir);

  if (isDev) {
    let vite: any;
    try {
      vite = await (Function('return import("vite")')());
    } catch {
      // Vite not installed, fall through to static serving
    }

    if (vite) {
      const viteServer = await vite.createServer({
        root: webDir,
        server: {
          middlewareMode: true,
          // Use the shared HTTP server for HMR WebSocket to avoid port conflicts
          // when multiple Prism apps run simultaneously.
          hmr: httpServer ? { server: httpServer } : true,
        },
        appType: 'spa',
      });
      expressApp.use(viteServer.middlewares);
      logInfo(`Vite dev server middleware attached for ${webDir}`);
      return;
    }
  }

  // Static file serving (production, or dev without Vite)
  const distDir = join(webDir, 'dist');
  const serveDir = (!isDev && existsSync(distDir)) ? distDir : webDir;

  expressApp.use(express.static(serveDir));

  // SPA fallback: serve index.html for unmatched GET requests
  const indexPath = join(serveDir, 'index.html');
  expressApp.get('*', (req, res) => {
    if (existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send('Not found');
    }
  });

  logInfo(`Serving static files from ${serveDir}`);
}
