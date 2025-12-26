import { describe, expect, it, vi } from 'vitest';
import { corsMiddleware, CorsConfig } from '../web/corsMiddleware.ts';
import { Request, Response, NextFunction } from 'express';

function createMockRequest(options: { origin?: string; method?: string } = {}): Partial<Request> {
  return {
    headers: {
      origin: options.origin,
    },
    method: options.method ?? 'GET',
  };
}

function createMockResponse(): { res: Partial<Response>; headers: Record<string, string> } {
  const headers: Record<string, string> = {};
  const res: Partial<Response> = {
    header: vi.fn((key: string, value: string) => {
      headers[key] = value;
      return res as Response;
    }),
    sendStatus: vi.fn(),
  };
  return { res, headers };
}

describe('corsMiddleware', () => {
  describe('default configuration', () => {
    it('should work with no config (empty object)', () => {
      const middleware = corsMiddleware();
      const req = createMockRequest();
      const { res, headers } = createMockResponse();
      const next = vi.fn();

      middleware(req as Request, res as Response, next as NextFunction);

      expect(next).toHaveBeenCalled();
      expect(headers['Access-Control-Allow-Credentials']).toBe('true');
      expect(headers['Access-Control-Allow-Methods']).toBe('GET, POST, PUT, DELETE, OPTIONS, PATCH');
    });

    it('should work with undefined config', () => {
      const middleware = corsMiddleware(undefined);
      const req = createMockRequest();
      const { res } = createMockResponse();
      const next = vi.fn();

      middleware(req as Request, res as Response, next as NextFunction);

      expect(next).toHaveBeenCalled();
    });

    it('should work with empty config object', () => {
      const middleware = corsMiddleware({});
      const req = createMockRequest();
      const { res } = createMockResponse();
      const next = vi.fn();

      middleware(req as Request, res as Response, next as NextFunction);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('CORS headers', () => {
    it('should set standard CORS headers', () => {
      const middleware = corsMiddleware({});
      const req = createMockRequest();
      const { res, headers } = createMockResponse();
      const next = vi.fn();

      middleware(req as Request, res as Response, next as NextFunction);

      expect(headers['Access-Control-Allow-Credentials']).toBe('true');
      expect(headers['Access-Control-Allow-Methods']).toBe('GET, POST, PUT, DELETE, OPTIONS, PATCH');
      expect(headers['Access-Control-Allow-Headers']).toContain('Content-Type');
      expect(headers['Access-Control-Allow-Headers']).toContain('Authorization');
      expect(headers['Access-Control-Max-Age']).toBe('86400');
    });
  });

  describe('webBaseUrl configuration', () => {
    it('should set ACAO header to webBaseUrl for requests without origin', () => {
      const config: CorsConfig = { webBaseUrl: 'example.com' };
      const middleware = corsMiddleware(config);
      const req = createMockRequest({ origin: undefined });
      const { res, headers } = createMockResponse();
      const next = vi.fn();

      middleware(req as Request, res as Response, next as NextFunction);

      expect(headers['Access-Control-Allow-Origin']).toBe('example.com');
    });

    it('should allow origin matching https://webBaseUrl', () => {
      const config: CorsConfig = { webBaseUrl: 'example.com' };
      const middleware = corsMiddleware(config);
      const req = createMockRequest({ origin: 'https://example.com' });
      const { res, headers } = createMockResponse();
      const next = vi.fn();

      middleware(req as Request, res as Response, next as NextFunction);

      expect(headers['Access-Control-Allow-Origin']).toBe('https://example.com');
    });

    it('should not set ACAO for non-matching origins', () => {
      const config: CorsConfig = { webBaseUrl: 'example.com' };
      const middleware = corsMiddleware(config);
      const req = createMockRequest({ origin: 'https://evil.com' });
      const { res, headers } = createMockResponse();
      const next = vi.fn();

      middleware(req as Request, res as Response, next as NextFunction);

      expect(headers['Access-Control-Allow-Origin']).toBeUndefined();
    });
  });

  describe('enableTestEndpoints configuration', () => {
    it('should allow localhost origins when enableTestEndpoints is true', () => {
      const config: CorsConfig = { enableTestEndpoints: true };
      const middleware = corsMiddleware(config);
      const req = createMockRequest({ origin: 'http://localhost:3000' });
      const { res, headers } = createMockResponse();
      const next = vi.fn();

      middleware(req as Request, res as Response, next as NextFunction);

      expect(headers['Access-Control-Allow-Origin']).toBe('http://localhost:3000');
    });

    it('should allow any localhost port when enableTestEndpoints is true', () => {
      const config: CorsConfig = { enableTestEndpoints: true };
      const middleware = corsMiddleware(config);
      const ports = [3000, 4000, 5173, 8080];

      for (const port of ports) {
        const req = createMockRequest({ origin: `http://localhost:${port}` });
        const { res, headers } = createMockResponse();
        const next = vi.fn();

        middleware(req as Request, res as Response, next as NextFunction);

        expect(headers['Access-Control-Allow-Origin']).toBe(`http://localhost:${port}`);
      }
    });

    it('should not allow localhost origins when enableTestEndpoints is false', () => {
      const config: CorsConfig = { enableTestEndpoints: false };
      const middleware = corsMiddleware(config);
      const req = createMockRequest({ origin: 'http://localhost:3000' });
      const { res, headers } = createMockResponse();
      const next = vi.fn();

      middleware(req as Request, res as Response, next as NextFunction);

      expect(headers['Access-Control-Allow-Origin']).toBeUndefined();
    });

    it('should not allow localhost origins by default', () => {
      const config: CorsConfig = {};
      const middleware = corsMiddleware(config);
      const req = createMockRequest({ origin: 'http://localhost:3000' });
      const { res, headers } = createMockResponse();
      const next = vi.fn();

      middleware(req as Request, res as Response, next as NextFunction);

      expect(headers['Access-Control-Allow-Origin']).toBeUndefined();
    });
  });

  describe('OPTIONS preflight requests', () => {
    it('should respond with 200 for OPTIONS requests', () => {
      const middleware = corsMiddleware({});
      const req = createMockRequest({ method: 'OPTIONS' });
      const { res } = createMockResponse();
      const next = vi.fn();

      middleware(req as Request, res as Response, next as NextFunction);

      expect(res.sendStatus).toHaveBeenCalledWith(200);
      expect(next).not.toHaveBeenCalled();
    });

    it('should not call next() for OPTIONS requests', () => {
      const middleware = corsMiddleware({});
      const req = createMockRequest({ method: 'OPTIONS' });
      const { res } = createMockResponse();
      const next = vi.fn();

      middleware(req as Request, res as Response, next as NextFunction);

      expect(next).not.toHaveBeenCalled();
    });

    it('should call next() for non-OPTIONS requests', () => {
      const middleware = corsMiddleware({});
      const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

      for (const method of methods) {
        const req = createMockRequest({ method });
        const { res } = createMockResponse();
        const next = vi.fn();

        middleware(req as Request, res as Response, next as NextFunction);

        expect(next).toHaveBeenCalled();
      }
    });
  });

  describe('combined configuration', () => {
    it('should handle webBaseUrl and enableTestEndpoints together', () => {
      const config: CorsConfig = {
        webBaseUrl: 'example.com',
        enableTestEndpoints: true,
      };
      const middleware = corsMiddleware(config);

      // Should allow webBaseUrl
      {
        const req = createMockRequest({ origin: 'https://example.com' });
        const { res, headers } = createMockResponse();
        middleware(req as Request, res as Response, vi.fn() as NextFunction);
        expect(headers['Access-Control-Allow-Origin']).toBe('https://example.com');
      }

      // Should also allow localhost
      {
        const req = createMockRequest({ origin: 'http://localhost:3000' });
        const { res, headers } = createMockResponse();
        middleware(req as Request, res as Response, vi.fn() as NextFunction);
        expect(headers['Access-Control-Allow-Origin']).toBe('http://localhost:3000');
      }
    });
  });
});
