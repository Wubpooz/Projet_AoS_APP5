import prisma from "@/db";
import { CollectionRole, Visibility } from "@/generated/prisma/browser";
import type { Prisma, Media } from "@/generated/prisma/browser";
import { AppError } from "@/middleware/errorHandler";
import type { ListQuery, MediaWhereClause, PaginatedData } from "@/types/types";
import { queryUtils } from "@/services/query.utils";

export const mediaService = {
  /**
   * Create a new media entry in the database
   * @param {Prisma.MediaCreateInput} data Data for the new media entry
   * @param {string} userId ID of the authenticated user creating the media
   * @param {string} [collectionId] Optional collection ID to add the media to
   * @returns {Promise<Media>} The created media object
   * @throws AppError if media creation fails
   */
  async createMedia( data: Prisma.MediaCreateInput, userId: string, collectionId?: string): Promise<Media> {
    try {
      const collection = await this.getCollectionForCreate(userId, collectionId);
      const newMedia = await prisma.$transaction(async (tx) => {
        const media = await tx.media.create({ data });
        await tx.collectionMedia.create({
          data: {
            collectionId: collection.id,
            mediaId: media.id,
          },
        });
        return media;
      });
      return newMedia;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('Error creating media:', error);
      throw new AppError('Failed to create media', 500);
    }
  },

  /**
   * List media entries with pagination and filters
   * @param {ListQuery} query Query parameters for filtering and pagination
   * @param {string} [userId] Optional authenticated user ID for access control
   * @returns {Promise<PaginatedData<Media>>} Paginated list of media entries matching the query and access control
   */
  async listMedia(query: ListQuery, userId?: string): Promise<PaginatedData<Media>> {
    const pageSize = query.pageSize || 20;
    const sort = query.sort || 'createdAt';
    const order = query.order || 'desc';
    const filterWhere = this.buildWhereClause(query);
    const accessWhere = queryUtils.buildMediaAccessWhere(userId);
    const where = Object.keys(filterWhere).length > 0
      ? { AND: [filterWhere, accessWhere] }
      : accessWhere;

    // Use cursor-based pagination if cursor is provided
    if (query.cursor) {
      const data = await prisma.media.findMany({
        where,
        take: pageSize + 1, // Fetch one extra to check if there's a next page
        cursor: { id: query.cursor },
        skip: 1, // Skip the cursor itself
        orderBy: { [sort]: order },
      });

      const hasMore = data.length > pageSize;
      const items = hasMore ? data.slice(0, pageSize) : data;
      const lastItem = items.at(-1);
      const nextCursor = hasMore && lastItem ? lastItem.id : null;

      // For cursor-based pagination, we don't calculate total/pages as it's expensive
      const links = queryUtils.buildCursorPaginationLinks('/api/media', query, pageSize, nextCursor);

      return {
        data: items,
        page: 1, // Cursor pagination doesn't use page numbers
        pageSize,
        total: 0, // Not calculated for cursor pagination
        pages: 0, // Not calculated for cursor pagination
        links,
        cursor: nextCursor,
      };
    }

    // Fall back to offset-based pagination
    const page = query.page || 1;
    const skip = (page - 1) * pageSize;

    const [data, total] = await Promise.all([
      prisma.media.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { [sort]: order },
      }),
      prisma.media.count({ where }),
    ]);

    const pages = Math.ceil(total / pageSize);
    const lastItem = data.at(-1);
    const nextCursor = lastItem ? lastItem.id : null;
    const links = queryUtils.buildPaginationLinks('/api/media', query, page, pageSize, pages);

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
   * Build a Prisma where clause based on the provided query parameters
   * @param {MediaWhereClause} query Query parameters for filtering media entries
   * @returns {Prisma.MediaWhereInput} Prisma where clause for filtering media entries
   */
  buildWhereClause(query: MediaWhereClause): Prisma.MediaWhereInput {
    const where: Prisma.MediaWhereInput = {};

    if (query.type) {
      where.type = query.type as any;
    }

    const tagList = queryUtils.parseCommaSeparated(query.tags, query.tag);
    if (tagList.length > 0) {
      where.tags = { hasSome: tagList };
    }

    const platformList = queryUtils.parseCommaSeparated(query.platforms, query.platform);
    if (platformList.length > 0) {
      where.platforms = { hasSome: platformList };
    }

    if (query.q) {
      where.OR = [
        { title: { contains: query.q, mode: 'insensitive' } },
        { description: { contains: query.q, mode: 'insensitive' } },
      ];
    }

    return where;
  },



  /**
   * Get a media entry by ID
   * @param {string} id Media ID
   * @param {string} [userId] Optional authenticated user ID for access control
   * @returns {Promise<Media | null>} The media object if found, or null if not found
   */
  async getById(id: string, userId?: string): Promise<Media | null> {
    const accessWhere = queryUtils.buildMediaAccessWhere(userId);
    return await prisma.media.findFirst({
      where: {
        AND: [
          { id },
          accessWhere,
        ],
      },
    });
  },

  /**
   * Update a media entry by ID
   * @param {string} id Media ID
   * @param {Prisma.MediaUpdateInput} data Data to update the media entry with
   * @param {string} userId ID of the user performing the update
   * @returns {Promise<Media | null>} The updated media object if successful, or null if an error occurred
   */
  async updateById(id: string, data: Prisma.MediaUpdateInput, userId: string): Promise<Media | null> {
    try {
      await this.requireMediaRole(id, userId, [CollectionRole.OWNER, CollectionRole.COLLABORATOR]);
      const media = await prisma.media.update({ where: { id }, data });
      return media;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('Error updating media:', error);
      return null;
    }
  },

  /**
   * Delete a media entry by ID
   * @param {string} id Media ID
   * @param {string} userId ID of the user performing the deletion
   * @returns {Promise<boolean>} True if the media was successfully deleted, false otherwise
   */
  async deleteById(id: string, userId: string): Promise<boolean> {
    try {
      await this.requireMediaRole(id, userId, [CollectionRole.OWNER]);
      await prisma.media.delete({ where: { id } });
      return true;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('Error deleting media:', error);
      return false;
    }
  },

  /**
   * Resolve a collection for media creation, ensuring the user can write to it
   * @param {string} userId ID of the authenticated user creating the media
   * @param {string} [collectionId] Optional collection ID to add the media to
   * @returns {Promise<{ id: string }>} The collection ID to use for media creation
   * @throws AppError if the collection is not found or the user does not have permission to create media in it
   */
  async getCollectionForCreate(userId: string, collectionId?: string): Promise<{ id: string }> {
    if (collectionId) {
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
      const allowedCreateRoles = new Set<CollectionRole>([
        CollectionRole.OWNER,
        CollectionRole.COLLABORATOR,
      ]);
      const hasRole = collection.members.some((member) =>
        allowedCreateRoles.has(member.role)
      );

      if (!isOwner && !hasRole) {
        throw new AppError('Forbidden', 403);
      }

      return { id: collection.id };
    }

    return this.getOrCreateDefaultCollection(userId);
  },

  /**
   * Ensure every user has a default collection for personal media
   * @param {string} userId ID of the authenticated user
   * @returns {Promise<{ id: string }>} The default collection ID
   */
  async getOrCreateDefaultCollection(userId: string): Promise<{ id: string }> {
    const existing = await prisma.collection.findFirst({
      where: { ownerId: userId, name: 'Default' },
      select: { id: true },
    });

    if (existing) {
      return existing;
    }

    return prisma.collection.create({
      data: {
        name: 'Default',
        description: 'Default collection',
        tags: [],
        visibility: Visibility.PRIVATE,
        ownerId: userId,
      },
      select: { id: true },
    });
  },

  /**
   * Require a minimum role to update/delete a media entry
   * @param {string} mediaId Media ID
   * @param {string} userId ID of the authenticated user
   * @param {CollectionRole[]} allowedRoles Array of allowed roles for the operation
   * @returns {Promise<void>} Resolves if the user has the required role, otherwise throws an AppError
   * @throws AppError with status 403 if the user does not have permission, or 404 if the media is not found
   */
  async requireMediaRole(mediaId: string, userId: string, allowedRoles: CollectionRole[]): Promise<void> {
    const media = await prisma.media.findUnique({
      where: { id: mediaId },
      select: {
        id: true,
        collections: {
          select: {
            collection: {
              select: {
                ownerId: true,
                members: {
                  where: { userId },
                  select: { role: true },
                },
              },
            },
          },
        },
      },
    });

    if (!media) {
      throw new AppError('Media not found', 404);
    }

    const isOwner = media.collections.some((item) => item.collection.ownerId === userId);
    if (isOwner && allowedRoles.includes(CollectionRole.OWNER)) {
      return;
    }

    const roles = media.collections.flatMap((item) => item.collection.members.map((member) => member.role));
    const hasRole = roles.some((role) => allowedRoles.includes(role));

    if (!hasRole) {
      throw new AppError('Forbidden', 403);
    }
  },
};