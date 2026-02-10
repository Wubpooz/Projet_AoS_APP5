import { z } from 'zod';
import { type Prisma, type Media, MediaType } from '@/generated/prisma/client';

export const createMediaSchema = z.object({
  title: z.string().min(1).max(300).meta( {example: 'Inception'} ),
  description: z.string().max(1000).optional().meta( {example: 'A thief who steals corporate secrets through dream-sharing technology'} ),
  url: z.url().optional().meta( {example: 'https://example.com/inception'} ),
  tags: z.array(z.string().min(0).max(50)).optional().meta( {example: ['sci-fi', 'thriller']} ),
  platforms: z.array(z.string().min(0).max(50)).optional().meta( {example: ['Netflix', 'Amazon Prime']} ),
  type: z.enum(MediaType).meta( {example: MediaType.FILM} ),
  releaseDate: z.string().datetime().optional().meta( {example: '2010-07-16T00:00:00.000Z'} ).transform(str => str ? new Date(str) : undefined),
  directorAuthor: z.string().max(200).optional().meta( {example: 'Christopher Nolan'} ),
}) satisfies z.Schema<Prisma.MediaCreateInput>;

export const createMediaResponseSchema = z.object({
  id: z.uuid(),
  title: z.string().meta( {example: 'Inception'} ),
  description: z.string().nullable().meta( {example: 'A thief who steals corporate secrets through dream-sharing technology'} ),
  type: z.enum(MediaType).meta( {example: MediaType.FILM} ),
  releaseDate: z.string().datetime().nullable().meta( {example: '2010-07-16T00:00:00.000Z'} ).transform(str => str ? new Date(str) : null),
  directorAuthor: z.string().nullable().meta( {example: 'Christopher Nolan'} ),
  tags: z.array(z.string()).meta( {example: ['sci-fi', 'thriller']} ),
  platforms: z.array(z.string()).meta( {example: ['Netflix', 'Amazon Prime']} ),
  url: z.string().nullable().meta( {example: 'https://example.com/inception'} ),
  scores: z.any().nullable(),
  createdAt: z.string().datetime().meta( {example: '2026-01-01T00:00:00.000Z'} ).transform(str => new Date(str)), //TODO switch to v4's z.date() when the Date cannot be represented in JSON Schema issue is resolved
  updatedAt: z.string().datetime().meta( {example: '2026-01-01T00:00:00.000Z'} ).transform(str => new Date(str)),
  collections: z.array(z.any()),
}) satisfies z.Schema<Media>;

export const updateMediaSchema = z.object({
  title: z.string().min(1).max(300).optional().meta( {example: 'Inception'} ),
  description: z.string().max(1000).optional().meta( {example: 'Updated description'} ),
  url: z.url().optional().meta( {example: 'https://example.com/inception'} ),
  tags: z.array(z.string().min(0).max(50)).optional().meta( {example: ['sci-fi', 'thriller']} ),
  platforms: z.array(z.string().min(0).max(50)).optional().meta( {example: ['Netflix', 'Amazon Prime']} ),
  type: z.enum(MediaType).optional().meta( {example: MediaType.FILM} ),
  releaseDate: z.string().datetime().optional().meta( {example: '2010-07-16T00:00:00.000Z'} ).transform(str => str ? new Date(str) : undefined),
  directorAuthor: z.string().max(200).optional().meta( {example: 'Christopher Nolan'} ),
}) satisfies z.Schema<Prisma.MediaUpdateInput>;

export const mediaIdParamSchema = z.object({
  mediaId: z.string().min(1),
});

export const getMediaQuerySchema = z.object({
  page: z.coerce.number().min(1).optional().default(1).meta( {example: 1} ),
  pageSize: z.coerce.number().min(1).max(100).optional().default(20).meta( {example: 20} ),
  type: z.enum(MediaType).optional().meta( {example: MediaType.FILM} ),
  tag: z.string().optional().meta( {example: 'sci-fi'} ),
  tags: z.string().optional().meta( {example: 'sci-fi,thriller'} ),
  platform: z.string().optional().meta( {example: 'Netflix'} ),
  platforms: z.string().optional().meta( {example: 'Netflix,Amazon Prime'} ),
  q: z.string().optional().meta( {example: 'inception'} ),
  sort: z.enum(['createdAt', 'title', 'releaseDate']).optional().default('createdAt').meta( {example: 'createdAt'} ),
  order: z.enum(['asc', 'desc']).optional().default('desc').meta( {example: 'desc'} ),
  cursor: z.string().optional(),
});

export const mediaListResponseSchema = z.object({
  data: z.array(createMediaResponseSchema),
  page: z.number().meta( {example: 1} ),
  pageSize: z.number().meta( {example: 20} ),
  total: z.number().meta( {example: 124} ),
  pages: z.number().meta( {example: 13} ),
  links: z.object({
    self: z.string().meta( {example: '/api/media?page=1&pageSize=20'} ),
    next: z.string().nullable().meta( {example: '/api/media?page=2&pageSize=20'} ),
    prev: z.string().nullable().meta( {example: null} ),
  }),
  cursor: z.string().nullable().optional().meta( {example: 'uuid-of-last-item'} ),
});

