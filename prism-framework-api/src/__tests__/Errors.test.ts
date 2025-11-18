import {
  HttpError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
  NotImplementedError,
  ServiceUnavailableError,
  SchemaValidationError,
  ResponseSchemaValidationError,
  createErrorFromStatus,
  isHttpError,
} from '../Errors';
import { describe, expect, it } from 'vitest';

describe('HttpError', () => {
  it('should create an HttpError with status code and message', () => {
    const error = new HttpError(500, 'Internal Server Error');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(HttpError);
    expect(error.statusCode).toBe(500);
    expect(error.message).toBe('Internal Server Error');
    expect(error.name).toBe('HttpError');
    expect(error.details).toBeUndefined();
  });

  it('should create an HttpError with details', () => {
    const details = { field: 'email', issue: 'invalid format' };
    const error = new HttpError(400, 'Bad Request', details);

    expect(error.statusCode).toBe(400);
    expect(error.message).toBe('Bad Request');
    expect(error.details).toEqual(details);
  });
});

describe('BadRequestError', () => {
  it('should create a BadRequestError with default message', () => {
    const error = new BadRequestError();

    expect(error).toBeInstanceOf(HttpError);
    expect(error.statusCode).toBe(400);
    expect(error.message).toBe('Bad Request');
    expect(error.name).toBe('BadRequestError');
  });

  it('should create a BadRequestError with custom message', () => {
    const error = new BadRequestError('Invalid input');

    expect(error.statusCode).toBe(400);
    expect(error.message).toBe('Invalid input');
  });

  it('should create a BadRequestError with details', () => {
    const details = { field: 'username' };
    const error = new BadRequestError('Missing required field', details);

    expect(error.statusCode).toBe(400);
    expect(error.message).toBe('Missing required field');
    expect(error.details).toEqual(details);
  });
});

describe('SchemaValidationError', () => {
  it('should create a SchemaValidationError with correct status code', () => {
    const error = new SchemaValidationError();

    expect(error).toBeInstanceOf(HttpError);
    expect(error.statusCode).toBe(422);
    expect(error.message).toBe('Schema Validation Error');
    expect(error.name).toBe('SchemaValidationError');
  });

  it('should create a SchemaValidationError with custom message and details', () => {
    const details = { errors: ['field1 required', 'field2 invalid'] };
    const error = new SchemaValidationError('Request schema invalid', details);

    expect(error.statusCode).toBe(422);
    expect(error.message).toBe('Request schema invalid');
    expect(error.details).toEqual(details);
  });
});

describe('ResponseSchemaValidationError', () => {
  it('should create a ResponseSchemaValidationError with correct status code', () => {
    const error = new ResponseSchemaValidationError();

    expect(error).toBeInstanceOf(HttpError);
    expect(error.statusCode).toBe(500);
    expect(error.message).toBe('Response Schema Validation Error');
    expect(error.name).toBe('ResponseSchemaValidationError');
  });

  it('should create a ResponseSchemaValidationError with custom message', () => {
    const error = new ResponseSchemaValidationError('Response does not match schema');

    expect(error.statusCode).toBe(500);
    expect(error.message).toBe('Response does not match schema');
  });
});

describe('UnauthorizedError', () => {
  it('should create an UnauthorizedError with default message', () => {
    const error = new UnauthorizedError();

    expect(error).toBeInstanceOf(HttpError);
    expect(error.statusCode).toBe(401);
    expect(error.message).toBe('Unauthorized');
    expect(error.name).toBe('UnauthorizedError');
  });

  it('should create an UnauthorizedError with custom message', () => {
    const error = new UnauthorizedError('Invalid token');

    expect(error.statusCode).toBe(401);
    expect(error.message).toBe('Invalid token');
  });
});

describe('ForbiddenError', () => {
  it('should create a ForbiddenError with default message', () => {
    const error = new ForbiddenError();

    expect(error).toBeInstanceOf(HttpError);
    expect(error.statusCode).toBe(403);
    expect(error.message).toBe('Forbidden');
    expect(error.name).toBe('ForbiddenError');
  });

  it('should create a ForbiddenError with custom message', () => {
    const error = new ForbiddenError('Access denied');

    expect(error.statusCode).toBe(403);
    expect(error.message).toBe('Access denied');
  });
});

describe('NotFoundError', () => {
  it('should create a NotFoundError with default message', () => {
    const error = new NotFoundError();

    expect(error).toBeInstanceOf(HttpError);
    expect(error.statusCode).toBe(404);
    expect(error.message).toBe('Not Found');
    expect(error.name).toBe('NotFoundError');
  });

  it('should create a NotFoundError with custom message', () => {
    const error = new NotFoundError('Resource not found');

    expect(error.statusCode).toBe(404);
    expect(error.message).toBe('Resource not found');
  });
});

describe('ConflictError', () => {
  it('should create a ConflictError with default message', () => {
    const error = new ConflictError();

    expect(error).toBeInstanceOf(HttpError);
    expect(error.statusCode).toBe(409);
    expect(error.message).toBe('Conflict');
    expect(error.name).toBe('ConflictError');
  });

  it('should create a ConflictError with custom message', () => {
    const error = new ConflictError('Username already exists');

    expect(error.statusCode).toBe(409);
    expect(error.message).toBe('Username already exists');
  });
});

describe('ValidationError', () => {
  it('should create a ValidationError with default message', () => {
    const error = new ValidationError();

    expect(error).toBeInstanceOf(HttpError);
    expect(error.statusCode).toBe(422);
    expect(error.message).toBe('Validation Error');
    expect(error.name).toBe('ValidationError');
  });

  it('should create a ValidationError with custom message', () => {
    const error = new ValidationError('Email format invalid');

    expect(error.statusCode).toBe(422);
    expect(error.message).toBe('Email format invalid');
  });
});

describe('NotImplementedError', () => {
  it('should create a NotImplementedError with default message', () => {
    const error = new NotImplementedError();

    expect(error).toBeInstanceOf(HttpError);
    expect(error.statusCode).toBe(501);
    expect(error.message).toBe('Not Implemented');
    expect(error.name).toBe('NotImplementedError');
  });

  it('should create a NotImplementedError with custom message', () => {
    const error = new NotImplementedError('Feature not implemented');

    expect(error.statusCode).toBe(501);
    expect(error.message).toBe('Feature not implemented');
  });
});

describe('ServiceUnavailableError', () => {
  it('should create a ServiceUnavailableError with default message', () => {
    const error = new ServiceUnavailableError();

    expect(error).toBeInstanceOf(HttpError);
    expect(error.statusCode).toBe(503);
    expect(error.message).toBe('Service Unavailable');
    expect(error.name).toBe('ServiceUnavailableError');
  });

  it('should create a ServiceUnavailableError with custom message', () => {
    const error = new ServiceUnavailableError('Database connection failed');

    expect(error.statusCode).toBe(503);
    expect(error.message).toBe('Database connection failed');
  });
});

describe('createErrorFromStatus', () => {
  it('should create BadRequestError for 400', () => {
    const error = createErrorFromStatus(400, 'Bad input');

    expect(error).toBeInstanceOf(BadRequestError);
    expect(error.statusCode).toBe(400);
    expect(error.message).toBe('Bad input');
  });

  it('should create UnauthorizedError for 401', () => {
    const error = createErrorFromStatus(401, 'Auth failed');

    expect(error).toBeInstanceOf(UnauthorizedError);
    expect(error.statusCode).toBe(401);
    expect(error.message).toBe('Auth failed');
  });

  it('should create ForbiddenError for 403', () => {
    const error = createErrorFromStatus(403, 'No access');

    expect(error).toBeInstanceOf(ForbiddenError);
    expect(error.statusCode).toBe(403);
    expect(error.message).toBe('No access');
  });

  it('should create NotFoundError for 404', () => {
    const error = createErrorFromStatus(404, 'Missing');

    expect(error).toBeInstanceOf(NotFoundError);
    expect(error.statusCode).toBe(404);
    expect(error.message).toBe('Missing');
  });

  it('should create ConflictError for 409', () => {
    const error = createErrorFromStatus(409, 'Duplicate');

    expect(error).toBeInstanceOf(ConflictError);
    expect(error.statusCode).toBe(409);
    expect(error.message).toBe('Duplicate');
  });

  it('should create ValidationError for 422', () => {
    const error = createErrorFromStatus(422, 'Invalid data');

    expect(error).toBeInstanceOf(ValidationError);
    expect(error.statusCode).toBe(422);
    expect(error.message).toBe('Invalid data');
  });

  it('should create HttpError for 500', () => {
    const error = createErrorFromStatus(500, 'Server error');

    expect(error).toBeInstanceOf(HttpError);
    expect(error.statusCode).toBe(500);
    expect(error.message).toBe('Server error');
  });

  it('should create HttpError for 500 with default message', () => {
    const error = createErrorFromStatus(500);

    expect(error).toBeInstanceOf(HttpError);
    expect(error.statusCode).toBe(500);
    expect(error.message).toBe('Internal Server Error');
  });

  it('should create NotImplementedError for 501', () => {
    const error = createErrorFromStatus(501, 'Not ready');

    expect(error).toBeInstanceOf(NotImplementedError);
    expect(error.statusCode).toBe(501);
    expect(error.message).toBe('Not ready');
  });

  it('should create ServiceUnavailableError for 503', () => {
    const error = createErrorFromStatus(503, 'Down');

    expect(error).toBeInstanceOf(ServiceUnavailableError);
    expect(error.statusCode).toBe(503);
    expect(error.message).toBe('Down');
  });

  it('should create generic HttpError for unknown status codes', () => {
    const error = createErrorFromStatus(418, 'Teapot');

    expect(error).toBeInstanceOf(HttpError);
    expect(error.statusCode).toBe(418);
    expect(error.message).toBe('Teapot');
  });

  it('should create generic HttpError with default message for unknown status codes', () => {
    const error = createErrorFromStatus(418);

    expect(error).toBeInstanceOf(HttpError);
    expect(error.statusCode).toBe(418);
    expect(error.message).toBe('Unknown Error');
  });

  it('should pass details to created errors', () => {
    const details = { extra: 'info' };
    const error = createErrorFromStatus(400, 'Error with details', details);

    expect(error.details).toEqual(details);
  });
});

describe('isHttpError', () => {
  it('should return true for HttpError instances', () => {
    const error = new HttpError(500, 'Error');

    expect(isHttpError(error)).toBe(true);
  });

  it('should return true for BadRequestError instances', () => {
    const error = new BadRequestError();

    expect(isHttpError(error)).toBe(true);
  });

  it('should return true for all error subclasses', () => {
    expect(isHttpError(new UnauthorizedError())).toBe(true);
    expect(isHttpError(new ForbiddenError())).toBe(true);
    expect(isHttpError(new NotFoundError())).toBe(true);
    expect(isHttpError(new ConflictError())).toBe(true);
    expect(isHttpError(new ValidationError())).toBe(true);
    expect(isHttpError(new NotImplementedError())).toBe(true);
    expect(isHttpError(new ServiceUnavailableError())).toBe(true);
  });

  it('should return false for standard Error instances', () => {
    const error = new Error('Standard error');

    expect(isHttpError(error)).toBe(false);
  });

  it('should return false for non-error objects', () => {
    expect(isHttpError({})).toBe(false);
    expect(isHttpError(null)).toBe(false);
    expect(isHttpError(undefined)).toBe(false);
    expect(isHttpError('error')).toBe(false);
    expect(isHttpError(123)).toBe(false);
  });

  it('should return false for objects with statusCode property but not HttpError', () => {
    const fakeError = { statusCode: 400, message: 'Fake' };

    expect(isHttpError(fakeError)).toBe(false);
  });
});
