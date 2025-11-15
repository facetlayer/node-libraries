import express from 'express';

export interface CorsConfig {
  /** Base URL for web application (e.g., 'example.com' or 'https://example.com') */
  webBaseUrl?: string;
  /** Allow localhost origins for testing */
  enableTestEndpoints?: boolean;
}

function setACAOHeader(res: express.Response, reqOrigin: string, config: CorsConfig) {
  const webBaseUrl = config.webBaseUrl;

  if (!reqOrigin) {
    // No origin header - probably a same-origin request.
    if (webBaseUrl) {
      res.header('Access-Control-Allow-Origin', webBaseUrl);
    }
    return;
  }

  // Origin header is present - check for whitelisted cases
  if (webBaseUrl) {
    const allowedOrigins = [`https://${webBaseUrl}`];
    if (allowedOrigins.includes(reqOrigin)) {
      // Matches whitelist
      res.header('Access-Control-Allow-Origin', reqOrigin);
      return;
    }
  }

  // Special case for testing: Allow any localhost port when test endpoints are enabled
  if (config.enableTestEndpoints && reqOrigin.startsWith('http://localhost:')) {
    res.header('Access-Control-Allow-Origin', reqOrigin);
    return;
  }
}

export function corsMiddleware(config: CorsConfig = {}) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    setACAOHeader(res, req.headers.origin, config);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.header(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cookie, Cache-Control'
    );
    res.header('Access-Control-Max-Age', '86400');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }

    next();
  };
}
