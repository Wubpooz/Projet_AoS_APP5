import { z } from 'zod';
import type { Prisma, Media } from '@/generated/prisma/client';

export const createMediaSchema = z.object({
  title: z.string().min(1).max(300).meta( {example: 'Inception'} ),
  description: z.string().max(1000).optional().meta( {example: 'A thief who steals corporate secrets through dream-sharing technology'} ),
  url: z.url().optional().meta( {example: 'https://example.com/inception'} ),
  tags: z.array(z.string().min(0).max(50)).optional().meta( {example: ['sci-fi', 'thriller']} ),
  platforms: z.array(z.string().min(0).max(50)).optional().meta( {example: ['Netflix', 'Amazon Prime']} ),
  type: z.enum(['FILM', 'SERIES', 'BOOK', 'ARTICLE', 'OTHER']).meta( {example: 'FILM'} ),
  releaseDate: z.date().optional().meta( {example: '2010-07-16T00:00:00.000Z'} ),
  directorAuthor: z.string().max(200).optional().meta( {example: 'Christopher Nolan'} ),
}) satisfies z.Schema<Prisma.MediaCreateInput>;

export const createMediaResponseSchema = z.object({
  id: z.uuid(),
  title: z.string().meta( {example: 'Inception'} ),
  description: z.string().nullable().meta( {example: 'A thief who steals corporate secrets through dream-sharing technology'} ),
  type: z.enum(['FILM', 'SERIES', 'BOOK', 'ARTICLE', 'OTHER']).meta( {example: 'FILM'} ),
  releaseDate: z.date().nullable().meta( {example: '2010-07-16T00:00:00.000Z'} ),
  directorAuthor: z.string().nullable().meta( {example: 'Christopher Nolan'} ),
  tags: z.array(z.string()).meta( {example: ['sci-fi', 'thriller']} ),
  platforms: z.array(z.string()).meta( {example: ['Netflix', 'Amazon Prime']} ),
  url: z.string().nullable().meta( {example: 'https://example.com/inception'} ),
  scores: z.any().nullable(),
  createdAt: z.date().meta( {example: '2026-01-01T00:00:00.000Z'} ),
  updatedAt: z.date().meta( {example: '2026-01-01T00:00:00.000Z'} ),
  collections: z.array(z.any()),
}) satisfies z.Schema<Media>;

