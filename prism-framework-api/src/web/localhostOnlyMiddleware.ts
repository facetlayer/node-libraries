import { NextFunction, Request, Response } from 'express';

/*
localhostOnlyMiddleware

Special middleware that restricts an endpoint so that it can only be used by localhost client.
*/

export function localhostOnlyMiddleware(req: Request, res: Response, next: NextFunction) {
  const allowedIPs = ['127.0.0.1', '::1', '::ffff:127.0.0.1']; // localhost variations

  const clientIP = req.ip || req.connection?.remoteAddress;

  if (!allowedIPs.includes(clientIP)) {
    return res.status(404).json({ error: 'Not found' });
  }

  next();
}
