import { z } from 'zod';
import { type Prisma, type Collection, type CollectionMedia, type CollectionUser, Visibility, CollectionRole } from '@/generated/prisma/client';

// Collection CRUD schemas
export const createCollectionSchema = z.object({
  name: z.string().min(1).max(200).meta({ example: 'My Favorites' }),
  description: z.string().max(1000).optional().meta({ example: 'A collection of my favorite movies' }),
  tags: z.array(z.string().max(50)).optional().meta({ example: ['favorites', 'movies'] }),
  visibility: z.enum(Visibility).optional().default(Visibility.PRIVATE).meta({ example: Visibility.PUBLIC }),
}) satisfies z.Schema<Omit<Prisma.CollectionCreateInput, 'owner' | 'ownerId'>>;

export const collectionResponseSchema = z.object({
  id: z.uuid(),
  name: z.string().meta({ example: 'My Favorites' }),
  description: z.string().nullable().meta({ example: 'A collection of my favorite movies' }),
  tags: z.array(z.string()).meta({ example: ['favorites', 'movies'] }),
  visibility: z.enum(Visibility).meta({ example: Visibility.PUBLIC }),
  createdAt: z.string().datetime({ message: 'Invalid datetime string' }).meta({ example: '2026-01-01T00:00:00.000Z' }).transform((str: string) => new Date(str)),
  updatedAt: z.string().datetime({ message: 'Invalid datetime string' }).meta({ example: '2026-01-01T00:00:00.000Z' }).transform((str: string) => new Date(str)),
  ownerId: z.string(),
  media: z.array(z.any()).optional(),
  members: z.array(z.any()).optional(),
  owner: z.any().optional(),
  _count: z.object({
    media: z.number().optional(),
    members: z.number().optional(),
  }).optional(),
}) satisfies z.Schema<Collection>;

export const updateCollectionSchema = z.object({
  name: z.string().min(1).max(200).optional().meta({ example: 'My Favorites' }),
  description: z.string().max(1000).optional().meta({ example: 'Updated description' }),
  tags: z.array(z.string().max(50)).optional().meta({ example: ['favorites', 'movies'] }),
  visibility: z.enum(Visibility).optional().meta({ example: Visibility.PUBLIC }),
}) satisfies z.Schema<Prisma.CollectionUpdateInput>;

export const collectionIdParamSchema = z.object({
  collectionId: z.string().min(1),
});

export const getCollectionQuerySchema = z.object({
  page: z.coerce.number().min(1).optional().default(1).meta({ example: 1 }),
  pageSize: z.coerce.number().min(1).max(100).optional().default(20).meta({ example: 20 }),
  tag: z.string().optional().meta({ example: 'favorites' }),
  tags: z.string().optional().meta({ example: 'favorites,movies' }),
  q: z.string().optional().meta({ example: 'my favorites' }),
  sort: z.union([z.literal('createdAt'), z.literal('name'), z.literal('updatedAt')]).optional().default('createdAt').meta({ example: 'createdAt' }),
  order: z.enum(['asc', 'desc']).optional().default('desc').meta({ example: 'desc' }),
  cursor: z.string().optional(),
});

export const collectionListResponseSchema = z.object({
  data: z.array(collectionResponseSchema),
  page: z.number().meta({ example: 1 }),
  pageSize: z.number().meta({ example: 20 }),
  total: z.number().meta({ example: 10 }),
  pages: z.number().meta({ example: 1 }),
  links: z.object({
    self: z.string().meta({ example: '/api/collections?page=1&pageSize=20' }),
    next: z.string().nullable().meta({ example: '/api/collections?page=2&pageSize=20' }),
    prev: z.string().nullable().meta({ example: null }),
  }),
  cursor: z.string().nullable().optional().meta({ example: 'uuid-of-last-item' }),
});

// Collection Media schemas
export const addMediaToCollectionSchema = z.object({
  mediaId: z.uuid().meta({ example: 'media_123' }),
  position: z.number().optional().default(0).meta({ example: 3 }),
});

export const collectionMediaIdParamSchema = z.object({
  collectionId: z.string().min(1),
  collectionMediaId: z.string().min(1),
});

export const collectionMediaResponseSchema = z.object({
  id: z.uuid(),
  position: z.number(),
  addedAt: z.string().datetime({ message: 'Invalid datetime string' }).meta({ example: '2026-01-01T00:00:00.000Z' }).transform((str: string) => new Date(str)),
  collectionId: z.string(),
  mediaId: z.string(),
  media: z.any().optional(),
}) satisfies z.Schema<CollectionMedia>;

export const updateCollectionMediaSchema = z.object({
  position: z.number().optional().meta({ example: 5 }),
});

// Collection Members schemas
export const addMemberToCollectionSchema = z.object({
  userId: z.uuid().meta({ example: 'user_123' }),
  role: z.enum(CollectionRole).optional().default(CollectionRole.READER).meta({ example: CollectionRole.COLLABORATOR }),
});

export const collectionMemberIdParamSchema = z.object({
  collectionId: z.string().min(1),
  memberId: z.string().min(1),
});

export const collectionMemberResponseSchema = z.object({
  id: z.uuid(),
  role: z.enum(CollectionRole).meta({ example: CollectionRole.READER }),
  invitedAt: z.string().datetime({ message: 'Invalid datetime string' }).meta({ example: '2026-01-01T00:00:00.000Z' }).transform((str: string) => new Date(str)),
  accepted: z.boolean(),
  collectionId: z.string(),
  userId: z.string(),
  user: z.any().optional(),
}) satisfies z.Schema<CollectionUser>;

export const updateCollectionMemberSchema = z.object({
  role: z.enum(CollectionRole).optional().meta({ example: CollectionRole.COLLABORATOR }),
  accepted: z.boolean().optional().meta({ example: true }),
});

// Invitation schemas
export const respondToInvitationSchema = z.object({
  accept: z.boolean().meta({ example: true }),
});

export const invitationResponseSchema = z.object({
  id: z.uuid(),
  role: z.enum(CollectionRole).meta({ example: CollectionRole.READER }),
  invitedAt: z.string().datetime({ message: 'Invalid datetime string' }).meta({ example: '2026-01-01T00:00:00.000Z' }).transform((str: string) => new Date(str)),
  accepted: z.boolean(),
  collectionId: z.string(),
  userId: z.string(),
  collection: z.any().optional(),
  user: z.any().optional(),
});
