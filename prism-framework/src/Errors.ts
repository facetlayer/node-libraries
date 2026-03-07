/*
Errors

Helper classes for various HTTP error codes.
*/

export class HttpError extends Error {
  public statusCode: number;
  public details?: any;

  constructor(statusCode: number, message: string, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.name = 'HttpError';
  }
}

export class BadRequestError extends HttpError {
  constructor(message: string = 'Bad Request', details?: any) {
    super(400, message, details);
    this.name = 'BadRequestError';
  }
}

export class SchemaValidationError extends HttpError {
  constructor(message: string = 'Schema Validation Error', details?: any) {
    super(422, message, details);
    this.name = 'SchemaValidationError';
  }
}

export class ResponseSchemaValidationError extends HttpError {
  constructor(message: string = 'Response Schema Validation Error', details?: any) {
    super(500, message, details);
    this.name = 'ResponseSchemaValidationError';
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message: string = 'Unauthorized', details?: any) {
    super(401, message, details);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends HttpError {
  constructor(message: string = 'Forbidden', details?: any) {
    super(403, message, details);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends HttpError {
  constructor(message: string = 'Not Found', details?: any) {
    super(404, message, details);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends HttpError {
  constructor(message: string = 'Conflict', details?: any) {
    super(409, message, details);
    this.name = 'ConflictError';
  }
}

export class ValidationError extends HttpError {
  constructor(message: string = 'Validation Error', details?: any) {
    super(422, message, details);
    this.name = 'ValidationError';
  }
}

export class NotImplementedError extends HttpError {
  constructor(message: string = 'Not Implemented', details?: any) {
    super(501, message, details);
    this.name = 'NotImplementedError';
  }
}

export class ServiceUnavailableError extends HttpError {
  constructor(message: string = 'Service Unavailable', details?: any) {
    super(503, message, details);
    this.name = 'ServiceUnavailableError';
  }
}

export function createErrorFromStatus(
  statusCode: number,
  message?: string,
  details?: any
): HttpError {
  switch (statusCode) {
    case 400:
      return new BadRequestError(message, details);
    case 401:
      return new UnauthorizedError(message, details);
    case 403:
      return new ForbiddenError(message, details);
    case 404:
      return new NotFoundError(message, details);
    case 409:
      return new ConflictError(message, details);
    case 422:
      return new ValidationError(message, details);
    case 500:
      return new HttpError(500, message || 'Internal Server Error', details);
    case 501:
      return new NotImplementedError(message, details);
    case 503:
      return new ServiceUnavailableError(message, details);
    default:
      return new HttpError(statusCode, message || 'Unknown Error', details);
  }
}

export function isHttpError(error: any): error is HttpError {
  return error instanceof HttpError;
}
