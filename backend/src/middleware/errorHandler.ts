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

  // Log error
  console.error('Error occurred', {
    statusCode,
    message,
    stack: err.stack,
    path: c.req.path,
    method: c.req.method,
  });

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
