import { Hono } from 'hono';
import { z } from 'zod';
import { describeRoute, resolver, validator } from 'hono-openapi';
import { APIError } from 'better-auth/api';
import { AppError } from '@/middleware/errorHandler';
import { auth } from '@/middleware/auth';
import type { AuthType } from '@/middleware/auth';

type ErrorStatusCode = 400 | 401 | 500;

export const authRoutes = new Hono<{ Variables: AuthType }>();

const createAuthError = (fallbackMessage: string, error: unknown) => {
  const isProduction = process.env.NODE_ENV === 'production';
  let message = fallbackMessage;

  if (!isProduction && error instanceof Error && error.message) {
    message = error.message;
  }

  return new AppError(message, 500, error);
};

const authStatusResponseSchema = z.object({
  authenticated: z.boolean(),
  user: z.unknown().nullable(),
  session: z.unknown().nullable(),
});

const authStatusQuerySchema = z.object({
  includeSession: z.enum(['true', 'false']).optional(),
});

const registerBodySchema = z.object({
  email: z.email().describe('User email address').meta({ example: 'user@example.com' }), // without meta, generates random string (zod-to-openapi does not generate examples for z.string().email() (v3 or v4). It only maps the format.)
  password: z.string().min(8).describe('User password (minimum 8 characters)'),
  name: z.string().min(1).max(200).optional().describe('User display name'),
});

const loginBodySchema = z.object({
  email: z.email().describe('User email address').meta({ example: 'user@example.com' }),
  password: z.string().min(8).describe('User password'),
});

const messageResponseSchema = z.object({
  message: z.string(),
  user: z.unknown().optional(),
  session: z.unknown().optional(),
});

authRoutes.get(
  '/status',
  describeRoute({
    tags: ['Auth'],
    description: 'Check authentication status from the session cookie',
    parameters: [
      {
        name: 'includeSession',
        in: 'query',
        required: false,
        schema: { type: 'string', enum: ['true', 'false'] },
        description: 'Whether to include session details in the response',
        example: 'true',
      },
    ],
    responses: {
      200: {
        description: 'Authentication status',
        content: {
          'application/json': {
            schema: resolver(authStatusResponseSchema),
            example: {
              authenticated: true,
              user: { id: 'user_123', email: 'user@example.com' },
              session: { id: 'session_123', expiresAt: '2026-01-01T00:00:00.000Z' },
            },
          },
        },
      },
    },
  }),
  validator('query', authStatusQuerySchema),
  async (c) => {
  const query = c.req.valid('query');
  const includeSession = query.includeSession !== 'false';
  const user = c.get('user');
  const session = c.get('session');
  return c.json({
    authenticated: !!user,
    user,
    session: includeSession ? session : null,
  });
  }
);

authRoutes.post(
  '/register',
  describeRoute({
    tags: ['Auth'],
    description: 'Register a new user account',
    requestBody: {
      required: true,
      content: {
        'application/json': {
          
          example: {
            email: 'user@example.com',
            password: '********',
            name: 'John Doe',
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Registration result',
        content: {
          'application/json': {
            schema: resolver(messageResponseSchema),
            example: { message: 'Registration successful' },
          },
        },
      },
      400: { description: 'Invalid payload or content type' },
    },
  }),
  validator('json', registerBodySchema),
  async (c) => {
  if (!c.req.raw.headers.get('Content-Type')?.includes('application/json')) {
    return c.json({ error: 'Content-Type must be application/json' }, 400);
  }
  const user = c.get('user');
  if (user) {
    return c.json({ message: 'Already logged in', user, session: c.get('session') });
  }

  const body = c.req.valid('json');

  try {
    const result = await auth.api.signUpEmail({
      body: {
        email: body.email,
        password: body.password,
        name: body.name ?? body.email.split('@')[0] ?? 'User',
      },
    });

    return c.json({
      message: 'Registration successful',
      user: result.user,
    });
  } catch (error) {
    if (error instanceof APIError) {
      throw new AppError(error.message, error.status as ErrorStatusCode);
    }
    throw createAuthError('Registration failed', error);
  }
  }
);

authRoutes.post(
  '/login',
  describeRoute({
    tags: ['Auth'],
    description: 'Log in with credentials and receive a session cookie',
    requestBody: {
      required: true,
      content: {
        'application/json': {
          
          example: {
            email: 'user@example.com',
            password: '********',
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Login result',
        content: {
          'application/json': {
            schema: resolver(messageResponseSchema),
            example: { message: 'Login successful' },
          },
        },
        headers: {
          'Set-Cookie': {
            description: 'Session cookie set by Better-Auth',
            schema: { type: 'string' },
          },
        },
      },
      400: { description: 'Invalid content type' },
      401: { description: 'Invalid credentials' },
    },
  }),
  validator('json', loginBodySchema),
  async (c) => {
  if (!c.req.raw.headers.get('Content-Type')?.includes('application/json')) {
    return c.json({ error: 'Content-Type must be application/json' }, 400);
  }

  const user = c.get('user');
  const session = c.get('session');

  if (user) {
    return c.json({ message: 'Already logged in', user, session });
  }

  const body = c.req.valid('json');

  try {
    const result = await auth.api.signInEmail({
      body: {
        email: body.email,
        password: body.password,
      },
    });

    return c.json({
      message: 'Login successful',
      user: result.user,
    });
  } catch (error) {
    if (error instanceof APIError) {
      throw new AppError(error.message, error.status as ErrorStatusCode);
    }
    throw createAuthError('Login failed', error);
  }
  }
);

authRoutes.post(
  '/logout',
  describeRoute({
    tags: ['Auth'],
    description: 'Log out and revoke the session cookie',
    parameters: [
      {
        name: 'better-auth.session',
        in: 'cookie',
        required: true,
        schema: { type: 'string' },
        description: 'Better-Auth session cookie',
      },
    ],
    responses: {
      200: {
        description: 'Logout result',
        content: {
          'application/json': {
            schema: resolver(messageResponseSchema),
            example: { message: 'Logout successful' },
          },
        },
      },
      401: { description: 'Unauthorized' },
    },
  }),
  async (c) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    await auth.api.signOut({
      headers: c.req.raw.headers,
    });

    return c.json({ message: 'Logout successful' });
  } catch (error) {
    if (error instanceof APIError) {
      throw new AppError(error.message, error.status as ErrorStatusCode);
    }
    throw createAuthError('Logout failed', error);
  }
  }
);