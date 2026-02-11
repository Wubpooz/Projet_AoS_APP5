import { Hono } from 'hono';
import { describeRoute, resolver, validator } from 'hono-openapi';
import { collectionService } from '@/services/collection.service';
import type { AuthType } from '@/middleware/auth';
import { 
  createCollectionSchema, 
  collectionResponseSchema,
  updateCollectionSchema,
  collectionIdParamSchema,
  getCollectionQuerySchema,
  collectionListResponseSchema,
  addMediaToCollectionSchema,
  collectionMediaIdParamSchema,
  collectionMediaResponseSchema,
  updateCollectionMediaSchema,
  addMemberToCollectionSchema,
  collectionMemberIdParamSchema,
  collectionMemberResponseSchema,
  updateCollectionMemberSchema,
} from '@/schemas/collection.schema';
import { AppError } from '@/middleware/errorHandler';
import { CollectionRole } from '@/generated/prisma/client';

export const collectionRoutes = new Hono<{ Variables: AuthType }>();

// ==================== Collection CRUD Routes ====================

// POST / - Create a new collection
collectionRoutes.post(
  '/',
  describeRoute({
    tags: ['Collections'],
    description: 'Create a new collection',
    security: [{ bearerAuth: [] }],
    requestBody: {
      required: true,
      content: {
        'application/json': {},
      },
    },
    responses: {
      201: {
        description: 'Collection created successfully',
        content: {
          'application/json': {
            schema: resolver(collectionResponseSchema),
          },
        },
      },
      400: { description: 'Invalid payload' },
      401: { description: 'Unauthorized' },
    },
  }),
  validator('json', createCollectionSchema),
  async (c) => {
    const sessionUser = c.get('user');
    if (!sessionUser) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const collectionData = c.req.valid('json');
    const newCollection = await collectionService.createCollection(collectionData, sessionUser.id);
    return c.json(newCollection, 201);
  }
);

// GET / - List collections
collectionRoutes.get(
  '/',
  describeRoute({
    tags: ['Collections'],
    description: 'List collections (public or owned/member). Supports both offset-based and cursor-based pagination.',
    parameters: [
      { name: 'page', in: 'query', schema: { type: 'number' }, example: 1 },
      { name: 'pageSize', in: 'query', schema: { type: 'number' }, example: 20 },
      { name: 'tag', in: 'query', schema: { type: 'string' }, example: 'favorites' },
      { name: 'tags', in: 'query', schema: { type: 'string' }, example: 'favorites,movies' },
      { name: 'q', in: 'query', schema: { type: 'string' }, example: 'my collection' },
      { name: 'sort', in: 'query', schema: { type: 'string', enum: ['createdAt', 'name', 'updatedAt'] } },
      { name: 'order', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'] } },
      { name: 'cursor', in: 'query', schema: { type: 'string' } },
    ],
    responses: {
      200: {
        description: 'List of collections',
        content: {
          'application/json': {
            schema: resolver(collectionListResponseSchema),
          },
        },
      },
    },
  }),
  validator('query', getCollectionQuerySchema),
  async (c) => {
    const query = c.req.valid('query');
    const sessionUser = c.get('user');
    const result = await collectionService.listCollections(query, sessionUser?.id);
    return c.json(result, 200);
  }
);

// GET /:collectionId - Get collection details
collectionRoutes.get(
  '/:collectionId',
  describeRoute({
    tags: ['Collections'],
    description: 'Get collection details and media count',
    parameters: [
      { name: 'collectionId', in: 'path', required: true, schema: { type: 'string' }, example: 'col_123' },
    ],
    responses: {
      200: {
        description: 'Collection details',
        content: {
          'application/json': {
            schema: resolver(collectionResponseSchema),
          },
        },
      },
      404: { description: 'Collection not found' },
    },
  }),
  validator('param', collectionIdParamSchema),
  async (c) => {
    const { collectionId } = c.req.valid('param');
    const sessionUser = c.get('user');
    const collection = await collectionService.getById(collectionId, sessionUser?.id);
    
    if (!collection) {
      return c.json({ error: 'Collection not found' }, 404);
    }
    
    return c.json(collection, 200);
  }
);

// PATCH /:collectionId - Update collection
collectionRoutes.patch(
  '/:collectionId',
  describeRoute({
    tags: ['Collections'],
    description: 'Update collection name, description, tags, visibility (owner only)',
    security: [{ bearerAuth: [] }],
    parameters: [
      { name: 'collectionId', in: 'path', required: true, schema: { type: 'string' }, example: 'col_123' },
    ],
    requestBody: {
      required: true,
      content: {
        'application/json': {},
      },
    },
    responses: {
      200: {
        description: 'Updated collection',
        content: {
          'application/json': {
            schema: resolver(collectionResponseSchema),
          },
        },
      },
      400: { description: 'Invalid payload or no fields to update' },
      401: { description: 'Unauthorized' },
      403: { description: 'Forbidden' },
      404: { description: 'Collection not found' },
    },
  }),
  validator('param', collectionIdParamSchema),
  validator('json', updateCollectionSchema),
  async (c) => {
    const sessionUser = c.get('user');
    if (!sessionUser) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { collectionId } = c.req.valid('param');
    const data = c.req.valid('json');
    
    if (Object.keys(data).length === 0) {
      return c.json({ error: 'No fields to update' }, 400);
    }
    
    const collection = await collectionService
      .updateById(collectionId, data, sessionUser.id)
      .catch((err) => {
        if (err instanceof AppError) {
          throw err;
        }
        throw new AppError('Failed to update collection', 500);
      });
    
    if (!collection) {
      return c.json({ error: 'Collection not found' }, 404);
    }
    
    return c.json(collection, 200);
  }
);

// DELETE /:collectionId - Delete collection
collectionRoutes.delete(
  '/:collectionId',
  describeRoute({
    tags: ['Collections'],
    description: 'Delete collection (owner only)',
    security: [{ bearerAuth: [] }],
    parameters: [
      { name: 'collectionId', in: 'path', required: true, schema: { type: 'string' }, example: 'col_123' },
    ],
    responses: {
      200: {
        description: 'Collection deleted successfully',
        content: {
          'application/json': {
            schema: { type: 'object', properties: { message: { type: 'string' } } },
          },
        },
      },
      401: { description: 'Unauthorized' },
      403: { description: 'Forbidden' },
      404: { description: 'Collection not found' },
    },
  }),
  validator('param', collectionIdParamSchema),
  async (c) => {
    const sessionUser = c.get('user');
    if (!sessionUser) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { collectionId } = c.req.valid('param');

    const deleted = await collectionService.deleteById(collectionId, sessionUser.id).catch((err) => {
      if (err instanceof AppError) {
        throw err;
      }
      throw new AppError('Failed to delete collection', 500);
    });
    
    if (!deleted) {
      return c.json({ error: 'Collection not found' }, 404);
    }
    
    return c.json({ message: 'Collection deleted successfully' }, 200);
  }
);

// ==================== Collection Media Routes ====================

// POST /:collectionId/media - Add media to collection
collectionRoutes.post(
  '/:collectionId/media',
  describeRoute({
    tags: ['Collections'],
    description: 'Add media to collection (owner/collaborator)',
    security: [{ bearerAuth: [] }],
    parameters: [
      { name: 'collectionId', in: 'path', required: true, schema: { type: 'string' }, example: 'col_123' },
    ],
    requestBody: {
      required: true,
      content: {
        'application/json': {},
      },
    },
    responses: {
      201: {
        description: 'Media added to collection',
        content: {
          'application/json': {
            schema: resolver(collectionMediaResponseSchema),
          },
        },
      },
      400: { description: 'Invalid payload or media already in collection' },
      401: { description: 'Unauthorized' },
      403: { description: 'Forbidden' },
      404: { description: 'Collection or media not found' },
    },
  }),
  validator('param', collectionIdParamSchema),
  validator('json', addMediaToCollectionSchema),
  async (c) => {
    const sessionUser = c.get('user');
    if (!sessionUser) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { collectionId } = c.req.valid('param');
    const { mediaId, position } = c.req.valid('json');

    const collectionMedia = await collectionService.addMediaToCollection(
      collectionId,
      mediaId,
      position || 0,
      sessionUser.id
    );

    return c.json(collectionMedia, 201);
  }
);

// GET /:collectionId/media - List media in collection
collectionRoutes.get(
  '/:collectionId/media',
  describeRoute({
    tags: ['Collections'],
    description: 'List media in collection with optional pagination',
    parameters: [
      { name: 'collectionId', in: 'path', required: true, schema: { type: 'string' }, example: 'col_123' },
    ],
    responses: {
      200: {
        description: 'List of media in collection',
        content: {
          'application/json': {
            schema: {
              type: 'array',
              items: resolver(collectionMediaResponseSchema),
            },
          },
        },
      },
      404: { description: 'Collection not found' },
    },
  }),
  validator('param', collectionIdParamSchema),
  async (c) => {
    const { collectionId } = c.req.valid('param');
    const sessionUser = c.get('user');
    
    const media = await collectionService.listCollectionMedia(collectionId, sessionUser?.id);
    return c.json(media, 200);
  }
);

// PATCH /:collectionId/media/:collectionMediaId - Update collection media
collectionRoutes.patch(
  '/:collectionId/media/:collectionMediaId',
  describeRoute({
    tags: ['Collections'],
    description: 'Update collection media (e.g., position)',
    security: [{ bearerAuth: [] }],
    parameters: [
      { name: 'collectionId', in: 'path', required: true, schema: { type: 'string' }, example: 'col_123' },
      { name: 'collectionMediaId', in: 'path', required: true, schema: { type: 'string' }, example: 'cm_123' },
    ],
    requestBody: {
      required: true,
      content: {
        'application/json': {},
      },
    },
    responses: {
      200: {
        description: 'Updated collection media',
        content: {
          'application/json': {
            schema: resolver(collectionMediaResponseSchema),
          },
        },
      },
      400: { description: 'Invalid payload' },
      401: { description: 'Unauthorized' },
      403: { description: 'Forbidden' },
      404: { description: 'Collection media not found' },
    },
  }),
  validator('param', collectionMediaIdParamSchema),
  validator('json', updateCollectionMediaSchema),
  async (c) => {
    const sessionUser = c.get('user');
    if (!sessionUser) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { collectionId, collectionMediaId } = c.req.valid('param');
    const data = c.req.valid('json');

    const collectionMedia = await collectionService.updateCollectionMedia(
      collectionId,
      collectionMediaId,
      data,
      sessionUser.id
    ).catch((err) => {
      if (err instanceof AppError) {
        throw err;
      }
      throw new AppError('Failed to update collection media', 500);
    });

    if (!collectionMedia) {
      return c.json({ error: 'Collection media not found' }, 404);
    }

    return c.json(collectionMedia, 200);
  }
);

// DELETE /:collectionId/media/:collectionMediaId - Remove media from collection
collectionRoutes.delete(
  '/:collectionId/media/:collectionMediaId',
  describeRoute({
    tags: ['Collections'],
    description: 'Remove media from collection',
    security: [{ bearerAuth: [] }],
    parameters: [
      { name: 'collectionId', in: 'path', required: true, schema: { type: 'string' }, example: 'col_123' },
      { name: 'collectionMediaId', in: 'path', required: true, schema: { type: 'string' }, example: 'cm_123' },
    ],
    responses: {
      200: {
        description: 'Media removed from collection',
        content: {
          'application/json': {
            schema: { type: 'object', properties: { message: { type: 'string' } } },
          },
        },
      },
      401: { description: 'Unauthorized' },
      403: { description: 'Forbidden' },
      404: { description: 'Collection media not found' },
    },
  }),
  validator('param', collectionMediaIdParamSchema),
  async (c) => {
    const sessionUser = c.get('user');
    if (!sessionUser) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { collectionId, collectionMediaId } = c.req.valid('param');

    const deleted = await collectionService.removeMediaFromCollection(
      collectionId,
      collectionMediaId,
      sessionUser.id
    ).catch((err) => {
      if (err instanceof AppError) {
        throw err;
      }
      throw new AppError('Failed to remove media from collection', 500);
    });

    if (!deleted) {
      return c.json({ error: 'Collection media not found' }, 404);
    }

    return c.json({ message: 'Media removed from collection successfully' }, 200);
  }
);

// ==================== Collection Members Routes ====================

// POST /:collectionId/members - Add member to collection
collectionRoutes.post(
  '/:collectionId/members',
  describeRoute({
    tags: ['Collections'],
    description: 'Add member to collection (owner only)',
    security: [{ bearerAuth: [] }],
    parameters: [
      { name: 'collectionId', in: 'path', required: true, schema: { type: 'string' }, example: 'col_123' },
    ],
    requestBody: {
      required: true,
      content: {
        'application/json': {},
      },
    },
    responses: {
      201: {
        description: 'Member added to collection',
        content: {
          'application/json': {
            schema: resolver(collectionMemberResponseSchema),
          },
        },
      },
      400: { description: 'Invalid payload or user already a member' },
      401: { description: 'Unauthorized' },
      403: { description: 'Forbidden' },
      404: { description: 'Collection or user not found' },
    },
  }),
  validator('param', collectionIdParamSchema),
  validator('json', addMemberToCollectionSchema),
  async (c) => {
    const sessionUser = c.get('user');
    if (!sessionUser) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { collectionId } = c.req.valid('param');
    const { userId, role } = c.req.valid('json');

    const collectionMember = await collectionService.addMemberToCollection(
      collectionId,
      userId,
      role || CollectionRole.READER,
      sessionUser.id
    );

    return c.json(collectionMember, 201);
  }
);

// GET /:collectionId/members - List collection members
collectionRoutes.get(
  '/:collectionId/members',
  describeRoute({
    tags: ['Collections'],
    description: 'List collection members',
    parameters: [
      { name: 'collectionId', in: 'path', required: true, schema: { type: 'string' }, example: 'col_123' },
    ],
    responses: {
      200: {
        description: 'List of collection members',
        content: {
          'application/json': {
            schema: {
              type: 'array',
              items: resolver(collectionMemberResponseSchema),
            },
          },
        },
      },
      404: { description: 'Collection not found' },
    },
  }),
  validator('param', collectionIdParamSchema),
  async (c) => {
    const { collectionId } = c.req.valid('param');
    const sessionUser = c.get('user');
    
    const members = await collectionService.listCollectionMembers(collectionId, sessionUser?.id);
    return c.json(members, 200);
  }
);

// PATCH /:collectionId/members/:memberId - Update collection member
collectionRoutes.patch(
  '/:collectionId/members/:memberId',
  describeRoute({
    tags: ['Collections'],
    description: 'Update collection member role (owner only)',
    security: [{ bearerAuth: [] }],
    parameters: [
      { name: 'collectionId', in: 'path', required: true, schema: { type: 'string' }, example: 'col_123' },
      { name: 'memberId', in: 'path', required: true, schema: { type: 'string' }, example: 'member_123' },
    ],
    requestBody: {
      required: true,
      content: {
        'application/json': {},
      },
    },
    responses: {
      200: {
        description: 'Updated collection member',
        content: {
          'application/json': {
            schema: resolver(collectionMemberResponseSchema),
          },
        },
      },
      400: { description: 'Invalid payload' },
      401: { description: 'Unauthorized' },
      403: { description: 'Forbidden' },
      404: { description: 'Collection member not found' },
    },
  }),
  validator('param', collectionMemberIdParamSchema),
  validator('json', updateCollectionMemberSchema),
  async (c) => {
    const sessionUser = c.get('user');
    if (!sessionUser) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { collectionId, memberId } = c.req.valid('param');
    const data = c.req.valid('json');

    const collectionMember = await collectionService.updateCollectionMember(
      collectionId,
      memberId,
      data,
      sessionUser.id
    ).catch((err) => {
      if (err instanceof AppError) {
        throw err;
      }
      throw new AppError('Failed to update collection member', 500);
    });

    if (!collectionMember) {
      return c.json({ error: 'Collection member not found' }, 404);
    }

    return c.json(collectionMember, 200);
  }
);

// DELETE /:collectionId/members/:memberId - Remove member from collection
collectionRoutes.delete(
  '/:collectionId/members/:memberId',
  describeRoute({
    tags: ['Collections'],
    description: 'Remove member from collection (owner only)',
    security: [{ bearerAuth: [] }],
    parameters: [
      { name: 'collectionId', in: 'path', required: true, schema: { type: 'string' }, example: 'col_123' },
      { name: 'memberId', in: 'path', required: true, schema: { type: 'string' }, example: 'member_123' },
    ],
    responses: {
      200: {
        description: 'Member removed from collection',
        content: {
          'application/json': {
            schema: { type: 'object', properties: { message: { type: 'string' } } },
          },
        },
      },
      401: { description: 'Unauthorized' },
      403: { description: 'Forbidden' },
      404: { description: 'Collection member not found' },
    },
  }),
  validator('param', collectionMemberIdParamSchema),
  async (c) => {
    const sessionUser = c.get('user');
    if (!sessionUser) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { collectionId, memberId } = c.req.valid('param');

    const deleted = await collectionService.removeMemberFromCollection(
      collectionId,
      memberId,
      sessionUser.id
    ).catch((err) => {
      if (err instanceof AppError) {
        throw err;
      }
      throw new AppError('Failed to remove member from collection', 500);
    });

    if (!deleted) {
      return c.json({ error: 'Collection member not found' }, 404);
    }

    return c.json({ message: 'Member removed from collection successfully' }, 200);
  }
);
