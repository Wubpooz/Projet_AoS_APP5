import { Hono } from 'hono';
import { describeRoute, resolver, validator } from 'hono-openapi';
import { mediaService } from '@/services/media.service';
import { createMediaSchema, createMediaResponseSchema } from '@/schemas/media.schema';

export const mediaRoutes = new Hono();

// POST MEDIA
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
});


// GET MEDIA (with pagination, filtering, sorting, and navigation)

// GET, PATCH, DELETE MEDIA BY ID
