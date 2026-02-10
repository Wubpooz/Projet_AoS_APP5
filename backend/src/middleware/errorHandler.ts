import { type ErrorHandler } from 'hono';
import { type ContentfulStatusCode } from 'hono/utils/http-status';

export interface APIError extends Error {
  statusCode?: ContentfulStatusCode;
  isOperational?: boolean;
}

export const errorHandler: ErrorHandler = (err, c) => {
  const statusCode = (err as APIError).statusCode || (err as { status?: number }).status || 500;
  const isOperational = (err as APIError).isOperational === true;
  const message = statusCode >= 500 && !isOperational
    ? 'Internal Server Error'
    : (err.message || 'Internal Server Error');

  const stack = err.stack || '';
  const origin = stack
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.startsWith('at ') && !line.includes('node:internal') && !line.includes('node_modules'));

  const cause = (err as { cause?: unknown }).cause;
  const causeInfo = cause instanceof Error
    ? { name: cause.name, message: cause.message, stack: cause.stack }
    : cause;

  // Log error
  console.error('Error occurred', {
    statusCode,
    message,
    name: err.name,
    requestId: c.get('requestId'),
    origin,
    stack,
    cause: causeInfo,
    path: c.req.path,
    method: c.req.method,
  });

  console.debug(err);

  // Send error response
  return c.json({
    error: {
      message,
    },
  }, statusCode as ContentfulStatusCode);
};

export class AppError extends Error implements APIError {
  statusCode: ContentfulStatusCode;
  isOperational: boolean;

  constructor(message: string, statusCode: ContentfulStatusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}
