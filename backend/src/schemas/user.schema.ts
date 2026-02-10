import { z } from 'zod';
import { type Prisma, type Collection, Visibility } from '@/generated/prisma/client';
import type { PublicUser } from '@/types/types';

export const updateUserSchema = z.object({
  name: z.string().min(1).max(200).optional().meta( {example: 'User Example'} ),
  image: z.url().optional().meta( {example: 'https://example.com/avatar.png'} ),
  username: z.string().min(2).max(40).optional().meta( {example: 'userexample'} ),
  displayUsername: z.string().min(2).max(60).optional().meta( {example: 'User Example'} ),
}) satisfies z.Schema<Prisma.UserUpdateInput>;

export const userIdParamSchema = z.object({
  userId: z.string().min(1),
});

export const userResponseSchema = z.object({
  user: z.object({
    id: z.uuid().meta( {example: 'user_123'} ),
    name: z.string().meta( {example: 'User Example'} ),
    email: z.email().meta( {example: 'user@example.com'} ),
    image: z.url().nullable().meta( {example: 'https://example.com/avatar.jpg'} ),
    createdAt: z.string().datetime().meta( {example: '2026-01-01T00:00:00.000Z'} ).transform(str => new Date(str)), //TODO switch to v4's z.date() when the Date cannot be represented in JSON Schema issue is resolved
    updatedAt: z.string().datetime().meta( {example: '2026-01-01T00:00:00.000Z'} ).transform(str => new Date(str)),
    username: z.string().nullable().meta( {example: 'userexample'} ),
    displayUsername: z.string().nullable().meta( {example: 'User Example'} ),
  }),
}) satisfies z.Schema<{ user: PublicUser }>;

export const collectionsResponseSchema = z.object({
  collections: z.array(z.object({
    id: z.uuid().meta( {example: 'col_123'} ),
    name: z.string().meta( {example: 'My Collection'} ),
    description: z.string().nullable().meta( {example: 'A collection of my favorite media'} ),
    tags: z.array(z.string()).meta( {example: ['tag1', 'tag2']} ),
    visibility: z.enum(Visibility).meta( {example: Visibility.PUBLIC} ),
    createdAt: z.string().datetime().meta( {example: '2026-01-01T00:00:00.000Z'} ).transform(str => new Date(str)), //TODO switch to v4's z.date() when the Date cannot be represented in JSON Schema issue is resolved
    updatedAt: z.string().datetime().meta( {example: '2026-01-01T00:00:00.000Z'} ).transform(str => new Date(str)),
    ownerId: z.uuid().meta( {example: 'user_123'} ),
    },
  )),
}) satisfies z.Schema<{ collections: Collection[] }>;