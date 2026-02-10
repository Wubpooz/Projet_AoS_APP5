import prisma from "@/db";
import type { Prisma, Media } from "@/generated/prisma/browser";
import { AppError } from "@/middleware/errorHandler";
import type { ListQuery, MediaWhereClause, PaginatedData, PaginationLinks } from "@/types/types";

export const mediaService = {
  /**
   * Create a new media entry in the database
   * @param {Prisma.MediaCreateInput} data Data for the new media entry
   * @returns {Promise<Media>} The created media object
   * @throws AppError if media creation fails
   */
  async createMedia(data: Prisma.MediaCreateInput): Promise<Media> {
    try {
      const newMedia = await prisma.media.create({ data });
      return newMedia;
    } catch (error) {
      console.error('Error creating media:', error);
      throw new AppError('Failed to create media', 500);
    }
  },

  /**
   * List media entries with pagination and filters
   * @param {Object} query Query parameters for filtering and pagination
   * @param {number} query.page Page number for pagination
   * @param {number} query.pageSize Number of items per page
   * @param {string} query.type Filter by media type
   * @param {string} query.cursor Cursor for cursor-based pagination
   */
  async listMedia(query: ListQuery): Promise<PaginatedData<Media>> {
    const pageSize = query.pageSize || 20;
    const sort = query.sort || 'createdAt';
    const order = query.order || 'desc';
    const where = this.buildWhereClause(query);

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
      const links = this.buildCursorPaginationLinks(query, pageSize, nextCursor);

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
   * Build a Prisma where clause based on the provided query parameters
   * @param {MediaWhereClause} query Query parameters for filtering media entries
   * @returns {Prisma.MediaWhereInput} Prisma where clause for filtering media entries
   */
  buildWhereClause(query: MediaWhereClause): Prisma.MediaWhereInput {
    const where: Prisma.MediaWhereInput = {};

    if (query.type) {
      where.type = query.type as any;
    }

    const tagList = this.parseCommaSeparated(query.tags, query.tag);
    if (tagList.length > 0) {
      where.tags = { hasSome: tagList };
    }

    const platformList = this.parseCommaSeparated(query.platforms, query.platform);
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
   * Parse comma-separated strings into an array, or return a single value as an array
   * @param {string} commaSeparated A comma-separated string to parse
   * @param {string} single A single string value to return as an array if commaSeparated is not provided
   * @returns {string[]} An array of strings parsed from the input
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
   * Build pagination links for API responses based on the current query and pagination state
   * @param {ListQuery} query Query parameters for filtering and pagination
   * @param {number} page Current page number
   * @param {number} pageSize Number of items per page
   * @param {number} pages Total number of pages
   * @returns {PaginationLinks} An object containing self, next, and prev pagination links
   */
  buildPaginationLinks(query: ListQuery, page: number, pageSize: number, pages: number): PaginationLinks {
    const baseUrl = '/api/media';
    const queryParams = new URLSearchParams();
    
    if (query.type) queryParams.set('type', query.type);
    if (query.tag) queryParams.set('tag', query.tag);
    if (query.tags) queryParams.set('tags', query.tags);
    if (query.platform) queryParams.set('platform', query.platform);
    if (query.platforms) queryParams.set('platforms', query.platforms);
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
   * Build cursor-based pagination links for API responses
   * @param {ListQuery} query Query parameters for filtering and pagination
   * @param {number} pageSize Number of items per page
   * @param {string | null} nextCursor Cursor for the next page
   * @returns {PaginationLinks} An object containing self, next, and prev pagination links
   */
  buildCursorPaginationLinks(query: ListQuery, pageSize: number, nextCursor: string | null): PaginationLinks {
    const baseUrl = '/api/media';
    const queryParams = new URLSearchParams();
    
    if (query.type) queryParams.set('type', query.type);
    if (query.tag) queryParams.set('tag', query.tag);
    if (query.tags) queryParams.set('tags', query.tags);
    if (query.platform) queryParams.set('platform', query.platform);
    if (query.platforms) queryParams.set('platforms', query.platforms);
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
      prev: null, // Cursor-based pagination typically doesn't support prev
    };
  },

  /**
   * Get a media entry by ID
   * @param {string} id Media ID
   * @returns {Promise<Media | null>} The media object if found, or null if not found
   */
  async getById(id: string): Promise<Media | null> {
    return await prisma.media.findUnique({ where: { id } });
  },

  /**
   * Update a media entry by ID
   * @param {string} id Media ID
   * @param {Prisma.MediaUpdateInput} data Data to update the media entry with
   * @returns {Promise<Media | null>} The updated media object if successful, or null if an error occurred
   */
  async updateById(id: string, data: Prisma.MediaUpdateInput): Promise<Media | null> {
    try {
      const media = await prisma.media.update({ where: { id }, data });
      return media;
    } catch (error) {
      console.error('Error updating media:', error);
      return null;
    }
  },

  /**
   * Delete a media entry by ID
   * @param {string} id Media ID
   * @returns {Promise<boolean>} True if the media was successfully deleted, false otherwise
   */
  async deleteById(id: string): Promise<boolean> {
    try {
      await prisma.media.delete({ where: { id } });
      return true;
    } catch (error) {
      console.error('Error deleting media:', error);
      return false;
    }
  },
};