import { Hono } from 'hono';
import { describeRoute, resolver, validator } from 'hono-openapi';
import { mediaService } from '@/services/media.service';
import { 
  createMediaSchema, 
  createMediaResponseSchema,
  updateMediaSchema,
  mediaIdParamSchema,
  getMediaQuerySchema,
  mediaListResponseSchema
} from '@/schemas/media.schema';
import { AppError } from '@/middleware/errorHandler';

export const mediaRoutes = new Hono();

// POST / - Create a new media entry
mediaRoutes.post(
  '/',
  describeRoute({
    tags: ['Media'],
    description: 'Create a new media entry',
    requestBody: {
      required: true,
      content: {
        'application/json': {},
      },
    },
    responses: {
      201: {
        description: 'Media created successfully',
        content: {
          'application/json': {
            schema: resolver(createMediaResponseSchema),
          },
        },
      },
      400: { description: 'Invalid payload' },
    },
  }),
  validator('json', createMediaSchema),
  async (c) => {
    const mediaData = c.req.valid('json');
    const newMedia = await mediaService.createMedia(mediaData);
    return c.json(newMedia, 201);
  }
);


// GET / - Retrieve media entries with pagination, filtering, sorting, and navigation
mediaRoutes.get(
  '/',
  describeRoute({
    tags: ['Media'],
    description: 'Retrieve media entries with pagination, filtering, sorting, and navigation. Supports both offset-based (page/pageSize) and cursor-based (cursor) pagination.',
    parameters: [
      { name: 'page', in: 'query', schema: { type: 'number' }, example: 1, description: 'Page number for offset-based pagination' },
      { name: 'pageSize', in: 'query', schema: { type: 'number' }, example: 20, description: 'Number of items per page' },
      { name: 'type', in: 'query', schema: { type: 'string', enum: ['FILM', 'SERIES', 'BOOK', 'ARTICLE', 'OTHER'] } },
      { name: 'tag', in: 'query', schema: { type: 'string' }, example: 'sci-fi' },
      { name: 'tags', in: 'query', schema: { type: 'string' }, example: 'sci-fi,thriller' },
      { name: 'platform', in: 'query', schema: { type: 'string' }, example: 'Netflix' },
      { name: 'platforms', in: 'query', schema: { type: 'string' }, example: 'Netflix,Amazon Prime' },
      { name: 'q', in: 'query', schema: { type: 'string' }, example: 'inception', description: 'Search in title/description' },
      { name: 'sort', in: 'query', schema: { type: 'string', enum: ['createdAt', 'title', 'releaseDate'] } },
      { name: 'order', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'] } },
      { name: 'cursor', in: 'query', schema: { type: 'string' }, description: 'Cursor for cursor-based pagination (use instead of page)' },
    ],
    responses: {
      200: {
        description: 'List of media entries',
        content: {
          'application/json': {
            schema: resolver(mediaListResponseSchema),
          },
        },
      },
    },
  }),
  validator('query', getMediaQuerySchema),
  async (c) => {
    const query = c.req.valid('query');
    const result = await mediaService.listMedia(query);
    return c.json(result, 200);
  }
);


// GET /:mediaId - Retrieve a media entry by ID
mediaRoutes.get(
  '/:mediaId',
  describeRoute({
    tags: ['Media'],
    description: 'Get media details by ID',
    parameters: [
      { name: 'mediaId', in: 'path', required: true, schema: { type: 'string' }, example: 'media_123' },
    ],
    responses: {
      200: {
        description: 'Media details',
        content: {
          'application/json': {
            schema: resolver(createMediaResponseSchema),
          },
        },
      },
      404: { description: 'Media not found' },
    },
  }),
  validator('param', mediaIdParamSchema),
  async (c) => {
    const { mediaId } = c.req.valid('param');
    const media = await mediaService.getById(mediaId);
    
    if (!media) {
      return c.json({ error: 'Media not found' }, 404);
    }
    
    return c.json(media, 200);
  }
);


// PATCH /:mediaId - Update a media entry by ID
mediaRoutes.patch(
  '/:mediaId',
  describeRoute({
    tags: ['Media'],
    description: 'Update media fields',
    parameters: [
      { name: 'mediaId', in: 'path', required: true, schema: { type: 'string' }, example: 'media_123' },
    ],
    requestBody: {
      required: true,
      content: {
        'application/json': {},
      },
    },
    responses: {
      200: {
        description: 'Updated media',
        content: {
          'application/json': {
            schema: resolver(createMediaResponseSchema),
          },
        },
      },
      400: { description: 'Invalid payload or no fields to update' },
      404: { description: 'Media not found' },
    },
  }),
  validator('param', mediaIdParamSchema),
  validator('json', updateMediaSchema),
  async (c) => {
    const { mediaId } = c.req.valid('param');
    const data = c.req.valid('json');
    
    if (Object.keys(data).length === 0) {
      return c.json({ error: 'No fields to update' }, 400);
    }
    
    const media = await mediaService.updateById(mediaId, data).catch(() => {
      throw new AppError('Failed to update media', 500);
    });
    
    if (!media) {
      return c.json({ error: 'Media not found' }, 404);
    }
    
    return c.json(media, 200);
  }
);


// DELETE /:mediaId - Delete a media entry by ID
mediaRoutes.delete(
  '/:mediaId',
  describeRoute({
    tags: ['Media'],
    description: 'Delete media entry (admin/owner)',
    parameters: [
      { name: 'mediaId', in: 'path', required: true, schema: { type: 'string' }, example: 'media_123' },
    ],
    responses: {
      200: {
        description: 'Media deleted successfully',
        content: {
          'application/json': {
            schema: { type: 'object', properties: { message: { type: 'string' } } },
          },
        },
      },
      404: { description: 'Media not found' },
    },
  }),
  validator('param', mediaIdParamSchema),
  async (c) => {
    const { mediaId } = c.req.valid('param');
    
    const deleted = await mediaService.deleteById(mediaId).catch(() => {
      throw new AppError('Failed to delete media', 500);
    });
    
    if (!deleted) {
      return c.json({ error: 'Media not found' }, 404);
    }
    
    return c.json({ message: 'Media deleted successfully' }, 200);
  }
);


