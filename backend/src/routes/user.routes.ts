import { Hono } from 'hono';
import { z } from 'zod';
import { describeRoute, resolver, validator } from 'hono-openapi';
import type { AuthType } from '@/middleware/auth';
import { userService } from '@/services/user.service';
import { AppError } from '@/middleware/errorHandler';

export const userRoutes = new Hono<{ Variables: AuthType }>();

const updateUserSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  image: z
    .string()
    .min(1)
    .refine((value) => {
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    }, { message: 'Invalid URL' })
    .optional(),
  username: z.string().min(2).max(40).optional(),
  displayUsername: z.string().min(2).max(60).optional(),
});

const userIdParamSchema = z.object({
  userId: z.string().min(1),
});

const userResponseSchema = z.object({
  user: z.unknown(),
});

userRoutes.get(
  '/me',
  describeRoute({
    tags: ['Users'],
    description: 'Get authenticated user profile with profile details, counts, and settings',
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: 'User profile with details, counts, and settings',
        content: {
          'application/json': {
            schema: resolver(userResponseSchema),
            example: {
              user: {
                id: 'user_123',
                email: 'user@example.com',
                name: 'User Example',
                username: 'userexample',
                displayUsername: 'User Example',
                image: 'https://example.com/avatar.png',
                emailVerified: true,
                createdAt: '2026-01-01T00:00:00.000Z',
              },
            },
          },
        },
      },
      401: { description: 'Unauthorized' },
      404: { description: 'User not found' },
    },
  }),
  async (c) => {
  const sessionUser = c.get('user');
  if (!sessionUser) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const user = await userService.getById(sessionUser.id).catch(() => {
    throw new AppError('Failed to fetch user profile', 500);
  });
  if (!user) {
    return c.json({ error: 'User not found' }, 404);
  }

  return c.json({ user });
  }
);

userRoutes.patch(
  '/me',
  describeRoute({
    tags: ['Users'],
    description: 'Update authenticated user profile (name, username, image)',
    security: [{ bearerAuth: [] }],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          example: {
            name: 'Updated Name',
            image: 'https://example.com/avatar.png',
            username: 'newusername',
            displayUsername: 'New Username',
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Updated user profile',
        content: {
          'application/json': {
            schema: resolver(userResponseSchema),
            example: {
              user: {
                id: 'user_123',
                email: 'user@example.com',
                name: 'Updated Name',
                username: 'newusername',
                displayUsername: 'New Username',
                image: 'https://example.com/avatar.png',
              },
            },
          },
        },
      },
      400: { description: 'Invalid payload or no fields to update' },
      401: { description: 'Unauthorized' },
    },
  }),
  validator('json', updateUserSchema),
  async (c) => {
  const sessionUser = c.get('user');
  if (!sessionUser) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  if (!c.req.raw.headers.get('Content-Type')?.includes('application/json')) {
    return c.json({ error: 'Content-Type must be application/json' }, 400);
  }

  const body = await c.req.json().catch(() => null);
  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Invalid payload', details: parsed.error.issues }, 400);
  }

  const data = parsed.data;
  if (Object.keys(data).length === 0) {
    return c.json({ error: 'No fields to update' }, 400);
  }

  const user = await userService.updateById(sessionUser.id, data).catch(() => {
    throw new AppError('Failed to update user', 500);
  });
  return c.json({ user });
  }
);


userRoutes.get(
  '/:userId',
  describeRoute({
    tags: ['Users'],
    description: 'Get a public user profile by user ID',
    parameters: [
      {
        name: 'userId',
        in: 'path',
        required: true,
        schema: { type: 'string' },
        example: 'user_123',
      },
    ],
    responses: {
      200: {
        description: 'Public user profile',
        content: {
          'application/json': {
            schema: resolver(userResponseSchema),
            example: {
              user: {
                id: 'user_123',
                email: 'user@example.com',
                name: 'User Example',
                username: 'userexample',
                displayUsername: 'User Example',
              },
            },
          },
        },
      },
      404: { description: 'User not found' },
    },
  }),
  validator('param', userIdParamSchema),
  async (c) => {
  const userId = c.req.param('userId');
  const user = await userService.getById(userId).catch(() => {
    throw new AppError('Failed to fetch user', 500);
  });

  if (!user) {
    return c.json({ error: 'User not found' }, 404);
  }

  return c.json({ user });
  }
);