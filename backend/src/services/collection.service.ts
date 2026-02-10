import prisma from "@/db";
import { CollectionRole, Visibility } from "@/generated/prisma/browser";
import type { Prisma, Collection, CollectionMedia, CollectionUser } from "@/generated/prisma/browser";
import { AppError } from "@/middleware/errorHandler";
import type { ListQuery, PaginatedData, PaginationLinks } from "@/types/types";

type CollectionWhereClause = Omit<ListQuery, 'page' | 'pageSize' | 'sort' | 'order' | 'cursor'>;

export const collectionService = {
  /**
   * Create a new collection
   */
  async createCollection(
    data: Prisma.CollectionCreateInput,
    userId: string
  ): Promise<Collection> {
    try {
      const collection = await prisma.collection.create({
        data: {
          ...data,
          ownerId: userId,
        },
      });
      return collection;
    } catch (error) {
      console.error('Error creating collection:', error);
      throw new AppError('Failed to create collection', 500);
    }
  },

  /**
   * List collections with pagination and filters
   */
  async listCollections(query: ListQuery, userId?: string): Promise<PaginatedData<Collection>> {
    const pageSize = query.pageSize || 20;
    const sort = query.sort || 'createdAt';
    const order = query.order || 'desc';
    const filterWhere = this.buildWhereClause(query);
    const accessWhere = this.buildAccessWhere(userId);
    const where = Object.keys(filterWhere).length > 0
      ? { AND: [filterWhere, accessWhere] }
      : accessWhere;

    // Use cursor-based pagination if cursor is provided
    if (query.cursor) {
      const data = await prisma.collection.findMany({
        where,
        take: pageSize + 1,
        cursor: { id: query.cursor },
        skip: 1,
        orderBy: { [sort]: order },
        include: {
          _count: {
            select: { media: true },
          },
        },
      });

      const hasMore = data.length > pageSize;
      const items = hasMore ? data.slice(0, pageSize) : data;
      const lastItem = items.at(-1);
      const nextCursor = hasMore && lastItem ? lastItem.id : null;

      const links = this.buildCursorPaginationLinks(query, pageSize, nextCursor);

      return {
        data: items,
        page: 1,
        pageSize,
        total: 0,
        pages: 0,
        links,
        cursor: nextCursor,
      };
    }

    // Fall back to offset-based pagination
    const page = query.page || 1;
    const skip = (page - 1) * pageSize;

    const [data, total] = await Promise.all([
      prisma.collection.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { [sort]: order },
        include: {
          _count: {
            select: { media: true },
          },
        },
      }),
      prisma.collection.count({ where }),
    ]);

    const pages = Math.ceil(total / pageSize);
    const lastItem = data.at(-1);
    const nextCursor = lastItem ? lastItem.id : null;
    const links = this.buildPaginationLinks(query, page, pageSize, pages);

    return {
      data,
      page,
      pageSize,
      total,
      pages,
      links,
      cursor: nextCursor,
    };
  },

  /**
   * Build where clause for collection filters
   */
  buildWhereClause(query: CollectionWhereClause): Prisma.CollectionWhereInput {
    const where: Prisma.CollectionWhereInput = {};

    const tagList = this.parseCommaSeparated(query.tags, query.tag);
    if (tagList.length > 0) {
      where.tags = { hasSome: tagList };
    }

    if (query.q) {
      where.OR = [
        { name: { contains: query.q, mode: 'insensitive' } },
        { description: { contains: query.q, mode: 'insensitive' } },
      ];
    }

    return where;
  },

  /**
   * Build access control where clause for collection visibility
   */
  buildAccessWhere(userId?: string): Prisma.CollectionWhereInput {
    const publicAccess: Prisma.CollectionWhereInput = {
      visibility: Visibility.PUBLIC,
    };

    if (!userId) {
      return publicAccess;
    }

    const memberAccess: Prisma.CollectionWhereInput = {
      OR: [
        { ownerId: userId },
        { members: { some: { userId } } },
      ],
    };

    return { OR: [publicAccess, memberAccess] };
  },

  /**
   * Parse comma-separated strings into an array
   */
  parseCommaSeparated(commaSeparated?: string, single?: string): string[] {
    if (commaSeparated) {
      return commaSeparated.split(',');
    }
    if (single) {
      return [single];
    }
    return [];
  },

  /**
   * Build pagination links for API responses
   */
  buildPaginationLinks(query: ListQuery, page: number, pageSize: number, pages: number): PaginationLinks {
    const baseUrl = '/api/collections';
    const queryParams = new URLSearchParams();
    
    if (query.tag) queryParams.set('tag', query.tag);
    if (query.tags) queryParams.set('tags', query.tags);
    if (query.q) queryParams.set('q', query.q);
    if (query.sort) queryParams.set('sort', query.sort);
    if (query.order) queryParams.set('order', query.order);

    const buildLink = (p: number) => {
      const params = new URLSearchParams(queryParams);
      params.set('page', p.toString());
      params.set('pageSize', pageSize.toString());
      return `${baseUrl}?${params.toString()}`;
    };

    return {
      self: buildLink(page),
      next: page < pages ? buildLink(page + 1) : null,
      prev: page > 1 ? buildLink(page - 1) : null,
    };
  },

  /**
   * Build cursor-based pagination links
   */
  buildCursorPaginationLinks(query: ListQuery, pageSize: number, nextCursor: string | null): PaginationLinks {
    const baseUrl = '/api/collections';
    const queryParams = new URLSearchParams();
    
    if (query.tag) queryParams.set('tag', query.tag);
    if (query.tags) queryParams.set('tags', query.tags);
    if (query.q) queryParams.set('q', query.q);
    if (query.sort) queryParams.set('sort', query.sort);
    if (query.order) queryParams.set('order', query.order);
    queryParams.set('pageSize', pageSize.toString());

    const buildSelfLink = () => {
      const params = new URLSearchParams(queryParams);
      if (query.cursor) params.set('cursor', query.cursor);
      return `${baseUrl}?${params.toString()}`;
    };

    const buildNextLink = () => {
      if (!nextCursor) return null;
      const params = new URLSearchParams(queryParams);
      params.set('cursor', nextCursor);
      return `${baseUrl}?${params.toString()}`;
    };

    return {
      self: buildSelfLink(),
      next: buildNextLink(),
      prev: null,
    };
  },

  /**
   * Get a collection by ID
   */
  async getById(id: string, userId?: string): Promise<Collection | null> {
    const accessWhere = this.buildAccessWhere(userId);
    return await prisma.collection.findFirst({
      where: {
        AND: [
          { id },
          accessWhere,
        ],
      },
      include: {
        _count: {
          select: { media: true, members: true },
        },
      },
    });
  },

  /**
   * Update a collection by ID
   */
  async updateById(id: string, data: Prisma.CollectionUpdateInput, userId: string): Promise<Collection | null> {
    try {
      await this.requireCollectionRole(id, userId, [CollectionRole.OWNER]);
      const collection = await prisma.collection.update({ where: { id }, data });
      return collection;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('Error updating collection:', error);
      return null;
    }
  },

  /**
   * Delete a collection by ID
   */
  async deleteById(id: string, userId: string): Promise<boolean> {
    try {
      await this.requireCollectionRole(id, userId, [CollectionRole.OWNER]);
      await prisma.collection.delete({ where: { id } });
      return true;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('Error deleting collection:', error);
      return false;
    }
  },

  /**
   * Add media to a collection
   */
  async addMediaToCollection(
    collectionId: string,
    mediaId: string,
    position: number,
    userId: string
  ): Promise<CollectionMedia> {
    try {
      await this.requireCollectionRole(collectionId, userId, [CollectionRole.OWNER, CollectionRole.COLLABORATOR]);

      // Check if media exists
      const media = await prisma.media.findUnique({ where: { id: mediaId } });
      if (!media) {
        throw new AppError('Media not found', 404);
      }

      // Check if media is already in collection
      const existing = await prisma.collectionMedia.findUnique({
        where: {
          collectionId_mediaId: {
            collectionId,
            mediaId,
          },
        },
      });

      if (existing) {
        throw new AppError('Media already in collection', 400);
      }

      const collectionMedia = await prisma.collectionMedia.create({
        data: {
          collectionId,
          mediaId,
          position,
        },
        include: {
          media: true,
        },
      });

      return collectionMedia;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('Error adding media to collection:', error);
      throw new AppError('Failed to add media to collection', 500);
    }
  },

  /**
   * List media in a collection
   */
  async listCollectionMedia(collectionId: string, userId?: string): Promise<CollectionMedia[]> {
    try {
      // Check access to collection
      const collection = await this.getById(collectionId, userId);
      if (!collection) {
        throw new AppError('Collection not found', 404);
      }

      return await prisma.collectionMedia.findMany({
        where: { collectionId },
        orderBy: { position: 'asc' },
        include: {
          media: true,
        },
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('Error listing collection media:', error);
      throw new AppError('Failed to list collection media', 500);
    }
  },

  /**
   * Update collection media
   */
  async updateCollectionMedia(
    collectionId: string,
    collectionMediaId: string,
    data: Prisma.CollectionMediaUpdateInput,
    userId: string
  ): Promise<CollectionMedia | null> {
    try {
      await this.requireCollectionRole(collectionId, userId, [CollectionRole.OWNER, CollectionRole.COLLABORATOR]);

      const collectionMedia = await prisma.collectionMedia.update({
        where: { id: collectionMediaId },
        data,
        include: {
          media: true,
        },
      });

      return collectionMedia;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('Error updating collection media:', error);
      return null;
    }
  },

  /**
   * Remove media from collection
   */
  async removeMediaFromCollection(
    collectionId: string,
    collectionMediaId: string,
    userId: string
  ): Promise<boolean> {
    try {
      await this.requireCollectionRole(collectionId, userId, [CollectionRole.OWNER, CollectionRole.COLLABORATOR]);

      await prisma.collectionMedia.delete({
        where: { id: collectionMediaId },
      });

      return true;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('Error removing media from collection:', error);
      return false;
    }
  },

  /**
   * Add member to collection
   */
  async addMemberToCollection(
    collectionId: string,
    memberUserId: string,
    role: CollectionRole,
    userId: string
  ): Promise<CollectionUser> {
    try {
      await this.requireCollectionRole(collectionId, userId, [CollectionRole.OWNER]);

      // Check if user exists
      const user = await prisma.user.findUnique({ where: { id: memberUserId } });
      if (!user) {
        throw new AppError('User not found', 404);
      }

      // Check if user is already a member
      const existing = await prisma.collectionUser.findUnique({
        where: {
          collectionId_userId: {
            collectionId,
            userId: memberUserId,
          },
        },
      });

      if (existing) {
        throw new AppError('User already a member', 400);
      }

      const collectionUser = await prisma.collectionUser.create({
        data: {
          collectionId,
          userId: memberUserId,
          role,
        },
        include: {
          user: true,
        },
      });

      return collectionUser;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('Error adding member to collection:', error);
      throw new AppError('Failed to add member to collection', 500);
    }
  },

  /**
   * List collection members
   */
  async listCollectionMembers(collectionId: string, userId?: string): Promise<CollectionUser[]> {
    try {
      // Check access to collection
      const collection = await this.getById(collectionId, userId);
      if (!collection) {
        throw new AppError('Collection not found', 404);
      }

      return await prisma.collectionUser.findMany({
        where: { collectionId },
        include: {
          user: true,
        },
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('Error listing collection members:', error);
      throw new AppError('Failed to list collection members', 500);
    }
  },

  /**
   * Update collection member
   */
  async updateCollectionMember(
    collectionId: string,
    memberId: string,
    data: Prisma.CollectionUserUpdateInput,
    userId: string
  ): Promise<CollectionUser | null> {
    try {
      await this.requireCollectionRole(collectionId, userId, [CollectionRole.OWNER]);

      const collectionUser = await prisma.collectionUser.update({
        where: { id: memberId },
        data,
        include: {
          user: true,
        },
      });

      return collectionUser;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('Error updating collection member:', error);
      return null;
    }
  },

  /**
   * Remove member from collection
   */
  async removeMemberFromCollection(
    collectionId: string,
    memberId: string,
    userId: string
  ): Promise<boolean> {
    try {
      await this.requireCollectionRole(collectionId, userId, [CollectionRole.OWNER]);

      await prisma.collectionUser.delete({
        where: { id: memberId },
      });

      return true;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('Error removing member from collection:', error);
      return false;
    }
  },

  /**
   * Require a minimum role to perform an action on a collection
   */
  async requireCollectionRole(
    collectionId: string,
    userId: string,
    allowedRoles: CollectionRole[]
  ): Promise<void> {
    const collection = await prisma.collection.findUnique({
      where: { id: collectionId },
      select: {
        id: true,
        ownerId: true,
        members: {
          where: { userId },
          select: { role: true },
        },
      },
    });

    if (!collection) {
      throw new AppError('Collection not found', 404);
    }

    const isOwner = collection.ownerId === userId;
    if (isOwner && allowedRoles.includes(CollectionRole.OWNER)) {
      return;
    }

    const roles = collection.members.map((member) => member.role);
    const hasRole = roles.some((role) => allowedRoles.includes(role));

    if (!hasRole) {
      throw new AppError('Forbidden', 403);
    }
  },
};
