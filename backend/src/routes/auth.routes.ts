import { Hono } from 'hono';
import { z } from 'zod';
import { describeRoute, resolver, validator } from 'hono-openapi';
import { APIError } from 'better-auth/api';
import { AppError } from '@/middleware/errorHandler';
import { auth } from '@/middleware/auth';
import type { AuthType } from '@/middleware/auth';
import { type ContentfulStatusCode } from 'hono/utils/http-status';

type ErrorStatusCode = ContentfulStatusCode;

export const authRoutes = new Hono<{ Variables: AuthType }>();

const createAuthError = (fallbackMessage: string, error: unknown) => {
  const isProduction = process.env.NODE_ENV === 'production';
  let message = fallbackMessage;

  if (!isProduction && error instanceof Error && error.message) {
    message = error.message;
  }

  return new AppError(message, 500, error);
};

const resolveApiErrorStatus = (error: APIError): ErrorStatusCode => {
  const rawStatus = (error as { statusCode?: number | string; status?: number | string }).statusCode
    ?? (error as { status?: number | string }).status;

  if (typeof rawStatus === 'number') {
    return rawStatus as ErrorStatusCode;
  }

  if (typeof rawStatus === 'string') {
    const statusMap: Record<string, ErrorStatusCode> = {
      BAD_REQUEST: 400,
      UNAUTHORIZED: 401,
      FORBIDDEN: 403,
      NOT_FOUND: 404,
      CONFLICT: 409,
      UNPROCESSABLE_ENTITY: 422,
      TOO_MANY_REQUESTS: 429,
      INTERNAL_SERVER_ERROR: 500,
    };

    return statusMap[rawStatus] ?? 500;
  }

  return 500;
};

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
  sessionToken: z.string().optional(),
});

const forgotPasswordBodySchema = z.object({
  email: z.email().describe('User email address').meta({ example: 'user@example.com' }),
});

const resetPasswordBodySchema = z.object({
  token: z.string().min(1).describe('Password reset token'),
  newPassword: z.string().min(8).describe('New password (minimum 8 characters)'),
});




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
    // auth.api.isUsernameAvailable({ query: { username: body.username } }) // optionally check username availability before registration
    const result = await auth.api.signUpEmail({
      body: {
        email: body.email,
        password: body.password,
        name: body.name ?? body.email.split('@')[0] ?? 'User',
        // callbackURL:
      },
    });

    return c.json({
      message: 'Registration successful',
      user: result.user,
    });
  } catch (error) {
    if (error instanceof APIError) {
      throw new AppError(error.message, resolveApiErrorStatus(error));
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
        rememberMe: true,
        // callbackURL:
      },
      headers: c.req.raw.headers,
    });

    const isDev = process.env.NODE_ENV !== 'production';
    if (result.token) {
      const cookieParts = [
        `better-auth.session_token=${result.token}`,
        'Path=/',
        'HttpOnly',
        `SameSite=${isDev ? 'Lax' : 'None'}`,
      ];

      if (!isDev) {
        cookieParts.push('Secure');
      }

      c.header('Set-Cookie', cookieParts.join('; '));
    }

    return c.json({
      message: 'Login successful',
      user: result.user,
      ...(isDev ? { sessionToken: result.token } : {}),
    });
  } catch (error) {
    if (error instanceof APIError) {
      throw new AppError(error.message, resolveApiErrorStatus(error));
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
        name: 'better-auth.session_token',
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
      throw new AppError(error.message, resolveApiErrorStatus(error));
    }
    throw createAuthError('Logout failed', error);
  }
  }
);


authRoutes.post(
  '/forgot-password',
  describeRoute({
    tags: ['Auth'],
    description: 'Initiate password reset process by sending a reset email',
    requestBody: {
      required: true,
      content: {
        'application/json': {
          example: {
            email: 'user@example.com',
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Password reset email sent',
        content: {
          'application/json': {
            schema: resolver(messageResponseSchema),
            example: { message: 'Password reset email sent' },
          },
        },
      },
      400: { description: 'Invalid payload or content type' },
    },
  }),
  validator('json', forgotPasswordBodySchema),
  async (c) => {
  if (!c.req.raw.headers.get('Content-Type')?.includes('application/json')) {
    return c.json({ error: 'Content-Type must be application/json' }, 400);
  }

  const body = c.req.valid('json');

  try {
    await auth.api.requestPasswordReset({
      body: {
        email: body.email,
        // redirectTo: "https://localhost:5174/reset-password",
      },
    });
    return c.json({ message: 'Password reset email sent' });
  } catch (error) {
    if (error instanceof APIError) {
      throw new AppError(error.message, resolveApiErrorStatus(error));
    }
    throw createAuthError('Password reset failed', error);
  }
  }
);


authRoutes.post(
  '/reset-password',
  describeRoute({
    tags: ['Auth'],
    description: 'Complete password reset process by providing new password and reset token',
    requestBody: {
      required: true,
      content: {
        'application/json': {
          example: {
            token: 'reset_token_here',
            newPassword: 'newpassword123',
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Password reset successful',
        content: {
          'application/json': {
            schema: resolver(messageResponseSchema),
            example: { message: 'Password reset successful' },
          },
        },
      },
      400: { description: 'Invalid payload or content type' },
    },
  }),
  validator('json', resetPasswordBodySchema),
  async (c) => {
    if (!c.req.raw.headers.get('Content-Type')?.includes('application/json')) {
      return c.json({ error: 'Content-Type must be application/json' }, 400);
    }

    const body = c.req.valid('json');

    try {
      await auth.api.resetPassword({
        body: {
          token: body.token,
          newPassword: body.newPassword,
        },
      });
      return c.json({ message: 'Password reset successful' });
    } catch (error) {
      if (error instanceof APIError) {
        throw new AppError(error.message, resolveApiErrorStatus(error));
      }
      throw createAuthError('Password reset failed', error);
    }
  }
);




authRoutes.get(
  '/me',
  describeRoute({
    tags: ['Auth'],
    description: 'Get the authenticated user profile and session info',
    parameters: [
      {
        name: 'better-auth.session_token',
        in: 'cookie',
        required: true,
        schema: { type: 'string' },
        description: 'Better-Auth session cookie',
      },
    ],
    responses: {
      200: {
        description: 'Authenticated user profile and session info',
        content: {
          'application/json': {
            schema: resolver(messageResponseSchema),
            example: {
              message: 'Authenticated user profile and session info',
              user: { id: 'user_123', email: 'user@example.com' },
              session: { id: 'session_123', expiresAt: '2026-01-01T00:00:00.000Z' },
            },
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
      const session = c.get('session');

      return c.json({
        message: 'Authenticated user profile and session info',
        user,
        session,
      });
    } catch (error) {
      if (error instanceof APIError) {
        throw new AppError(error.message, resolveApiErrorStatus(error));
      }
      throw createAuthError('Failed to get authenticated user profile and session info', error);
    }
  }
);
