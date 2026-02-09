import { type ErrorHandler } from 'hono';
import { type ContentfulStatusCode } from 'hono/utils/http-status';

export interface APIError extends Error {
  statusCode?: ContentfulStatusCode;
  isOperational?: boolean;
}

export const errorHandler: ErrorHandler = (err, c) => {
  const statusCode = (err as APIError).statusCode || 500;
  const message = err.message || 'Internal Server Error';

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
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  }, statusCode);
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
