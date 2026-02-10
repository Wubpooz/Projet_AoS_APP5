import { Hono } from 'hono';
import { describeRoute, resolver, validator } from 'hono-openapi';
import type { AuthType } from '@/middleware/auth';
import { userService } from '@/services/user.service';
import { AppError } from '@/middleware/errorHandler';
import { collectionsResponseSchema, updateUserSchema, userIdParamSchema, userResponseSchema,  } from '@/schemas/user.schema';

export const userRoutes = new Hono<{ Variables: AuthType }>();

// GET /me - Get authenticated user profile with profile details, counts, and settings
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


// PATCH /me - Update authenticated user profile (name, username, image)
userRoutes.patch(
  '/me',
  describeRoute({
    tags: ['Users'],
    description: 'Update authenticated user profile (name, username, image)',
    security: [{ bearerAuth: [] }],
    requestBody: {
      required: true,
      content: {
        'application/json': { },
      },
    },
    responses: {
      200: {
        description: 'Updated user profile',
        content: {
          'application/json': {
            schema: resolver(userResponseSchema),
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


// GET /:userId - Get a public user profile by user ID
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


// GET /:userId/collections - List public collections by user
userRoutes.get(
  '/:userId/collections',
  describeRoute({
    tags: ['Users'],
    description: 'List public collections by user',
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
        description: 'List of public collections by user',
        content: {
          'application/json': {
            schema: resolver(collectionsResponseSchema),
          },
        },
      },
      404: { description: 'User not found' },
    },
  }),
  validator('param', userIdParamSchema),
  async (c) => {
    const userId = c.req.param('userId');
    const collections = await userService.getPublicCollections(userId).catch(() => {
      throw new AppError('Failed to fetch collections', 500);
    });
    if (!collections) {
      return c.json({ error: 'User not found' }, 404);
    }
    return c.json({ collections }, 200);
  }
)