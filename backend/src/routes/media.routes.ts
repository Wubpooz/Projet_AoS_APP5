import { Hono } from 'hono';
import { z } from 'zod';
import { describeRoute, resolver, validator } from 'hono-openapi';
import { mediaService } from '@/services/media.service';

export const mediaRoutes = new Hono();


const createMediaSchema = z.object({
  title: z.string().min(1).max(300).meta( {example: 'Inception'} ),
  description: z.string().max(1000).optional().meta( {example: 'A thief who steals corporate secrets through dream-sharing technology'} ),
  url: z.url().optional().meta( {example: 'https://example.com/inception'} ),
  tags: z.array(z.string().min(0).max(50)).optional().meta( {example: ['sci-fi', 'thriller']} ),
  platforms: z.array(z.string().min(0).max(50)).optional().meta( {example: ['Netflix', 'Amazon Prime']} ),
  mediaType: z.enum(['MOVIE', 'BOOK', 'GAME', 'MUSIC', 'OTHER']).meta( {example: 'MOVIE'} ),
  releaseDate: z.date().optional().meta( {example: '2010-07-16'} ), // ISO date string
  directorAuthor: z.string().max(200).optional().meta( {example: 'Christopher Nolan'} ),
});

const createMediaResponseSchema = z.object({
  id: z.string(),
  title: z.string().meta( {example: 'Inception'} ),
  description: z.string().optional().meta( {example: 'A thief who steals corporate secrets through dream-sharing technology'} ),
  url: z.url().meta( {example: 'https://example.com/inception'} ),
  tags: z.array(z.string()).optional().meta( {example: ['sci-fi', 'thriller']} ),
  platforms: z.array(z.string()).optional().meta( {example: ['Netflix', 'Amazon Prime']} ),
  mediaType: z.enum(['MOVIE', 'BOOK', 'GAME', 'MUSIC', 'OTHER']).meta( {example: 'MOVIE'} ),
  releaseDate: z.date().optional().meta( {example: '2010-07-16'} ),
  directorAuthor: z.string().optional().meta( {example: 'Christopher Nolan'} ),
  createdAt: z.string().meta( {example: '2026-01-01T00:00:00.000Z'} ),
});

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
