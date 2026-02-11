import prisma from "@/db";
import { CollectionRole, Visibility } from "@/generated/prisma/browser";
import type { Prisma, Collection, CollectionMedia, CollectionUser } from "@/generated/prisma/browser";
import { AppError } from "@/middleware/errorHandler";
import type { ListQuery, PaginatedData, PaginationLinks } from "@/types/types";

type CollectionWhereClause = Omit<ListQuery, 'page' | 'pageSize' | 'sort' | 'order' | 'cursor'>;

export const collectionService = {
  /**
   * Create a new collection
   * @param {Omit<Prisma.CollectionCreateInput, 'owner' | 'ownerId'>} data Collection creation data
   * @param {string} userId ID of the user creating the collection
   * @returns {Promise<Collection>} The created collection
   */
  async createCollection(data: Omit<Prisma.CollectionCreateInput, 'owner' | 'ownerId'>, userId: string): Promise<Collection> {
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
   * @param {ListQuery} query Query parameters for listing collections
   * @param {string} [userId] Optional user ID for access control
   * @returns {Promise<PaginatedData<Collection>>} Paginated list of collections
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
        orderBy: [{ [sort]: order }, { id: 'asc' }],
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
        orderBy: [{ [sort]: order }, { id: 'asc' }],
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
   * @param {CollectionWhereClause} query Query parameters containing tag, tags, and search text
   * @returns {Prisma.CollectionWhereInput} Where clause for Prisma query
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
   * @param {string} [userId] Optional user ID for permission checking
   * @returns {Prisma.CollectionWhereInput} Where clause that filters by visibility and user access
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
        { members: { some: { userId, accepted: true } } },
      ],
    };

    return { OR: [publicAccess, memberAccess] };
  },

  /**
   * Parse comma-separated strings into an array
   * @param {string} [commaSeparated] Comma-separated string to split into array
   * @param {string} [single] Single string value as fallback
   * @returns {string[]} Array of parsed strings
   */
  parseCommaSeparated(commaSeparated?: string, single?: string): string[] {
    if (commaSeparated) {
      return commaSeparated.split(',').map(s => s.trim()).filter(Boolean);
    }
    if (single) {
      return [single];
    }
    return [];
  },

  /**
   * Build pagination links for API responses
   * @param {ListQuery} query Query parameters
   * @param {number} page Current page number
   * @param {number} pageSize Number of items per page
   * @param {number} pages Total number of pages
   * @returns {PaginationLinks} Object containing self, next, and prev links
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
   * @param {ListQuery} query Query parameters
   * @param {number} pageSize Number of items to fetch
   * @param {string | null} nextCursor Cursor for next page
   * @returns {PaginationLinks} Object containing self and next links
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
   * Get a collection by ID with access control
   * @param {string} id Collection ID
   * @param {string} [userId] Optional user ID for permission checking
   * @returns {Promise<Collection | null>} The collection or null if not found or not authorized
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
   * Update a collection by ID (owner only)
   * @param {string} id Collection ID
   * @param {Prisma.CollectionUpdateInput} data Collection update data
   * @param {string} userId ID of the user performing the update
   * @returns {Promise<Collection | null>} Updated collection or null on error
   * @throws {AppError} If user is not the owner or collection not found
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
   * Delete a collection by ID (owner only)
   * @param {string} id Collection ID
   * @param {string} userId ID of the user performing the deletion
   * @returns {Promise<boolean>} True if deleted successfully, false on error
   * @throws {AppError} If user is not the owner or collection not found
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
   * Add media to a collection (owner/collaborator only)
   * @param {string} collectionId Collection ID
   * @param {string} mediaId Media ID to add
   * @param {number} position Position in collection
   * @param {string} userId ID of the user performing the action
   * @returns {Promise<CollectionMedia>} The created collection media entry
   * @throws {AppError} If media already in collection, media not found, or user unauthorized
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
   * List media in a collection with access control
   * @param {string} collectionId Collection ID
   * @param {string} [userId] Optional user ID for permission checking
   * @returns {Promise<CollectionMedia[]>} Array of media in collection
   * @throws {AppError} If collection not found or user unauthorized
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
   * Update collection media (owner/collaborator only)
   * @param {string} collectionId Collection ID
   * @param {string} collectionMediaId Collection media ID to update
   * @param {Prisma.CollectionMediaUpdateInput} data Media update data
   * @param {string} userId ID of the user performing the update
   * @returns {Promise<CollectionMedia | null>} Updated collection media or null on error
   * @throws {AppError} If collection media not found, belongs to different collection, or user unauthorized
   */
  async updateCollectionMedia(collectionId: string, collectionMediaId: string, data: Prisma.CollectionMediaUpdateInput, userId: string): Promise<CollectionMedia | null> {
    try {
      await this.requireCollectionRole(collectionId, userId, [CollectionRole.OWNER, CollectionRole.COLLABORATOR]);

      // Verify the collectionMedia belongs to this collection
      const existing = await prisma.collectionMedia.findUnique({
        where: { id: collectionMediaId },
        select: { collectionId: true },
      });

      if (!existing) {
        throw new AppError('Collection media not found', 404);
      }

      if (existing.collectionId !== collectionId) {
        throw new AppError('Collection media not found', 404);
      }

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
   * Remove media from collection (owner/collaborator only)
   * @param {string} collectionId Collection ID
   * @param {string} collectionMediaId Collection media ID to remove
   * @param {string} userId ID of the user performing the removal
   * @returns {Promise<boolean>} True if removed successfully, false on error
   * @throws {AppError} If collection media not found, belongs to different collection, or user unauthorized
   */
  async removeMediaFromCollection(collectionId: string, collectionMediaId: string, userId: string): Promise<boolean> {
    try {
      await this.requireCollectionRole(collectionId, userId, [CollectionRole.OWNER, CollectionRole.COLLABORATOR]);

      // Verify the collectionMedia belongs to this collection before deleting
      const existing = await prisma.collectionMedia.findUnique({
        where: { id: collectionMediaId },
        select: { collectionId: true },
      });

      if (!existing) {
        throw new AppError('Collection media not found', 404);
      }

      if (existing.collectionId !== collectionId) {
        throw new AppError('Collection media not found', 404);
      }

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
   * Add member to collection (owner only)
   * @param {string} collectionId Collection ID
   * @param {string} memberUserId User ID of member to invite
   * @param {CollectionRole} role Role to assign to the member
   * @param {string} userId ID of the owner performing the invitation
   * @returns {Promise<CollectionUser>} The created collection user invitation
   * @throws {AppError} If user already member, user not found, or user not owner
   */
  async addMemberToCollection(collectionId: string, memberUserId: string, role: CollectionRole, userId: string): Promise<CollectionUser> {
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
   * List collection members with access control
   * @param {string} collectionId Collection ID
   * @param {string} [userId] Optional user ID for permission checking
   * @returns {Promise<CollectionUser[]>} Array of collection members
   * @throws {AppError} If collection not found or user unauthorized
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
   * Update collection member (owner only)
   * @param {string} collectionId Collection ID
   * @param {string} memberId Collection member ID to update
   * @param {Prisma.CollectionUserUpdateInput} data Member update data
   * @param {string} userId ID of the owner performing the update
   * @returns {Promise<CollectionUser | null>} Updated collection member or null on error
   * @throws {AppError} If member not found, belongs to different collection, or user not owner
   */
  async updateCollectionMember(collectionId: string, memberId: string, data: Prisma.CollectionUserUpdateInput, userId: string): Promise<CollectionUser | null> {
    try {
      await this.requireCollectionRole(collectionId, userId, [CollectionRole.OWNER]);

      // Verify the member belongs to this collection
      const existing = await prisma.collectionUser.findUnique({
        where: { id: memberId },
        select: { collectionId: true },
      });

      if (!existing) {
        throw new AppError('Collection member not found', 404);
      }

      if (existing.collectionId !== collectionId) {
        throw new AppError('Collection member not found', 404);
      }

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
   * Remove member from collection (owner only)
   * @param {string} collectionId Collection ID
   * @param {string} memberId Collection member ID to remove
   * @param {string} userId ID of the owner performing the removal
   * @returns {Promise<boolean>} True if removed successfully, false on error
   * @throws {AppError} If member not found, belongs to different collection, or user not owner
   */
  async removeMemberFromCollection(collectionId: string, memberId: string, userId: string): Promise<boolean> {
    try {
      await this.requireCollectionRole(collectionId, userId, [CollectionRole.OWNER]);

      // Verify the member belongs to this collection before deleting
      const existing = await prisma.collectionUser.findUnique({
        where: { id: memberId },
        select: { collectionId: true },
      });

      if (!existing) {
        throw new AppError('Collection member not found', 404);
      }

      if (existing.collectionId !== collectionId) {
        throw new AppError('Collection member not found', 404);
      }

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
   * List pending invitations for a user
   * @param {string} userId User ID to get invitations for
   * @returns {Promise<CollectionUser[]>} Array of pending invitations
   * @throws {AppError} If unable to retrieve invitations
   */
  async listUserInvitations(userId: string): Promise<CollectionUser[]> {
    try {
      return await prisma.collectionUser.findMany({
        where: {
          userId,
          accepted: false,
        },
        include: {
          collection: true,
          user: true,
        },
        orderBy: {
          invitedAt: 'desc',
        },
      });
    } catch (error) {
      console.error('Error listing user invitations:', error);
      throw new AppError('Failed to list invitations', 500);
    }
  },

  /**
   * Accept or reject a collection invitation
   * @param {string} collectionId Collection ID
   * @param {string} userId User ID responding to invitation
   * @param {boolean} accept True to accept, false to reject
   * @returns {Promise<CollectionUser | null>} Updated member if accepted, null if rejected
   * @throws {AppError} If invitation not found or already accepted
   */
  async respondToInvitation(collectionId: string, userId: string, accept: boolean): Promise<CollectionUser | null> {
    try {
      // Find the invitation
      const invitation = await prisma.collectionUser.findUnique({
        where: {
          collectionId_userId: {
            collectionId,
            userId,
          },
        },
      });

      if (!invitation) {
        throw new AppError('Invitation not found', 404);
      }

      if (invitation.accepted) {
        throw new AppError('Invitation already accepted', 400);
      }

      if (accept) {
        // Accept the invitation
        const updatedMember = await prisma.collectionUser.update({
          where: {
            collectionId_userId: {
              collectionId,
              userId,
            },
          },
          data: {
            accepted: true,
          },
          include: {
            collection: true,
            user: true,
          },
        });
        return updatedMember;
      } else {
        // Reject the invitation by deleting the record
        await prisma.collectionUser.delete({
          where: {
            collectionId_userId: {
              collectionId,
              userId,
            },
          },
        });
        return null;
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('Error responding to invitation:', error);
      throw new AppError('Failed to respond to invitation', 500);
    }
  },

  /**
   * Require a minimum role to perform an action on a collection
   * @param {string} collectionId Collection ID to check permissions for
   * @param {string} userId User ID to check permissions
   * @param {CollectionRole[]} allowedRoles Array of roles that are allowed
   * @returns {Promise<void>}
   * @throws {AppError} If collection not found or user doesn't have required role
   */
  async requireCollectionRole(collectionId: string, userId: string, allowedRoles: CollectionRole[]): Promise<void> {
    const collection = await prisma.collection.findUnique({
      where: { id: collectionId },
      select: {
        id: true,
        ownerId: true,
        members: {
          where: { userId, accepted: true },
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
